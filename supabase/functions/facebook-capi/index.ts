import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CAPIEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: string;
  user_data: {
    em?: string[];
    ph?: string[];
    fn?: string[];
    ln?: string[];
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_type?: string;
    content_ids?: string[];
    order_id?: string;
  };
}

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      product_id,
      event_name,
      event_id,
      event_source_url,
      customer,
      custom_data,
      fbc,
      fbp,
      visitor_id,
      user_agent,
    } = await req.json();

    if (!product_id || !event_name) {
      return new Response(
        JSON.stringify({ error: 'product_id and event_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get pixels with CAPI tokens for this product
    const { data: pixels } = await supabase
      .from('product_pixels')
      .select('pixel_id, capi_token, user_id')
      .eq('product_id', product_id)
      .eq('platform', 'facebook')
      .not('capi_token', 'is', null);

    // Log event to pixel_events for dashboard (non-blocking)
    const productOwnerId = pixels?.[0]?.user_id || null;
    const customerName = customer?.name || null;
    supabase.from('pixel_events').insert({
      product_id,
      event_name,
      source: 'server',
      event_id: event_id || null,
      user_id: productOwnerId,
      customer_name: customerName,
      visitor_id: visitor_id || null,
    }).then(() => {});

    if (!pixels || pixels.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No CAPI tokens configured, skipping' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract real client IP — x-forwarded-for may contain "client, proxy1, proxy2"
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : req.headers.get('cf-connecting-ip') || undefined;

    // Skip invalid/private IPs that Meta will reject
    // Check if IP is private (RFC 1918) — only 172.16.0.0–172.31.255.255 are private
    const isPrivate172 = (ip: string) => {
      const m = ip.match(/^172\.(\d+)\./);
      if (!m) return false;
      const second = parseInt(m[1], 10);
      return second >= 16 && second <= 31;
    };

    const isValidPublicIp = clientIp && 
      !clientIp.startsWith('0.') && 
      !clientIp.startsWith('127.') && 
      !clientIp.startsWith('10.') && 
      !clientIp.startsWith('192.168.') &&
      !isPrivate172(clientIp) &&
      clientIp !== '::1';

    const userData: CAPIEvent['user_data'] = {
      client_ip_address: isValidPublicIp ? clientIp : undefined,
      // Prefer browser UA sent from client; fallback to request UA
      client_user_agent: user_agent || req.headers.get('user-agent') || undefined,
    };

    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    // Always send country for Brazilian users (boosts EMQ significantly)
    (userData as any).country = [await hashSHA256('br')];

    // Always send visitor_id as external_id for consistent cross-event matching (boosts EMQ)
    if (visitor_id) {
      userData.external_id = [await hashSHA256(visitor_id)];
    }

    if (customer?.email) {
      userData.em = [await hashSHA256(customer.email)];
    }
    if (customer?.phone) {
      const phone = customer.phone.replace(/\D/g, '');
      const formatted = phone.startsWith('55') ? phone : `55${phone}`;
      userData.ph = [await hashSHA256(formatted)];
    }
    if (customer?.name) {
      const parts = customer.name.trim().toLowerCase().split(' ');
      userData.fn = [await hashSHA256(parts[0])];
      if (parts.length > 1) {
        userData.ln = [await hashSHA256(parts.slice(1).join(' '))];
      }
    }
    if (customer?.cpf) {
      // If CPF exists, use it as external_id instead (stronger identifier)
      userData.external_id = [await hashSHA256(customer.cpf.replace(/\D/g, ''))];
    }

    const event: CAPIEvent = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_id || `${event_name}_${Date.now()}`,
      event_source_url: event_source_url || '',
      action_source: 'website',
      user_data: userData,
    };

    if (custom_data) {
      event.custom_data = custom_data;
    }

    const results: any[] = [];

    // Send to each pixel that has a CAPI token
    for (const pixel of pixels) {
      if (!pixel.capi_token) continue;

      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${pixel.pixel_id}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: [event],
              access_token: pixel.capi_token,
            }),
          }
        );

        const data = await response.json();
        console.log(`[facebook-capi] Pixel ${pixel.pixel_id}:`, JSON.stringify(data));
        results.push({ pixel_id: pixel.pixel_id, success: response.ok, data });
      } catch (err) {
        console.error(`[facebook-capi] Pixel ${pixel.pixel_id} error:`, err);
        results.push({ pixel_id: pixel.pixel_id, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[facebook-capi] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
