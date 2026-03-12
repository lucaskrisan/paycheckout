import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, url?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    console.warn('[asaas-webhook] OneSignal not configured, skipping notification');
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

    const siteUrl = 'https://paycheckout.lovable.app';
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

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PayCheckout <noreply@paolasemfiltro.com>',
        to: [customer.email],
        subject: `🎉 Acesso liberado — "${course.title}"`,
        html: emailHtml,
      }),
    });
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
    const payload = await req.json();
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

    // Update order by external_id (works for both one-time and subscription payments)
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', payment.id)
      .select('amount, payment_method, product_id, customer_id')
      .maybeSingle();

    if (error) {
      console.error('[asaas-webhook] Error updating order:', error);
    }

    // On confirmed payment, handle member access
    if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && orderData?.product_id && orderData?.customer_id) {
      const { data: product } = await supabase
        .from('products')
        .select('is_subscription, billing_cycle')
        .eq('id', orderData.product_id)
        .maybeSingle();

      // Find course linked to this product
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

        if (product?.is_subscription) {
          // Subscription: extend expiration
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
          // One-time purchase: create permanent access
          const { data: newAccess, error: accessErr } = await supabase
            .from('member_access')
            .insert({ customer_id: orderData.customer_id, course_id: course.id })
            .select('access_token')
            .single();

          if (accessErr) {
            console.error('[asaas-webhook] Error creating member access:', accessErr);
          } else {
            console.log('[asaas-webhook] Created member access for course:', course.id);
            if (newAccess) {
              await sendAccessEmail(supabase, orderData.customer_id, course, newAccess.access_token);
            }
          }
        }
      }
    }

    // Send push notification on confirmed sale
    if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && orderData) {
      try {
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('send_approved, show_product_name')
          .eq('send_approved', true);

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
        console.error('[asaas-webhook] Notification error (non-blocking):', notifErr);
      }
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[asaas-webhook] Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});