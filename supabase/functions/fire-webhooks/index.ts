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
      .select('id, url, secret, events')
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
      .select('*, customers(name, email, phone, cpf), products(name, price)')
      .eq('id', order_id)
      .single();

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        order_id: order.id,
        external_id: order.external_id,
        status: order.status,
        amount: order.amount,
        payment_method: order.payment_method,
        created_at: order.created_at,
        customer: order.customers ? {
          name: (order.customers as any).name,
          email: (order.customers as any).email,
          phone: (order.customers as any).phone,
        } : null,
        product: order.products ? {
          name: (order.products as any).name,
          price: (order.products as any).price,
        } : null,
        metadata: order.metadata,
      },
    };

    const results: any[] = [];

    for (const ep of matching) {
      try {
        // Create HMAC signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(ep.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const bodyStr = JSON.stringify(payload);
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr));
        const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

        const resp = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': sigHex,
            'X-Webhook-Event': event,
          },
          body: bodyStr,
        });

        results.push({ endpoint_id: ep.id, status: resp.status, success: resp.ok });
        console.log(`[fire-webhooks] Sent ${event} to ${ep.url}: ${resp.status}`);
      } catch (err) {
        console.error(`[fire-webhooks] Error sending to ${ep.url}:`, err);
        results.push({ endpoint_id: ep.id, success: false, error: (err as Error).message });
      }
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
