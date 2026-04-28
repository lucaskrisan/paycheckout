
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const trackingScript = `
(function() {
  const PARAMS_TO_TRACK = ['_abt', '_abv', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'fbclid', '_fbp', '_fbc'];
  const STORAGE_KEY = 'panttera_tracking_v2';
  
  // 1. Capture and Persist
  function captureParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    let hasNew = false;

    PARAMS_TO_TRACK.forEach(key => {
      const val = urlParams.get(key);
      if (val) {
        stored[key] = val;
        hasNew = true;
      }
    });

    if (hasNew) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    return stored;
  }

  const currentParams = captureParams();
  
  // 1.1 Support for direct traffic (not coming through ab-redirect)
  // If we have no _abt/_abv in URL/Storage, we check if this page belongs to an active test
  if (!currentParams['_abt']) {
    // This is a bit heavy for every page load, so we only do it if the user isn't already in a test
    // But since this is client-side, we'll let the server handle the "auto-assignment" logic
  }

  // 2. Link & Form Injection
  function decorateUrl(urlStr) {
    try {
      if (!urlStr || urlStr.startsWith('javascript:') || urlStr.startsWith('#')) return urlStr;
      const url = new URL(urlStr, window.location.href);
      
      // Only decorate links that point to our infrastructure or are relative
      const isInternal = url.hostname.includes('panttera.com') || 
                        url.hostname.includes('paolasemfiltro.com') ||
                        url.hostname === window.location.hostname;
      
      if (!isInternal) return urlStr;

      Object.entries(currentParams).forEach(([key, val]) => {
        if (val) url.searchParams.set(key, val);
      });
      return url.toString();
    } catch (e) { return urlStr; }
  }

  function injectTracking() {
    // Decorate Links
    document.querySelectorAll('a').forEach(a => {
      if (a.href) a.href = decorateUrl(a.href);
    });

    // Decorate Forms
    document.querySelectorAll('form').forEach(form => {
      Object.entries(currentParams).forEach(([key, val]) => {
        if (val && !form.querySelector('input[name="' + key + '"]')) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = val;
          form.appendChild(input);
        }
      });
    });
  }

  // 3. API Tracking
  const baseUrl = 'https://vipltojtcrqatwvzobro.supabase.co/functions/v1/ab-tracking';
  
  function trackEvent(event, metadata = {}) {
    const slug = currentParams['_abt'];
    const vid = currentParams['_abv'];
    if (!slug || !vid) return;

    fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: event,
        slug: slug,
        visitorId: vid,
        url: window.location.href,
        metadata: {
          ...currentParams,
          ...metadata
        }
      })
    }).catch(() => {});
  }

  // Auto-track impression on load
  if (currentParams['_abt'] && currentParams['_abv']) {
    trackEvent('impression');
  }

  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTracking);
  } else {
    injectTracking();
  }

  // Mutation observer for dynamic content
  const observer = new MutationObserver(() => injectTracking());
  observer.observe(document.body, { childList: true, subtree: true });

  window.Panttera = {
    track: trackEvent,
    getParams: () => ({ ...currentParams }),
    refresh: () => injectTracking()
  };
})();
`;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // Serve JS script
  if (req.method === "GET") {
    return new Response(trackingScript, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Handle event logging
  if (req.method === "POST") {
    try {
      const { event, slug, visitorId, metadata } = await req.json();
      
      if (!slug || !visitorId) {
        return new Response("Missing slug or visitorId", { status: 400, headers: corsHeaders });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Find test and assignment to get the current variant
      const { data: test } = await supabase
        .from("ab_tests")
        .select("id")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (!test) return new Response("Test not found or inactive", { status: 404, headers: corsHeaders });

      const { data: variantData, error: variantErr } = await supabase
        .from("ab_test_assignments")
        .select(`
          variant_id,
          variant:ab_test_variants(
            id,
            mirror_pixel_id,
            mirror_pixel:mirror_pixels(
              id,
              pixel_id,
              capi_token
            )
          )
        `)
        .eq("test_id", test.id)
        .eq("visitor_id", visitorId)
        .maybeSingle();

      if (variantErr || !variantData) {
        return new Response("No assignment found", { status: 404, headers: corsHeaders });
      }

      const variant = (variantData as any).variant;
      const variantId = variantData.variant_id;
      const mirrorPixel = variant?.mirror_pixel;

      // Record event in DB
      const eventType = event === "impression" ? "impression" : (event === "click" ? "click" : "sale");
      
      const { error: eventErr } = await supabase.from("ab_test_events").insert({
        test_id: test.id,
        variant_id: variantId,
        visitor_id: visitorId,
        event_type: eventType,
        metadata: metadata || {}
      });

      if (eventErr) throw eventErr;

      // Update aggregate counters
      const updateField = eventType === "impression" ? "impressions" : (eventType === "click" ? "clicks" : "sales");
      await supabase.rpc('increment_ab_variant_stat', {
        p_variant_id: variantId,
        p_field: updateField
      });

      // --- Meta CAPI Mirroring ---
      // If the variant has a Mirror Pixel configured with a CAPI token, 
      // we forward the event to Meta CAPI server-to-server.
      if (mirrorPixel && mirrorPixel.capi_token && mirrorPixel.pixel_id) {
        console.log(`[ab-tracking] Mirroring ${event} to Meta CAPI for pixel ${mirrorPixel.pixel_id}`);
        
        // Map A/B events to standard Meta events
        let metaEventName = 'PageView';
        if (event === 'impression') metaEventName = 'PageView';
        if (event === 'click') metaEventName = 'Lead';
        if (event === 'sale') metaEventName = 'Purchase';

        // Use our existing facebook-capi edge function to handle the heavy lifting
        // This ensures the same high-quality data hashing and formatting.
        try {
          const productId = metadata?.product_id;
          
          if (productId) {
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-capi`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
              },
              body: JSON.stringify({
                product_id: productId,
                event_name: metaEventName,
                event_id: `ab_${variantId}_${Date.now()}`,
                visitor_id: visitorId,
                client_ip: req.headers.get("cf-connecting-ip") || undefined,
                user_agent: req.headers.get("user-agent") || undefined,
                custom_data: {
                  ...metadata,
                  ab_test_id: test.id,
                  ab_variant_id: variantId
                }
              })
            }).catch(e => console.error("[ab-tracking] CAPI forward failed:", e));
          } else {
            const metaUrl = `https://graph.facebook.com/v22.0/${mirrorPixel.pixel_id}/events`;
            fetch(metaUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: [{
                  event_name: metaEventName,
                  event_time: Math.floor(Date.now() / 1000),
                  action_source: 'website',
                  user_data: {
                    external_id: visitorId,
                    client_ip_address: req.headers.get("cf-connecting-ip") || undefined,
                    client_user_agent: req.headers.get("user-agent") || undefined,
                  },
                  custom_data: {
                    ab_test_id: test.id,
                    ab_variant_id: variantId
                  }
                }],
                access_token: mirrorPixel.capi_token
              })
            }).catch(e => console.error("[ab-tracking] Direct Meta CAPI failed:", e));
          }
        } catch (capiErr) {
          console.error("[ab-tracking] CAPI mirroring fatal error:", capiErr);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Error processing tracking event:", err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
});
