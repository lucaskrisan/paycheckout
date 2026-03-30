import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, targetUserId?: string, url?: string, iconUrl?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    console.warn('[asaas-webhook] OneSignal not configured, skipping notification');
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
    console.log('[asaas-webhook] OneSignal response:', { status: response.status, body: raw });
  } catch (err) {
    console.error('[asaas-webhook] OneSignal error:', err);
  }
}

async function sendAccessEmail(supabase: any, customerId: string, course: { id: string; title: string }, accessToken: string) {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return;

    const { data: customer } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', customerId)
      .single();

    if (!customer) return;

    const siteUrl = 'https://app.panttera.com.br';
    const accessUrl = `${siteUrl}/membros?token=${accessToken}`;

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
              Olá <strong>${customer.name.split(' ')[0]}</strong>,
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
        from: 'PanteraPay <noreply@paolasemfiltro.com>',
        to: [customer.email],
        subject: `🎉 Acesso liberado — "${course.title}"`,
        html: emailHtml,
      }),
    });
    const emailData = await emailRes.json();

    // Log email
    try {
      await supabase.from('email_logs').insert({
        to_email: customer.email,
        to_name: customer.name,
        subject: `🎉 Acesso liberado — "${course.title}"`,
        html_body: emailHtml,
        email_type: 'payment_confirmed',
        status: emailRes.ok ? 'sent' : 'failed',
        resend_id: emailData?.id || null,
        customer_id: customerId,
        source: 'asaas-webhook',
      });
    } catch (logErr) {
      console.error('[asaas-webhook] Email log error:', logErr);
    }

    console.log('[asaas-webhook] Access email sent to', customer.email);
  } catch (err) {
    console.error('[asaas-webhook] Email error (non-blocking):', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // --- Webhook signature verification ---
    const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (ASAAS_WEBHOOK_TOKEN) {
      const receivedToken = req.headers.get('asaas-access-token');
      if (receivedToken !== ASAAS_WEBHOOK_TOKEN) {
        console.error('[asaas-webhook] Invalid webhook token');
        return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.warn('[asaas-webhook] ASAAS_WEBHOOK_TOKEN not set — skipping signature verification');
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const payment = payload.payment;

    console.log('[asaas-webhook] event:', event, 'payment:', payment?.id);

    if (!payment?.id) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- Idempotency: deduplicate webhook events ---
    const dedupKey = `asaas_${payment.id}_${event}`;
    const { data: inserted, error: dedupErr } = await supabase
      .from('webhook_events')
      .upsert({ id: dedupKey, gateway: 'asaas' }, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle();

    if (!inserted && !dedupErr) {
      console.log('[asaas-webhook] Duplicate event, skipping:', dedupKey);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let status = 'pending';
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      status = 'paid';
    } else if (event === 'PAYMENT_OVERDUE') {
      status = 'overdue';
    } else if (event === 'PAYMENT_REFUNDED') {
      status = 'refunded';
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_RESTORED') {
      status = event === 'PAYMENT_DELETED' ? 'cancelled' : 'pending';
    }

    // --- Status transition guard: prevent downgrading from terminal states ---
    const statusPriority: Record<string, number> = {
      pending: 1, overdue: 2, paid: 3, refunded: 4, cancelled: 4,
    };

    // Update order by external_id with status guard
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', payment.id)
      .not('status', 'in', `(${['paid', 'refunded'].filter(s => statusPriority[s] >= statusPriority[status]).join(',')})`)
      .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
      .maybeSingle();

    if (error) {
      console.error('[asaas-webhook] Error updating order:', error);
    }

    // Fire user webhooks (non-blocking) — dispatch BOTH modern and legacy event names
    if (orderData?.id && orderData?.user_id) {
      const eventPairs: string[][] = [];
      if (status === 'paid') eventPairs.push(['payment.approved', 'order.paid']);
      else if (status === 'refunded') eventPairs.push(['payment.refunded', 'order.refunded']);
      else if (status === 'cancelled') eventPairs.push(['payment.failed', 'order.cancelled']);

      // Detect subscription events
      if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        // Check if this is a subscription product
        if (orderData.product_id) {
          const { data: subProduct } = await supabase
            .from('products')
            .select('is_subscription')
            .eq('id', orderData.product_id)
            .maybeSingle();
          if (subProduct?.is_subscription) {
            eventPairs.push(['subscription.created']);
          }
        }
      }

      for (const events of eventPairs) {
        for (const evt of events) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ event: evt, order_id: orderData.id, user_id: orderData.user_id }),
          }).catch(err => console.error('[asaas-webhook] fire-webhooks error:', err));
        }
      }
    }

    // On confirmed payment, handle CAPI fallback + member access
    if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && orderData?.product_id && orderData?.customer_id) {

      // --- CAPI Purchase fallback ---
      // If browser tracking failed (adblock, user navigated away), fire CAPI as safety net.
      // Uses payment.id as event_id — same ID the checkout used — so Meta deduplicates correctly.
      try {
        const { data: purchaseWithPaymentId } = await supabase
          .from('pixel_events')
          .select('id')
          .eq('product_id', orderData.product_id)
          .eq('event_name', 'Purchase')
          .eq('source', 'server')
          .eq('event_id', payment.id)
          .limit(1);

        const alreadyFired = (purchaseWithPaymentId && purchaseWithPaymentId.length > 0);

        if (!alreadyFired) {
          console.log('[asaas-webhook] Purchase NOT fired by checkout, sending CAPI fallback');

          const { data: custData } = await supabase
            .from('customers')
            .select('name, email, phone, cpf')
            .eq('id', orderData.customer_id)
            .single();

          if (custData) {
            const checkoutUrl = (orderData.metadata as any)?.checkout_url || `https://app.panttera.com.br/checkout/${orderData.product_id}`;

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
                  event_id: payment.id,
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
            console.log('[asaas-webhook] CAPI fallback result:', JSON.stringify(capiResult));
          }
        } else {
          console.log('[asaas-webhook] Purchase already fired by checkout, skipping CAPI');
        }
      } catch (capiErr) {
        console.error('[asaas-webhook] CAPI fallback error (non-blocking):', capiErr);
      }

      // --- Member access (main product + bump products) ---
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
          const { data: product } = await supabase
            .from('products')
            .select('is_subscription, billing_cycle')
            .eq('id', course.product_id)
            .maybeSingle();

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

            if (existingAccess) {
              await supabase
                .from('member_access')
                .update({ expires_at: expiresAt.toISOString() })
                .eq('id', existingAccess.id);
              console.log('[asaas-webhook] Extended member access:', existingAccess.id);
            } else {
              const { data: newAccess } = await supabase
                .from('member_access')
                .insert({ customer_id: orderData.customer_id, course_id: course.id, expires_at: expiresAt.toISOString() })
                .select('access_token')
                .single();
              console.log('[asaas-webhook] Created subscription member access for course:', course.id);
              if (newAccess) {
                await sendAccessEmail(supabase, orderData.customer_id, course, newAccess.access_token);
              }
            }
          } else if (!existingAccess) {
            const { data: newAccess, error: accessErr } = await supabase
              .from('member_access')
              .insert({ customer_id: orderData.customer_id, course_id: course.id })
              .select('access_token')
              .single();

            if (accessErr) {
              console.error('[asaas-webhook] Error creating member access for course:', course.id, accessErr);
            } else {
              console.log('[asaas-webhook] Created member access for course:', course.id, course.title);
              if (newAccess) {
                await sendAccessEmail(supabase, orderData.customer_id, course, newAccess.access_token);
              }
            }
          }
        }
      }
    }

    // --- Billing low balance notification ---
    if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && orderData?.user_id) {
      try {
        const { data: billingAcc } = await supabase
          .from('billing_accounts')
          .select('balance, blocked')
          .eq('user_id', orderData.user_id)
          .maybeSingle();
        if (billingAcc && (billingAcc.blocked || Number(billingAcc.balance) < 20)) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/billing-notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              user_id: orderData.user_id,
              balance: billingAcc.balance,
              is_blocked: billingAcc.blocked,
            }),
          }).catch(err => console.error('[asaas-webhook] billing-notify error:', err));
        }
      } catch (notifyErr) {
        console.error('[asaas-webhook] billing notify check error (non-blocking):', notifyErr);
      }
    }

    // Send push notification on confirmed sale
    if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && orderData) {
      try {
        const ownerId = orderData.user_id;
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('send_approved, show_product_name')
          .eq('user_id', ownerId || '')
          .eq('send_approved', true)
          .maybeSingle();

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
        console.error('[asaas-webhook] Notification error (non-blocking):', notifErr);
      }
    }

    // --- Billing recharge confirmation ---
    // Fires when a producer pays their recharge PIX
    // externalReference starts with 'recharge_' to distinguish from product sales
    if (
      (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') &&
      typeof payment.externalReference === 'string' &&
      payment.externalReference.startsWith('recharge_')
    ) {
      try {
        // Use atomic update: only credit if status transitions from 'pending' to 'confirmed'
        // This prevents double-credit when billing-recharge already credited on instant confirmation
        const { data: recharge } = await supabase
          .from('billing_recharges')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('external_id', payment.id)
          .eq('status', 'pending')  // Only matches if still pending (not already confirmed)
          .select('id, user_id, amount')
          .maybeSingle();

        if (recharge) {
          // Only add credit if we actually transitioned the status (was still pending)
          await supabase.rpc('add_billing_credit', {
            p_user_id: recharge.user_id,
            p_amount: recharge.amount,
            p_description: `Recarga confirmada — R$${Number(recharge.amount).toFixed(2).replace('.', ',')}`,
          });
          console.log(`[asaas-webhook] Recharge confirmed: R$${recharge.amount} for user ${recharge.user_id}`);
        } else {
          console.log('[asaas-webhook] Recharge already confirmed or not found, skipping credit');
        }
      } catch (rechargeErr) {
        console.error('[asaas-webhook] Recharge error (non-blocking):', rechargeErr);
      }
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[asaas-webhook] Webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});