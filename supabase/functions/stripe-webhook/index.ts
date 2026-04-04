import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();

    // Stripe sends signature in stripe-signature header
    const sigHeader = req.headers.get('stripe-signature');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // If webhook secret is configured, verify signature
    if (STRIPE_WEBHOOK_SECRET && sigHeader) {
      const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part: string) => {
        const [key, val] = part.split('=');
        acc[key] = val;
        return acc;
      }, {} as Record<string, string>);

      const timestamp = parts['t'];
      const expectedSig = parts['v1'];

      if (!timestamp || !expectedSig) {
        console.error('[stripe-webhook] Missing signature components');
        return new Response('Invalid signature', { status: 400, headers: corsHeaders });
      }

      // Verify timestamp (reject if older than 5 minutes)
      const ts = parseInt(timestamp, 10);
      if (Math.abs(Date.now() / 1000 - ts) > 300) {
        console.error('[stripe-webhook] Timestamp too old');
        return new Response('Timestamp expired', { status: 400, headers: corsHeaders });
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${body}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(STRIPE_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
      const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (computed !== expectedSig) {
        console.error('[stripe-webhook] Signature mismatch');
        return new Response('Invalid signature', { status: 400, headers: corsHeaders });
      }
    } else if (STRIPE_WEBHOOK_SECRET) {
      console.warn('[stripe-webhook] No stripe-signature header present');
      return new Response('Missing signature', { status: 400, headers: corsHeaders });
    }

    const event = JSON.parse(body);
    console.log('[stripe-webhook] Event type:', event.type, 'ID:', event.id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
    const obj = event.data?.object;

    switch (event.type) {
      case 'checkout.session.completed':
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

    // --- Status transition guard ---
    const externalId = obj.payment_intent || obj.id;
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

    console.log('[stripe-webhook] Order update:', { externalId, status, found: !!orderData });

    // On payment success, create member access + fire webhooks
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
          // Atomic upsert with unique constraint (customer_id, course_id)
          const { data: newAccess } = await supabase
            .from('member_access')
            .upsert(
              { customer_id: orderData.customer_id, course_id: course.id, order_id: orderData.id },
              { onConflict: 'customer_id,course_id', ignoreDuplicates: true }
            )
            .select('access_token')
            .maybeSingle();

          if (newAccess) {
            console.log('[stripe-webhook] Upserted member access for course:', course.id);

            // Send access email
            if (newAccess?.access_token) {
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
                    const emailHtml = `
                      <!DOCTYPE html>
                      <html>
                      <head><meta charset="utf-8"></head>
                      <body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
                        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
                          <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;text-align:center;">
                            <h1 style="margin:0;color:#fff;font-size:24px;">🎉 Pagamento confirmado!</h1>
                          </div>
                          <div style="padding:32px;">
                            <p>Olá <strong>${custData.name.split(' ')[0]}</strong>,</p>
                            <p>Seu acesso ao curso <strong>"${course.title}"</strong> está liberado!</p>
                            <div style="text-align:center;margin:32px 0;">
                              <a href="${accessUrl}" style="background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;">Acessar Curso</a>
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
                        subject: `🎉 Acesso liberado — "${course.title}"`,
                        html: emailHtml,
                      }),
                    });
                    const emailData = await emailRes.json();
                    console.log('[stripe-webhook] Email sent to', custData.email, emailRes.ok ? '✅' : '❌');

                    await supabase.from('email_logs').insert({
                      user_id: orderData.user_id,
                      to_email: custData.email,
                      to_name: custData.name,
                      subject: `🎉 Acesso liberado — "${course.title}"`,
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
      } // end else (panttera delivery)

      // CAPI fallback
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('name, email, phone, cpf')
          .eq('id', orderData.customer_id)
          .single();

        if (custData) {
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
                currency: 'BRL',
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
          }).catch(e => console.error('[stripe-webhook] whatsapp-dispatch error:', e));
        }
      } catch (waErr) {
        console.error('[stripe-webhook] WhatsApp dispatch error (non-blocking):', waErr);
      }
    }

    // Fire webhooks for other statuses
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
  } catch (error) {
    console.error('[stripe-webhook] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
