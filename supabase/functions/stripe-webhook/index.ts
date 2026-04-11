import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function verifyStripeSignature(body: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part: string) => {
    const [key, val] = part.split('=');
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['t'];
  const expectedSig = parts['v1'];

  if (!timestamp || !expectedSig) return false;

  // Reject if older than 5 minutes
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signedPayload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === expectedSig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const sigHeader = req.headers.get('stripe-signature');

    const event = JSON.parse(body);
    console.log('[stripe-webhook] Event type:', event.type, 'ID:', event.id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- Resolve the webhook secret from the producer's gateway config ---
    // First, find the product owner from the event metadata or order
    const obj = event.data?.object;
    let resolvedWebhookSecret: string | null = null;
    let producerUserId: string | null = null;

    // Try to get product_id from session metadata
    const metaProductId = obj?.metadata?.product_id;
    if (metaProductId) {
      const { data: prod } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', metaProductId)
        .maybeSingle();
      if (prod?.user_id) producerUserId = prod.user_id;
    }

    // Fallback: try to find order by external_id
    if (!producerUserId) {
      const exId = event.type === 'checkout.session.completed' ? obj?.id : (obj?.payment_intent || obj?.id);
      if (exId) {
        const { data: order } = await supabase
          .from('orders')
          .select('user_id')
          .eq('external_id', exId)
          .maybeSingle();
        if (order?.user_id) producerUserId = order.user_id;
      }
    }

    // Resolve webhook_secret from producer's Stripe gateway
    if (producerUserId) {
      const { data: gw } = await supabase
        .from('payment_gateways')
        .select('config')
        .eq('user_id', producerUserId)
        .eq('provider', 'stripe')
        .eq('active', true)
        .maybeSingle();
      if (gw?.config && typeof gw.config === 'object' && (gw.config as any).webhook_secret) {
        resolvedWebhookSecret = (gw.config as any).webhook_secret;
      }
    }

    // Fallback: global secret (super_admin only)
    if (!resolvedWebhookSecret && producerUserId) {
      const { data: ownerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', producerUserId)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (ownerRole) {
        resolvedWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || null;
      }
    }

    // Verify signature if we have a secret
    if (resolvedWebhookSecret) {
      if (!sigHeader) {
        console.warn('[stripe-webhook] No stripe-signature header present');
        return new Response('Missing signature', { status: 400, headers: corsHeaders });
      }
      const valid = await verifyStripeSignature(body, sigHeader, resolvedWebhookSecret);
      if (!valid) {
        console.error('[stripe-webhook] Signature mismatch');
        return new Response('Invalid signature', { status: 400, headers: corsHeaders });
      }
      console.log('[stripe-webhook] Signature verified ✅');
    } else {
      console.warn('[stripe-webhook] No webhook secret found — skipping signature verification');
    }

    // --- Idempotency: deduplicate webhook events ---
    const dedupKey = `stripe_${event.id}`;
    const { data: inserted } = await supabase
      .from('webhook_events')
      .upsert({ id: dedupKey, gateway: 'stripe' }, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')
      .maybeSingle();

    if (!inserted) {
      console.log('[stripe-webhook] Duplicate event, skipping:', dedupKey);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map Stripe event types to order statuses
    let status: string | null = null;

    switch (event.type) {
      case 'checkout.session.completed':
        if (obj?.payment_status === 'paid') status = 'paid';
        break;
      case 'payment_intent.succeeded':
        status = 'paid';
        break;
      case 'payment_intent.payment_failed':
        status = 'failed';
        break;
      case 'charge.refunded':
        status = 'refunded';
        break;
      case 'payment_intent.canceled':
        status = 'cancelled';
        break;
      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (!status || !obj) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Resolve external_id ---
    let externalId: string;
    if (event.type === 'checkout.session.completed') {
      externalId = obj.id;
    } else {
      externalId = obj.payment_intent || obj.id;
    }

    // --- Status transition guard ---
    const { data: orderData, error: updateErr } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', externalId)
      .not('status', 'in', `(${['paid', 'refunded'].filter(s => {
        const p: Record<string, number> = { pending: 1, failed: 2, paid: 3, refunded: 4, cancelled: 4 };
        return (p[s] || 0) >= (p[status!] || 0);
      }).join(',')})`)
      .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
      .maybeSingle();

    if (updateErr) {
      console.error('[stripe-webhook] Error updating order:', updateErr);
    }

    // Fallback: checkout.session.completed → try payment_intent
    if (!orderData && event.type === 'checkout.session.completed' && obj.payment_intent) {
      const { data: fallbackOrder } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString(), external_id: obj.id })
        .eq('external_id', obj.payment_intent)
        .not('status', 'in', '(paid,refunded)')
        .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
        .maybeSingle();
      if (fallbackOrder) {
        console.log('[stripe-webhook] Found order via payment_intent fallback');
        return await processOrder(supabase, fallbackOrder, status, externalId, event, corsHeaders);
      }
    }

    console.log('[stripe-webhook] Order update:', { externalId, status, found: !!orderData });

    if (orderData) {
      return await processOrder(supabase, orderData, status, externalId, event, corsHeaders);
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[stripe-webhook] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processOrder(
  supabase: any,
  orderData: any,
  status: string,
  externalId: string,
  event: any,
  corsHeaders: Record<string, string>
) {
  // Determine product currency
  let productCurrency = 'BRL';
  if (orderData.product_id) {
    const { data: prodInfo } = await supabase
      .from('products')
      .select('currency')
      .eq('id', orderData.product_id)
      .maybeSingle();
    if (prodInfo?.currency) productCurrency = prodInfo.currency;
  }

  // On payment success
  if (status === 'paid' && orderData?.product_id && orderData?.customer_id) {
    // Fire user webhooks
    if (orderData.user_id) {
      for (const evt of ['payment.approved', 'order.paid']) {
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ event: evt, order_id: orderData.id, user_id: orderData.user_id }),
        }).catch(err => console.error('[stripe-webhook] fire-webhooks error:', err));
      }
    }

    // Create member access — only if product uses 'panttera' delivery
    const { data: mainProd } = await supabase
      .from('products')
      .select('delivery_method')
      .eq('id', orderData.product_id)
      .maybeSingle();

    if (mainProd?.delivery_method !== 'panttera') {
      console.log('[stripe-webhook] Skipping member access — delivery_method is', mainProd?.delivery_method || 'appsell');
    } else {
      const productIdsForAccess = [orderData.product_id];
      const bumpIds = (orderData.metadata as any)?.bump_product_ids;
      if (Array.isArray(bumpIds)) productIdsForAccess.push(...bumpIds);

      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, product_id')
        .in('product_id', productIdsForAccess);

      if (courses && courses.length > 0) {
        for (const course of courses) {
          const { data: newAccess } = await supabase
            .from('member_access')
            .upsert(
              { customer_id: orderData.customer_id, course_id: course.id, order_id: orderData.id },
              { onConflict: 'customer_id,course_id', ignoreDuplicates: true }
            )
            .select('access_token')
            .maybeSingle();

          if (newAccess?.access_token) {
            console.log('[stripe-webhook] Upserted member access for course:', course.id);

            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            if (RESEND_API_KEY) {
              try {
                const { data: custData } = await supabase
                  .from('customers')
                  .select('name, email')
                  .eq('id', orderData.customer_id)
                  .single();

                if (custData) {
                  const accessUrl = `https://app.panttera.com.br/membros?token=${newAccess.access_token}`;
                  const isEnglish = productCurrency === 'USD';
                  const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="utf-8"></head>
                    <body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
                      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
                        <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;text-align:center;">
                          <h1 style="margin:0;color:#fff;font-size:24px;">🎉 ${isEnglish ? 'Payment confirmed!' : 'Pagamento confirmado!'}</h1>
                        </div>
                        <div style="padding:32px;">
                          <p>${isEnglish ? 'Hi' : 'Olá'} <strong>${custData.name.split(' ')[0]}</strong>,</p>
                          <p>${isEnglish ? `Your access to the course <strong>"${course.title}"</strong> is ready!` : `Seu acesso ao curso <strong>"${course.title}"</strong> está liberado!`}</p>
                          <div style="text-align:center;margin:32px 0;">
                            <a href="${accessUrl}" style="background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;">${isEnglish ? 'Access Course' : 'Acessar Curso'}</a>
                          </div>
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
                      to: [custData.email],
                      subject: `🎉 ${isEnglish ? 'Access granted' : 'Acesso liberado'} — "${course.title}"`,
                      html: emailHtml,
                    }),
                  });
                  const emailData = await emailRes.json();
                  console.log('[stripe-webhook] Email sent to', custData.email, emailRes.ok ? '✅' : '❌');

                  await supabase.from('email_logs').insert({
                    user_id: orderData.user_id,
                    to_email: custData.email,
                    to_name: custData.name,
                    subject: `🎉 ${isEnglish ? 'Access granted' : 'Acesso liberado'} — "${course.title}"`,
                    html_body: emailHtml,
                    email_type: 'payment_confirmed',
                    status: emailRes.ok ? 'sent' : 'failed',
                    resend_id: emailData?.id || null,
                    customer_id: orderData.customer_id,
                    product_id: course.product_id,
                    source: 'stripe-webhook',
                  });
                }
              } catch (emailErr) {
                console.error('[stripe-webhook] Email error:', emailErr);
              }
            }
          }
        }
      }
    }

    // CAPI fallback
    try {
      const { data: custData } = await supabase
        .from('customers')
        .select('name, email, phone, cpf')
        .eq('id', orderData.customer_id)
        .single();

      if (custData) {
        // Mark abandoned carts as recovered
        try {
          await supabase
            .from('abandoned_carts')
            .update({ recovered: true })
            .eq('product_id', orderData.product_id)
            .eq('customer_email', custData.email)
            .eq('recovered', false);
        } catch (recoverErr) {
          console.error('[stripe-webhook] Cart recovery mark error (non-blocking):', recoverErr);
        }

        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-capi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            product_id: orderData.product_id,
            event_name: 'Purchase',
            event_id: externalId,
            event_source_url: (orderData.metadata as any)?.checkout_url || `https://app.panttera.com.br/checkout/${orderData.product_id}`,
            customer: custData,
            custom_data: {
              value: Number(orderData.amount),
              currency: productCurrency,
              content_type: 'product',
              order_id: orderData.id,
            },
            log_browser: true,
          }),
        });
      }
    } catch (capiErr) {
      console.error('[stripe-webhook] CAPI error:', capiErr);
    }
  }

  // WhatsApp dispatch (non-blocking)
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
        }).catch(e => console.error('[stripe-webhook] whatsapp-dispatch error:', e));
      }
    } catch (waErr) {
      console.error('[stripe-webhook] WhatsApp dispatch error (non-blocking):', waErr);
    }
  }

  // Fire webhooks for non-paid statuses
  if (orderData?.user_id && status !== 'paid') {
    const evtMap: Record<string, string[]> = {
      refunded: ['payment.refunded', 'order.refunded'],
      failed: ['payment.failed'],
      cancelled: ['payment.failed', 'order.cancelled'],
    };
    for (const evt of (evtMap[status] || [])) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ event: evt, order_id: orderData.id, user_id: orderData.user_id }),
      }).catch(err => console.error('[stripe-webhook] fire-webhooks error:', err));
    }
  }

  return new Response(JSON.stringify({ received: true, status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}