import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processOrderPaid } from '../_shared/process-order-paid.ts';
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

/**
 * Verify MercadoPago webhook signature.
 * Format: x-signature header has "ts=<timestamp>,v1=<hash>"
 *         x-request-id header is required
 *         manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *         hash = HMAC-SHA256(manifest, secret)
 * Docs: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 */
async function verifyMpSignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !requestId || !dataId) return false;

  // Parse "ts=...,v1=..."
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=').map((s) => s.trim());
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time compare
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
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

    // --- Signature verification ---
    const MP_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    const sigHeader = req.headers.get('x-signature');
    const reqIdHeader = req.headers.get('x-request-id');

    if (MP_WEBHOOK_SECRET) {
      const valid = await verifyMpSignature(sigHeader, reqIdHeader, dataId ? String(dataId) : null, MP_WEBHOOK_SECRET);
      if (!valid) {
        console.error('[mp-webhook] BLOCKED: invalid or missing x-signature', {
          hasSig: !!sigHeader,
          hasReqId: !!reqIdHeader,
          hasDataId: !!dataId,
        });
        try {
          const supabaseLog = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );
          await supabaseLog.from('webhook_events').insert({
            id: `mp_blocked_${Date.now()}`,
            gateway: 'mercadopago',
            blocked: true,
            block_reason: sigHeader ? 'invalid_signature' : 'missing_signature',
          });
        } catch {}
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('[mp-webhook] Signature verified ✅');
    } else {
      console.warn('[mp-webhook] No MERCADOPAGO_WEBHOOK_SECRET configured — accepting without verification (configure secret to enable HMAC validation)');
    }

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

    // Resolve the producer's token before fetching payment details
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let producerToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    // 1. Try to find the order by external_id to get the owner
    const { data: orderLookup } = await supabase
      .from('orders')
      .select('user_id')
      .eq('external_id', String(dataId))
      .maybeSingle();

    if (orderLookup?.user_id) {
      const { data: gw } = await supabase
        .from('payment_gateways')
        .select('config')
        .eq('user_id', orderLookup.user_id)
        .eq('provider', 'mercadopago')
        .eq('active', true)
        .maybeSingle();
      
      if (gw?.config && typeof gw.config === 'object' && (gw.config as any).api_key) {
        producerToken = (gw.config as any).api_key;
        console.log('[mp-webhook] Using producer token for user:', orderLookup.user_id);
      }
    }

    if (!producerToken) {
      console.error('[mp-webhook] No access token found (global or producer)');
      return new Response(JSON.stringify({ error: 'Token not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the full payment from Mercado Pago API to get the actual status
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { 'Authorization': `Bearer ${producerToken}` },
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
    const orderId = payment.external_reference;

    console.log('[mp-webhook] Payment', paymentId, 'status:', mpStatus, 'external_ref:', orderId);

    // Map MP status to our internal status
    let status = 'pending';
    if (mpStatus === 'approved') status = 'paid';
    else if (mpStatus === 'rejected') status = 'failed';
    else if (mpStatus === 'cancelled') status = 'cancelled';
    else if (mpStatus === 'refunded') status = 'refunded';
    else if (mpStatus === 'charged_back') status = 'chargeback';
    else if (mpStatus === 'in_process') status = 'pending';

    // Update order
    let orderUpdate;
    
    if (orderId) {
      // Try by internal ID first (Bug 3)
      orderUpdate = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
        .maybeSingle();
    }

    // Fallback to external_id if no orderId or not found (for old orders)
    if (!orderUpdate?.data) {
      orderUpdate = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('external_id', paymentId)
        .select('id, amount, payment_method, product_id, customer_id, user_id, metadata')
        .maybeSingle();
    }

    const { data: orderData, error } = orderUpdate;

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

    // ═══════════════════════════════════════════════════════════════════════
    // On confirmed payment → delegate ALL side effects to shared processor
    // ═══════════════════════════════════════════════════════════════════════
    if (status === 'paid' && orderData?.product_id && orderData?.customer_id) {
      await processOrderPaid({
        supabase,
        orderData: {
          id: orderData.id,
          amount: orderData.amount,
          payment_method: orderData.payment_method,
          product_id: orderData.product_id,
          customer_id: orderData.customer_id,
          user_id: orderData.user_id,
          metadata: orderData.metadata as Record<string, unknown> | null,
        },
        externalId: paymentId,
        source: 'mercadopago-webhook',
        currency: 'BRL',
      });
    }
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

      // --- WhatsApp dispatch (non-blocking) ---
      if (orderData?.user_id && orderData?.customer_id) {
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
            }).catch(e => console.error('[mp-webhook] whatsapp-dispatch error:', e));
          }
        } catch (waErr) {
          console.error('[mp-webhook] WhatsApp dispatch error (non-blocking):', waErr);
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
                    geo: {
                      country: (orderData as any).customer_country || null,
                      city: (orderData as any).customer_city || null,
                      state: (orderData as any).customer_state || null,
                      zip: (orderData as any).customer_zip || null,
                    },
                    custom_data: {
                      value: Number(orderData.amount),
                      currency: 'BRL',
                      content_type: 'product',
                      content_ids: [orderData.product_id],
                      num_items: 1,
                      order_id: orderData.id,
                      payment_method: orderData.payment_method,
                    },
                    payment_method: orderData.payment_method,
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
