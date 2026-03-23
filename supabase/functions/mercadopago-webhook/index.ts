import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, targetUserId?: string, url?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return;

  try {
    const payload: Record<string, unknown> = {
      app_id: appId,
      target_channel: 'push',
      headings: { en: title },
      contents: { en: message },
      chrome_web_icon: 'https://app.panttera.com.br/pwa-192x192.png',
    };
    if (targetUserId) {
      payload.filters = [{ field: 'tag', key: 'user_id', relation: '=', value: targetUserId }];
    } else {
      payload.included_segments = ['Total Subscriptions'];
    }
    if (url) payload.url = url;

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    console.log('[mp-webhook] OneSignal:', { status: response.status, body: raw });
  } catch (err) {
    console.error('[mp-webhook] OneSignal error:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[mp-webhook] Received:', JSON.stringify(body).slice(0, 500));

    // Mercado Pago sends notifications in this format:
    // { action: "payment.updated", type: "payment", data: { id: "123456" } }
    // OR IPN format: { topic: "payment", id: "123456" }
    const action = body.action || '';
    const topic = body.topic || '';
    const dataId = body.data?.id || body.id;

    // Only process payment events
    if (!action.startsWith('payment.') && topic !== 'payment') {
      console.log('[mp-webhook] Ignoring non-payment event:', action || topic);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dataId) {
      console.log('[mp-webhook] No payment id found');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the full payment from Mercado Pago API to get the actual status
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error('[mp-webhook] MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Token not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error('[mp-webhook] Failed to fetch payment from MP:', mpResponse.status, errText);
      return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = await mpResponse.json();
    const mpStatus = payment.status; // approved, pending, rejected, cancelled, refunded, charged_back, in_process
    const paymentId = String(payment.id);

    console.log('[mp-webhook] Payment', paymentId, 'status:', mpStatus);

    // Map MP status to our internal status
    let status = 'pending';
    if (mpStatus === 'approved') status = 'paid';
    else if (mpStatus === 'rejected') status = 'failed';
    else if (mpStatus === 'cancelled') status = 'cancelled';
    else if (mpStatus === 'refunded') status = 'refunded';
    else if (mpStatus === 'charged_back') status = 'chargeback';
    else if (mpStatus === 'in_process') status = 'pending';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update order by external_id
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', paymentId)
      .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
      .maybeSingle();

    if (error) {
      console.error('[mp-webhook] Error updating order:', error);
    }

    console.log('[mp-webhook] Order updated:', { paymentId, status, found: !!orderData });

    // Fire user webhooks (non-blocking)
    if (orderData?.id && orderData?.user_id) {
      const webhookEvent = status === 'paid' ? 'order.paid'
        : status === 'refunded' ? 'order.refunded'
        : status === 'cancelled' ? 'order.cancelled'
        : status === 'chargeback' ? 'order.chargeback'
        : null;
      if (webhookEvent) {
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ event: webhookEvent, order_id: orderData.id, user_id: orderData.user_id }),
        }).catch(err => console.error('[mp-webhook] fire-webhooks error:', err));
      }
    }

    // On confirmed payment, handle member access + notifications
    if (status === 'paid' && orderData?.product_id && orderData?.customer_id) {
      try {
        const { data: course } = await supabase
          .from('courses')
          .select('id, title')
          .eq('product_id', orderData.product_id)
          .maybeSingle();

        if (course) {
          const { data: existingAccess } = await supabase
            .from('member_access')
            .select('id')
            .eq('customer_id', orderData.customer_id)
            .eq('course_id', course.id)
            .maybeSingle();

          if (!existingAccess) {
            const { data: newAccess, error: accessErr } = await supabase
              .from('member_access')
              .insert({ customer_id: orderData.customer_id, course_id: course.id })
              .select('access_token')
              .single();

            if (accessErr) {
              console.error('[mp-webhook] Error creating member access:', accessErr);
            } else {
              console.log('[mp-webhook] Member access created for course:', course.id);

              // Send access email
              const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
              if (RESEND_API_KEY && newAccess?.access_token) {
                try {
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
                      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        from: 'PanteraPay <noreply@paolasemfiltro.com>',
                        to: [customerData.email],
                        subject: `🎉 Acesso liberado — "${course.title}"`,
                        html: emailHtml,
                      }),
                    });
                    const emailData = await emailRes.json();

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
                      source: 'mercadopago-webhook',
                    });

                    console.log('[mp-webhook] Access email sent to', customerData.email);
                  }
                } catch (emailErr) {
                  console.error('[mp-webhook] Email error (non-blocking):', emailErr);
                }
              }
            }
          }
        }
      } catch (memberErr) {
        console.error('[mp-webhook] Member access error (non-blocking):', memberErr);
      }

      // Push notification
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
            const { data: prod } = await supabase.from('products').select('name').eq('id', orderData.product_id).maybeSingle();
            if (prod) productName = prod.name;
          }
          if (orderData.customer_id) {
            const { data: cust } = await supabase.from('customers').select('name').eq('id', orderData.customer_id).maybeSingle();
            if (cust) customerName = cust.name;
          }

          await sendPushNotification(
            '💰 Nova venda via Mercado Pago!',
            `${customerName || 'Cliente'} • ${method} R$ ${amount}${notifSettings.show_product_name ? ` • ${productName}` : ''}`,
            ownerId || undefined,
            'https://app.panttera.com.br/admin/orders'
          );
        }
      } catch (notifErr) {
        console.error('[mp-webhook] Notification error (non-blocking):', notifErr);
      }
      }

      // CAPI Purchase fallback — fire if checkout didn't already
      if (orderData) {
        try {
          const { data: purchaseAlreadyFired } = await supabase
            .from('pixel_events')
            .select('id')
            .eq('product_id', orderData.product_id!)
            .eq('event_name', 'Purchase')
            .eq('source', 'server')
            .like('event_id', `%${paymentId}%`)
            .limit(1);

          const alreadyFired = (purchaseAlreadyFired && purchaseAlreadyFired.length > 0);

          if (!alreadyFired) {
            const { data: custData } = await supabase
              .from('customers')
              .select('name, email, phone, cpf')
              .eq('id', orderData.customer_id!)
              .single();

            if (custData) {
              const checkoutUrl = (orderData.metadata as any)?.checkout_url
                || `https://app.panttera.com.br/checkout/${orderData.product_id}`;

              await fetch(
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
                    event_id: paymentId,
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
              ).catch((err: unknown) => console.error('[mp-webhook] CAPI fallback error:', err));

              console.log('[mp-webhook] CAPI Purchase fallback fired for order', orderData.id);
            }
          } else {
            console.log('[mp-webhook] Purchase already fired by checkout, skipping CAPI');
          }
        } catch (capiErr) {
          console.error('[mp-webhook] CAPI fallback error (non-blocking):', capiErr);
        }
      }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[mp-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
