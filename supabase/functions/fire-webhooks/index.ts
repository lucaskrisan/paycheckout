import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Retry delays in seconds: 5s, 30s, 2min
const RETRY_DELAYS = [5, 30, 120];
const TIMEOUT_MS = 5000;

async function createHmacSignature(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deliverWebhook(
  url: string,
  secret: string,
  payload: Record<string, unknown>,
  event: string,
): Promise<{ status: number; body: string; success: boolean }> {
  const bodyStr = JSON.stringify(payload);
  const signature = await createHmacSignature(secret, bodyStr);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-panttera-signature': signature,
        'x-panttera-event': event,
        'User-Agent': 'Panttera-Webhooks/1.0',
      },
      body: bodyStr,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let respBody = '';
    try { respBody = await resp.text(); } catch { respBody = ''; }

    return { status: resp.status, body: respBody.substring(0, 2000), success: resp.ok };
  } catch (err) {
    clearTimeout(timeout);
    const msg = (err as Error).message || 'Unknown error';
    return { status: 0, body: msg, success: false };
  }
}

function buildPayload(event: string, order: Record<string, unknown>, eventId: string) {
  const customers = order.customers as Record<string, unknown> | null;
  const products = order.products as Record<string, unknown> | null;

  return {
    id: eventId,
    type: event,
    created_at: new Date().toISOString(),
    data: {
      order_id: order.id,
      external_id: order.external_id || null,
      status: order.status,
      payment: {
        amount: order.amount,
        currency: 'BRL',
        method: order.payment_method,
      },
      customer: customers ? {
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        cpf: customers.cpf,
      } : null,
      product: products ? {
        id: products.id,
        name: products.name,
        price: products.price,
      } : null,
      metadata: order.metadata || {},
      created_at: order.created_at,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, order_id, user_id } = await req.json();

    if (!event || !order_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'event, order_id, and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get active webhook endpoints for this user and event
    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('id, url, secret, events, product_id')
      .eq('user_id', user_id)
      .eq('active', true);

    if (!endpoints || endpoints.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No webhooks configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter endpoints that listen to this event
    const matching = endpoints.filter((ep: any) =>
      ep.events && Array.isArray(ep.events) && ep.events.includes(event)
    );

    if (matching.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No endpoints for this event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get full order data
    const { data: order } = await supabase
      .from('orders')
      .select('*, customers(id, name, email, phone, cpf), products(id, name, price)')
      .eq('id', order_id)
      .single();

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by product_id if set on endpoint
    const filteredEndpoints = matching.filter((ep: any) =>
      !ep.product_id || ep.product_id === order.product_id
    );

    const results: any[] = [];

    for (const ep of filteredEndpoints) {
      // Generate unique event ID for idempotency
      const eventId = `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;

      const payload = buildPayload(event, order, eventId);

      // Create delivery record
      const { data: delivery } = await supabase
        .from('webhook_deliveries')
        .insert({
          endpoint_id: ep.id,
          user_id,
          event_type: event,
          event_id: eventId,
          order_id,
          payload,
          status: 'pending',
          attempt: 1,
          max_attempts: 3,
        })
        .select('id')
        .single();

      // Attempt delivery
      const result = await deliverWebhook(ep.url, ep.secret, payload, event);

      // Update delivery record
      if (result.success) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'success',
            last_response_status: result.status,
            last_response_body: result.body,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', delivery?.id);

        console.log(`[fire-webhooks] ✅ ${event} → ${ep.url}: ${result.status}`);
      } else {
        // Schedule retry
        const nextDelay = RETRY_DELAYS[0]; // 5 seconds for first retry
        const nextRetry = new Date(Date.now() + nextDelay * 1000).toISOString();

        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'retrying',
            last_response_status: result.status,
            last_response_body: result.body,
            last_error: result.body,
            next_retry_at: nextRetry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', delivery?.id);

        console.log(`[fire-webhooks] ⚠️ ${event} → ${ep.url}: failed (${result.status}), retry at ${nextRetry}`);
      }

      results.push({
        endpoint_id: ep.id,
        delivery_id: delivery?.id,
        event_id: eventId,
        status: result.status,
        success: result.success,
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fire-webhooks] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
