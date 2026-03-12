import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, url?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    console.warn('[pagarme-webhook] OneSignal not configured, skipping notification');
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      app_id: appId,
      included_segments: ['Total Subscriptions'],
      target_channel: 'push',
      headings: { en: title },
      contents: { en: message },
      chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
    };
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
    const payload = await req.json();
    console.log('[pagarme-webhook] received event type:', payload.type);

    // Pagar.me v5 webhook format: { id, type, data: { id, status, charges, ... } }
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

    // Try to match by Pagar.me order id stored as external_id
    const externalId = order.id;
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', externalId)
      .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
      .maybeSingle();

    if (error) {
      console.error('[pagarme-webhook] Error updating order:', error);
    }

    console.log('[pagarme-webhook] Order updated:', { externalId, status, found: !!orderData });

    // Fire user webhooks (non-blocking)
    if (orderData?.id && orderData?.user_id) {
      const webhookEvent = status === 'paid' ? 'order.paid' : status === 'refunded' ? 'order.refunded' : status === 'cancelled' ? 'order.cancelled' : null;
      if (webhookEvent) {
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ event: webhookEvent, order_id: orderData.id, user_id: orderData.user_id }),
        }).catch(err => console.error('[pagarme-webhook] fire-webhooks error:', err));
      }
    }

    // On confirmed payment, create member access + send email + fire CAPI Purchase
    if (status === 'paid' && orderData?.product_id && orderData?.customer_id) {
      // --- CAPI Purchase (server-side, deduped by order external_id) ---
      try {
        const { data: pixels } = await supabase
          .from('product_pixels')
          .select('pixel_id, capi_token')
          .eq('product_id', orderData.product_id)
          .eq('platform', 'facebook')
          .not('capi_token', 'is', null);

        if (pixels && pixels.length > 0) {
          // Get customer info for hashing
          const { data: custData } = await supabase
            .from('customers')
            .select('name, email, phone, cpf')
            .eq('id', orderData.customer_id)
            .maybeSingle();

          const hashSHA256 = async (v: string) => {
            const data = new TextEncoder().encode(v.trim().toLowerCase());
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
          };

          const userData: Record<string, any> = {};
          if (custData?.email) userData.em = [await hashSHA256(custData.email)];
          if (custData?.phone) {
            const ph = custData.phone.replace(/\D/g, '');
            userData.ph = [await hashSHA256(ph.startsWith('55') ? ph : `55${ph}`)];
          }
          if (custData?.name) {
            const parts = custData.name.trim().toLowerCase().split(' ');
            userData.fn = [await hashSHA256(parts[0])];
            if (parts.length > 1) userData.ln = [await hashSHA256(parts.slice(1).join(' '))];
          }
          if (custData?.cpf) userData.external_id = [await hashSHA256(custData.cpf.replace(/\D/g, ''))];

          const orderMetadata = (orderData as any)?.metadata || {};
          const capiEvent = {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: externalId,
            event_source_url: orderMetadata.checkout_url || '',
            action_source: 'website',
            user_data: userData,
            custom_data: {
              value: Number(orderData.amount),
              currency: 'BRL',
              content_type: 'product',
              content_ids: [orderData.product_id],
            },
          };

          for (const pixel of pixels) {
            if (!pixel.capi_token) continue;
            try {
              const resp = await fetch(`https://graph.facebook.com/v21.0/${pixel.pixel_id}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [capiEvent], access_token: pixel.capi_token }),
              });
              const respData = await resp.json();
              console.log(`[pagarme-webhook] CAPI Purchase pixel ${pixel.pixel_id}:`, JSON.stringify(respData));
            } catch (capiErr) {
              console.error(`[pagarme-webhook] CAPI error pixel ${pixel.pixel_id}:`, capiErr);
            }
          }
        }
      } catch (capiErr) {
        console.error('[pagarme-webhook] CAPI Purchase error (non-blocking):', capiErr);
      }

      // --- Member access ---
      try {
        // Find course linked to this product
        const { data: course } = await supabase
          .from('courses')
          .select('id, title')
          .eq('product_id', orderData.product_id)
          .maybeSingle();

        if (course) {
          // Check if access already exists
          const { data: existingAccess } = await supabase
            .from('member_access')
            .select('id')
            .eq('customer_id', orderData.customer_id)
            .eq('course_id', course.id)
            .maybeSingle();

          if (!existingAccess) {
            // Create member access
            const { data: newAccess, error: accessErr } = await supabase
              .from('member_access')
              .insert({
                customer_id: orderData.customer_id,
                course_id: course.id,
              })
              .select('access_token')
              .single();

            if (accessErr) {
              console.error('[pagarme-webhook] Error creating member access:', accessErr);
            } else {
              console.log('[pagarme-webhook] Member access created for course:', course.id);

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
                    const siteUrl = 'https://paycheckout.lovable.app';
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
                              Ou copie e cole este link no seu navegador:<br>
                              <a href="${accessUrl}" style="color:#22c55e;word-break:break-all;">${accessUrl}</a>
                            </p>
                          </div>
                          <div style="background:#f9fafb;padding:20px 40px;text-align:center;">
                            <p style="color:#9ca3af;font-size:12px;margin:0;">
                              Guarde este email — ele contém seu link de acesso ao curso.
                            </p>
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
                        from: 'PayCheckout <noreply@paolasemfiltro.com>',
                        to: [customerData.email],
                        subject: `🎉 Acesso liberado — "${course.title}"`,
                        html: emailHtml,
                      }),
                    });
                    const emailData = await emailRes.json();

                    // Log email
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
                        product_id: orderData.product_id,
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
          } else {
            console.log('[pagarme-webhook] Member access already exists for course:', course.id);
          }
        }
      } catch (memberErr) {
        console.error('[pagarme-webhook] Member access error (non-blocking):', memberErr);
      }
    }

    // Send push notification on confirmed PIX sale
    if (status === 'paid' && orderData) {
      try {
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('send_approved, show_product_name')
          .eq('send_approved', true);

        console.log('[pagarme-webhook] send_approved users:', notifSettings?.length || 0);

        if (notifSettings && notifSettings.length > 0) {
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

          const showProductName = notifSettings.some((s) => s.show_product_name);
          const title = '💰 Nova venda confirmada!';
          const message = `${customerName || 'Cliente'} • ${method} R$ ${amount}${showProductName ? ` • ${productName}` : ''}`;

          await sendPushNotification(title, message, 'https://paycheckout.lovable.app/admin/orders');
        }
      } catch (notifErr) {
        console.error('[pagarme-webhook] Notification error (non-blocking):', notifErr);
      }
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pagarme-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
