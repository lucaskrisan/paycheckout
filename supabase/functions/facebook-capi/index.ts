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
    country?: string[];
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
    content_name?: string;
    num_items?: number;
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
      log_browser,
      payment_method,
      geo,
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

    // Get product owner for logging (independent of CAPI config)
    const { data: productData } = await supabase
      .from('products')
      .select('user_id')
      .eq('id', product_id)
      .single();

    const productOwnerId = productData?.user_id || null;

    // Get pixels with CAPI tokens for this product
    const { data: pixels } = await supabase
      .from('product_pixels')
      .select('pixel_id, capi_token, fire_on_pix, fire_on_boleto')
      .eq('product_id', product_id)
      .eq('platform', 'facebook')
      .not('capi_token', 'is', null);

    // Log event to pixel_events for dashboard
    const customerName = customer?.name || null;

    await supabase.from('pixel_events').insert({
      product_id,
      event_name,
      source: 'server',
      event_id: event_id || null,
      user_id: productOwnerId,
      customer_name: customerName,
      visitor_id: visitor_id || null,
    });

    // If caller signals browser pixel also fired, log a "browser" entry so dashboard shows DUAL ✓
    if (log_browser) {
      await supabase.from('pixel_events').insert({
        product_id,
        event_name,
        source: 'browser',
        event_id: event_id || null,
        user_id: productOwnerId,
        customer_name: customerName,
        visitor_id: visitor_id || null,
      });
    }

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

    // CRITICAL: Only send fbc/fbp if they have actual values (not empty strings)
    // Meta flags empty fbc as "received but empty" which hurts EMQ score
    // Also validate fbc age — Meta rejects ClickIDs older than 90 days
    if (fbc && typeof fbc === 'string' && fbc.startsWith('fb.')) {
      const fbcParts = fbc.split('.');
      if (fbcParts.length >= 3) {
        const fbcTimestamp = parseInt(fbcParts[2], 10);
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
        if (!isNaN(fbcTimestamp) && (Date.now() - fbcTimestamp) < ninetyDaysMs) {
          userData.fbc = fbc;
        } else {
          console.log(`[facebook-capi] Skipping expired fbc (age > 90 days): ${fbc}`);
        }
      }
    }
    if (fbp && typeof fbp === 'string' && fbp.startsWith('fb.')) userData.fbp = fbp;

    // === GEO from Cloudflare Worker (window.cfGeo) ===
    // Hash ct/st/zp/country with SHA-256 lowercase per Meta CAPI spec.
    // Fallback country: 'br' (BR is the primary market) when geo is missing.
    const geoCity: string | undefined = geo?.city;
    const geoState: string | undefined = geo?.state;
    const geoZip: string | undefined = geo?.zip;
    const geoCountry: string = (geo?.country || 'BR').toLowerCase();

    if (geoCity) {
      const normalizedCity = geoCity.trim().toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
      if (normalizedCity) (userData as any).ct = [await hashSHA256(normalizedCity)];
    }
    if (geoState) {
      const normalizedState = geoState.trim().toLowerCase().replace(/\s+/g, '');
      if (normalizedState) (userData as any).st = [await hashSHA256(normalizedState)];
    }
    if (geoZip) {
      const normalizedZip = geoZip.replace(/\D/g, '');
      if (normalizedZip) (userData as any).zp = [await hashSHA256(normalizedZip)];
    }
    (userData as any).country = [await hashSHA256(geoCountry)];

    // Build external_id array: CPF (primary) + visitor_id (session continuity)
    const externalIds: string[] = [];
    if (customer?.cpf) {
      externalIds.push(await hashSHA256(customer.cpf.replace(/\D/g, '')));
    }
    if (visitor_id) {
      externalIds.push(await hashSHA256(visitor_id));
    }
    if (externalIds.length > 0) {
      userData.external_id = externalIds;
    }

    if (customer?.email) {
      userData.em = [await hashSHA256(customer.email)];
    }
    if (customer?.phone) {
      const phone = customer.phone.replace(/\D/g, '');
      // Dynamic country prefix — only force 55 when visitor country is BR
      const withCountry = phone.startsWith('55') || geoCountry !== 'br' ? phone : `55${phone}`;
      const formatted = `+${withCountry}`;
      userData.ph = [await hashSHA256(formatted)];
    }
    if (customer?.name) {
      const parts = customer.name.trim().toLowerCase().split(' ');
      userData.fn = [await hashSHA256(parts[0])];
      if (parts.length > 1) {
        userData.ln = [await hashSHA256(parts.slice(1).join(' '))];
      }
    }

    const event: CAPIEvent = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_id || `${event_name}_${Date.now()}`,
      event_source_url: event_source_url || '',
      action_source: 'website',
      user_data: userData,
    };

    // Always include custom_data with BRL currency as default
    if (custom_data) {
      event.custom_data = {
        ...custom_data,
        // CRITICAL: Force BRL — Meta defaults to USD if omitted
        currency: custom_data.currency || 'BRL',
      };
      // Ensure value is a number if present
      if (event.custom_data.value !== undefined) {
        event.custom_data.value = Number(event.custom_data.value);
      }
    } else {
      event.custom_data = { currency: 'BRL' };
    }

    const results: any[] = [];

    // Send to each pixel that has a CAPI token
    for (const pixel of pixels) {
      if (!pixel.capi_token) continue;

      // Respect fire_on_pix / fire_on_boleto flags (skip only if explicitly false)
      if (payment_method === 'pix' && pixel.fire_on_pix === false) {
        console.log(`[facebook-capi] Skipping pixel ${pixel.pixel_id} — fire_on_pix disabled`);
        continue;
      }
      if (payment_method === 'boleto' && pixel.fire_on_boleto === false) {
        console.log(`[facebook-capi] Skipping pixel ${pixel.pixel_id} — fire_on_boleto disabled`);
        continue;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `https://graph.facebook.com/v22.0/${pixel.pixel_id}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: [event],
              access_token: pixel.capi_token,
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        const data = await response.json();
        console.log(`[facebook-capi] Pixel ${pixel.pixel_id}:`, JSON.stringify(data));
        results.push({ pixel_id: pixel.pixel_id, success: response.ok, data });
      } catch (err) {
        console.error(`[facebook-capi] Pixel ${pixel.pixel_id} error:`, err);
        results.push({ pixel_id: pixel.pixel_id, success: false, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[facebook-capi] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
