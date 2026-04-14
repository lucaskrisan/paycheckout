import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPurchaseConfirmationEmail } from '../_shared/send-purchase-confirmation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, targetUserId?: string, url?: string, iconUrl?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    console.warn('[pagarme-webhook] OneSignal not configured, skipping notification');
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      app_id: appId,
      target_channel: 'push',
      headings: { en: title },
      contents: { en: message },
      chrome_web_icon: iconUrl || 'https://app.panttera.com.br/pwa-192x192.png',
    };
    if (targetUserId) {
      payload.filters = [{ field: 'tag', key: 'user_id', relation: '=', value: targetUserId }];
    } else {
      payload.included_segments = ['Total Subscriptions'];
    }
    if (url) payload.url = url;

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    console.log('[pagarme-webhook] OneSignal response:', { status: response.status, body: raw });
  } catch (err) {
    console.error('[pagarme-webhook] OneSignal error:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // --- Webhook signature verification (HMAC-SHA1) ---
    const PAGARME_WEBHOOK_SECRET = Deno.env.get('PAGARME_WEBHOOK_SECRET');
    if (PAGARME_WEBHOOK_SECRET) {
      const receivedSig = req.headers.get('x-hub-signature');
      if (receivedSig) {
        const expectedPrefix = 'sha1=';
        const sigHex = receivedSig.startsWith(expectedPrefix) ? receivedSig.slice(expectedPrefix.length) : receivedSig;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(PAGARME_WEBHOOK_SECRET),
          { name: 'HMAC', hash: 'SHA-1' },
          false,
          ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
        const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

        if (computed !== sigHex) {
          console.error('[pagarme-webhook] Invalid webhook signature');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      console.warn('[pagarme-webhook] PAGARME_WEBHOOK_SECRET not set — skipping signature verification');
    }

    const payload = JSON.parse(rawBody);
    console.log('[pagarme-webhook] received event type:', payload.type);

    const eventType = payload.type;
    const order = payload.data;

    if (!order?.id) {
      console.log('[pagarme-webhook] No order id in payload, skipping');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- Idempotency: deduplicate webhook events ---
    const dedupKey = `pagarme_${order.id}_${eventType}`;
    const { data: inserted } = await supabase
      .from('webhook_events')
      .upsert({ id: dedupKey, gateway: 'pagarme' }, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle();

    if (!inserted) {
      console.log('[pagarme-webhook] Duplicate event, skipping:', dedupKey);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let status = 'pending';
    if (eventType === 'order.paid') {
      status = 'paid';
    } else if (eventType === 'order.payment_failed') {
      status = 'failed';
    } else if (eventType === 'order.canceled') {
      status = 'cancelled';
    } else if (eventType === 'charge.paid') {
      status = 'paid';
    } else if (eventType === 'charge.refunded') {
      status = 'refunded';
    }

    // --- Status transition guard ---
    const externalId = order.id;
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', externalId)
      .not('status', 'in', `(${['paid', 'refunded'].filter(s => {
        const p: Record<string, number> = { pending: 1, failed: 2, paid: 3, refunded: 4, cancelled: 4 };
        return (p[s] || 0) >= (p[status] || 0);
      }).join(',')})`)
      .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
      .maybeSingle();

    if (error) {
      console.error('[pagarme-webhook] Error updating order:', error);
    }

    console.log('[pagarme-webhook] Order updated:', { externalId, status, found: !!orderData });

    // Fire user webhooks (non-blocking) — dispatch BOTH modern and legacy event names
    if (orderData?.id && orderData?.user_id) {
      const eventPairs: string[][] = [];
      if (status === 'paid') eventPairs.push(['payment.approved', 'order.paid']);
      else if (status === 'refunded') eventPairs.push(['payment.refunded', 'order.refunded']);
      else if (status === 'cancelled') eventPairs.push(['payment.failed', 'order.cancelled']);
      else if (status === 'failed') eventPairs.push(['payment.failed']);

      for (const events of eventPairs) {
        for (const evt of events) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ event: evt, order_id: orderData.id, user_id: orderData.user_id }),
          }).catch(err => console.error('[pagarme-webhook] fire-webhooks error:', err));
        }
      }
    }

    // On confirmed payment, send purchase confirmation + create member access + CAPI fallback
    if (status === 'paid' && orderData?.product_id && orderData?.customer_id) {

      // --- Send purchase confirmation email to customer ---
      await sendPurchaseConfirmationEmail({
        supabase,
        orderId: orderData.id,
        customerId: orderData.customer_id,
        productId: orderData.product_id,
        userId: orderData.user_id,
        amount: orderData.amount,
        paymentMethod: orderData.payment_method,
        currency: 'BRL',
        source: 'pagarme-webhook',
      });

      // --- CAPI Purchase fallback ---
      // If user closed the checkout before polling detected the payment,
      // no Purchase event was fired. Check pixel_events and fire if missing.
      try {
        const { data: existingPurchase } = await supabase
          .from('pixel_events')
          .select('id')
          .eq('product_id', orderData.product_id)
          .eq('event_name', 'Purchase')
          .eq('source', 'server')
          .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // last hour
          .limit(10);

        // Check if any Purchase event matches this order
        const orderIdStr = orderData.id;
        const { data: purchaseWithOrderId } = await supabase
          .from('pixel_events')
          .select('id')
          .eq('product_id', orderData.product_id)
          .eq('event_name', 'Purchase')
          .eq('event_id', externalId)
          .limit(1);

        const alreadyFired = (purchaseWithOrderId && purchaseWithOrderId.length > 0);

        if (!alreadyFired) {
          console.log('[pagarme-webhook] Purchase NOT fired by checkout, sending CAPI fallback');

          // Get customer data for CAPI
          const { data: custData } = await supabase
            .from('customers')
            .select('name, email, phone, cpf')
            .eq('id', orderData.customer_id)
            .single();

          if (custData) {
            const capiEventId = externalId;
            const checkoutUrl = (orderData.metadata as any)?.checkout_url || `https://app.panttera.com.br/checkout/${orderData.product_id}`;

            // Fire CAPI via our own edge function
            const capiResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-capi`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  product_id: orderData.product_id,
                  event_name: 'Purchase',
                  event_id: capiEventId,
                  event_source_url: checkoutUrl,
                  customer: {
                    name: custData.name,
                    email: custData.email,
                    phone: custData.phone,
                    cpf: custData.cpf,
                  },
                  custom_data: {
                    value: Number(orderData.amount),
                    currency: 'BRL',
                    content_type: 'product',
                    order_id: orderData.id,
                  },
                  log_browser: true,
                }),
              }
            );
            const capiResult = await capiResponse.json();
            console.log('[pagarme-webhook] CAPI fallback result:', JSON.stringify(capiResult));
          }
        } else {
          console.log('[pagarme-webhook] Purchase already fired by checkout, skipping CAPI');
        }
      } catch (capiErr) {
        console.error('[pagarme-webhook] CAPI fallback error (non-blocking):', capiErr);
      }

      // --- Mark abandoned carts as recovered ---
      try {
        const { data: recoverCust } = await supabase
          .from('customers')
          .select('email')
          .eq('id', orderData.customer_id)
          .maybeSingle();

        if (recoverCust?.email) {
          const { count: recoveredCount } = await supabase
            .from('abandoned_carts')
            .update({ recovered: true })
            .eq('product_id', orderData.product_id)
            .eq('customer_email', recoverCust.email)
            .eq('recovered', false);

          // Fire cart.recovered webhook if any carts were recovered
          if (recoveredCount && recoveredCount > 0) {
            try {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  event: 'cart.recovered',
                  order_id: orderData.id,
                  user_id: orderData.user_id,
                }),
              });
            } catch (whErr) {
              console.error('[pagarme-webhook] cart.recovered webhook error (non-blocking):', whErr);
            }
          }
        }
      } catch (recoverErr) {
        console.error('[pagarme-webhook] Cart recovery mark error (non-blocking):', recoverErr);
      }


      // --- Member access (main product + bump products) ---
      // Only create member access if product delivery_method is 'panttera'
      try {
        const { data: mainProd } = await supabase
          .from('products')
          .select('delivery_method')
          .eq('id', orderData.product_id)
          .maybeSingle();

        const deliveryMethod = mainProd?.delivery_method || 'appsell';

        if (deliveryMethod !== 'panttera') {
          console.log('[pagarme-webhook] Skipping member access — delivery_method is', deliveryMethod);
        } else {
        // Collect all product IDs that need access: main + bumps
        const productIdsForAccess = [orderData.product_id];
        const bumpIds = (orderData.metadata as any)?.bump_product_ids;
        if (Array.isArray(bumpIds)) {
          productIdsForAccess.push(...bumpIds);
        }

        // Find all courses linked to these products
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title, product_id')
          .in('product_id', productIdsForAccess);

        if (courses && courses.length > 0) {
          for (const course of courses) {
            // Check if this is a subscription product
            const { data: product } = await supabase
              .from('products')
              .select('is_subscription, billing_cycle')
              .eq('id', course.product_id)
              .maybeSingle();

            // Check if access already exists
            const { data: existingAccess } = await supabase
              .from('member_access')
              .select('id')
              .eq('customer_id', orderData.customer_id)
              .eq('course_id', course.id)
              .maybeSingle();

            if (product?.is_subscription) {
              const cycleDays: Record<string, number> = {
                weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, semiannually: 180, yearly: 365,
              };
              const days = cycleDays[product.billing_cycle] || 30;
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + days + 3);

              // Atomic upsert with unique constraint
              const { data: upsertedAccess, error: accessErr } = await supabase
                .from('member_access')
                .upsert(
                  {
                    customer_id: orderData.customer_id,
                    course_id: course.id,
                    order_id: orderData.id,
                    expires_at: expiresAt.toISOString(),
                  },
                  { onConflict: 'customer_id,course_id' }
                )
                .select('access_token')
                .single();

              if (accessErr) {
                console.error('[pagarme-webhook] Error upserting subscription access:', course.id, accessErr);
              } else {
                console.log('[pagarme-webhook] Upserted subscription access for course:', course.id);
                if (upsertedAccess?.access_token && !existingAccess) {
                    try {
                      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
                      if (RESEND_API_KEY) {
                        const { data: customerData } = await supabase
                          .from('customers')
                          .select('name, email')
                          .eq('id', orderData.customer_id)
                          .single();

                        if (customerData) {
                          const siteUrl = 'https://app.panttera.com.br';
                          const accessUrl = `${siteUrl}/membros?token=${upsertedAccess.access_token}`;

                          const emailHtml = `
                            <!DOCTYPE html>
                            <html>
                            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                            <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                              <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                                <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 40px;text-align:center;">
                                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🎉 Pagamento confirmado!</h1>
                                </div>
                                <div style="padding:32px 40px;">
                                  <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
                                    Olá <strong>${customerData.name.split(' ')[0]}</strong>,
                                  </p>
                                  <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
                                    Seu pagamento foi confirmado e seu acesso ao curso <strong>"${course.title}"</strong> está liberado! 🚀
                                  </p>
                                  <div style="text-align:center;margin:32px 0;">
                                    <a href="${accessUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(34,197,94,0.4);">
                                      Acessar Curso
                                    </a>
                                  </div>
                                  <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;">
                                    Ou copie e cole este link:<br>
                                    <a href="${accessUrl}" style="color:#22c55e;word-break:break-all;">${accessUrl}</a>
                                  </p>
                                </div>
                                <div style="background:#f9fafb;padding:20px 40px;text-align:center;">
                                  <p style="color:#9ca3af;font-size:12px;margin:0;">Guarde este email — ele contém seu link de acesso.</p>
                                </div>
                              </div>
                            </body>
                            </html>
                          `;

                          const emailRes = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${RESEND_API_KEY}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              from: 'PanteraPay <noreply@app.panttera.com.br>',
                              to: [customerData.email],
                              subject: `🎉 Acesso liberado — "${course.title}"`,
                              html: emailHtml,
                            }),
                          });
                          const emailData = await emailRes.json();

                          try {
                            await supabase.from('email_logs').insert({
                              user_id: orderData.user_id,
                              to_email: customerData.email,
                              to_name: customerData.name,
                              subject: `🎉 Acesso liberado — "${course.title}"`,
                              html_body: emailHtml,
                              email_type: 'payment_confirmed',
                              status: emailRes.ok ? 'sent' : 'failed',
                              resend_id: emailData?.id || null,
                              customer_id: orderData.customer_id,
                              product_id: course.product_id,
                              source: 'pagarme-webhook',
                            });
                          } catch (logErr) {
                            console.error('[pagarme-webhook] Email log error:', logErr);
                          }
                          console.log('[pagarme-webhook] Access email sent to', customerData.email);
                        }
                      }
                    } catch (emailErr) {
                      console.error('[pagarme-webhook] Email error (non-blocking):', emailErr);
                    }
                }
              }
            } else if (!existingAccess) {
              // Atomic upsert for one-time purchase
              const { data: newAccess, error: accessErr } = await supabase
                .from('member_access')
                .upsert(
                  { customer_id: orderData.customer_id, course_id: course.id, order_id: orderData.id },
                  { onConflict: 'customer_id,course_id', ignoreDuplicates: true }
                )
                .select('access_token')
                .single();

              if (accessErr) {
                console.error('[pagarme-webhook] Error creating member access for course:', course.id, accessErr);
              } else {
                console.log('[pagarme-webhook] Member access created for course:', course.id, course.title);

                // Send access email
                try {
                  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
                  if (RESEND_API_KEY && newAccess?.access_token) {
                    const { data: customerData } = await supabase
                      .from('customers')
                      .select('name, email')
                      .eq('id', orderData.customer_id)
                      .single();

                    if (customerData) {
                      const siteUrl = 'https://app.panttera.com.br';
                      const accessUrl = `${siteUrl}/membros?token=${newAccess.access_token}`;

                      const emailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                        <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                            <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 40px;text-align:center;">
                              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🎉 Pagamento confirmado!</h1>
                            </div>
                            <div style="padding:32px 40px;">
                              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
                                Olá <strong>${customerData.name.split(' ')[0]}</strong>,
                              </p>
                              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
                                Seu pagamento foi confirmado e seu acesso ao curso <strong>"${course.title}"</strong> está liberado! 🚀
                              </p>
                              <div style="text-align:center;margin:32px 0;">
                                <a href="${accessUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(34,197,94,0.4);">
                                  Acessar Curso
                                </a>
                              </div>
                              <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;">
                                Ou copie e cole este link:<br>
                                <a href="${accessUrl}" style="color:#22c55e;word-break:break-all;">${accessUrl}</a>
                              </p>
                            </div>
                            <div style="background:#f9fafb;padding:20px 40px;text-align:center;">
                              <p style="color:#9ca3af;font-size:12px;margin:0;">Guarde este email — ele contém seu link de acesso.</p>
                            </div>
                          </div>
                        </body>
                        </html>
                      `;

                      const emailRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${RESEND_API_KEY}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          from: 'PanteraPay <noreply@app.panttera.com.br>',
                          to: [customerData.email],
                          subject: `🎉 Acesso liberado — "${course.title}"`,
                          html: emailHtml,
                        }),
                      });
                      const emailData = await emailRes.json();

                      try {
                        await supabase.from('email_logs').insert({
                          user_id: orderData.user_id,
                          to_email: customerData.email,
                          to_name: customerData.name,
                          subject: `🎉 Acesso liberado — "${course.title}"`,
                          html_body: emailHtml,
                          email_type: 'payment_confirmed',
                          status: emailRes.ok ? 'sent' : 'failed',
                          resend_id: emailData?.id || null,
                          customer_id: orderData.customer_id,
                          product_id: course.product_id,
                          source: 'pagarme-webhook',
                        });
                      } catch (logErr) {
                        console.error('[pagarme-webhook] Email log error:', logErr);
                      }

                      console.log('[pagarme-webhook] Access email sent to', customerData.email, 'for course:', course.title);
                    }
                  }
                } catch (emailErr) {
                  console.error('[pagarme-webhook] Email error (non-blocking):', emailErr);
                }
              }
            } else {
              console.log('[pagarme-webhook] Member access already exists for course:', course.id);
            }
          }
        }
      } // end else (panttera delivery)
      } catch (memberErr) {
        console.error('[pagarme-webhook] Member access error (non-blocking):', memberErr);
      }
    }

    // Send push notification on confirmed PIX sale
    if (status === 'paid' && orderData) {
      try {
        const ownerId = orderData.user_id;
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('send_approved, show_product_name')
          .eq('user_id', ownerId || '')
          .eq('send_approved', true)
          .maybeSingle();

        console.log('[pagarme-webhook] notifSettings for owner:', ownerId, notifSettings ? 'found' : 'none');

        if (notifSettings) {
          const amount = Number(orderData.amount).toFixed(2).replace('.', ',');
          const method = orderData.payment_method === 'pix' ? '💠 PIX' : '💳 Cartão';

          let productName = 'Produto';
          let customerName = '';

          if (orderData.product_id) {
            const { data: prod } = await supabase
              .from('products')
              .select('name')
              .eq('id', orderData.product_id)
              .maybeSingle();
            if (prod) productName = prod.name;
          }

          if (orderData.customer_id) {
            const { data: cust } = await supabase
              .from('customers')
              .select('name')
              .eq('id', orderData.customer_id)
              .maybeSingle();
            if (cust) customerName = cust.name;
          }

          const title = '💰 Nova venda confirmada!';
          const message = `${customerName || 'Cliente'} • ${method} R$ ${amount}${notifSettings.show_product_name ? ` • ${productName}` : ''}`;

          await sendPushNotification(title, message, ownerId || undefined, 'https://app.panttera.com.br/admin/orders');
        }
      } catch (notifErr) {
        console.error('[pagarme-webhook] Notification error (non-blocking):', notifErr);
      }
    }

    // --- WhatsApp dispatch (non-blocking) ---
    if (status === 'paid' && orderData?.user_id && orderData?.customer_id) {
      try {
        const { data: custWa } = await supabase.from('customers').select('name, phone').eq('id', orderData.customer_id).maybeSingle();
        const { data: prodWa } = await supabase.from('products').select('name, price').eq('id', orderData.product_id || '').maybeSingle();
        if (custWa?.phone) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: JSON.stringify({
              tenant_id: orderData.user_id,
              order_id: orderData.id,
              customer_phone: custWa.phone,
              customer_name: custWa.name,
              product_name: prodWa?.name || '',
              product_price: String(orderData.amount),
              category: 'confirmacao',
            }),
          }).catch(e => console.error('[pagarme-webhook] whatsapp-dispatch error:', e));
        }
      } catch (waErr) {
        console.error('[pagarme-webhook] WhatsApp dispatch error (non-blocking):', waErr);
      }
    }

    // --- Billing recharge confirmation (Pagar.me PIX) ---
    if ((eventType === 'order.paid' || eventType === 'charge.paid') && status === 'paid') {
      try {
        // Atomic: only credit if status transitions from pending to confirmed
        const { data: recharge } = await supabase
          .from('billing_recharges')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('external_id', externalId)
          .eq('status', 'pending')
          .select('id, user_id, amount')
          .maybeSingle();
        if (recharge) {
          await supabase.rpc('add_billing_credit', {
            p_user_id: recharge.user_id,
            p_amount: recharge.amount,
            p_description: `Recarga via PIX (Pagar.me) — R$${Number(recharge.amount).toFixed(2).replace('.', ',')}`,
          });
          console.log(`[pagarme-webhook] Recharge confirmed: R$${recharge.amount} for user ${recharge.user_id}`);
        } else {
          console.log('[pagarme-webhook] Recharge already confirmed or not found, skipping credit');
        }
      } catch (rechargeErr) {
        console.error('[pagarme-webhook] Recharge error (non-blocking):', rechargeErr);
      }
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pagarme-webhook] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
