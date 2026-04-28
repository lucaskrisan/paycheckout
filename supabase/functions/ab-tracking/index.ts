
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const trackingScript = `
(function() {
  const params = new URLSearchParams(window.location.search);
  const testSlug = params.get('_abt');
  const visitorId = params.get('_abv');
  const baseUrl = 'https://vipltojtcrqatwvzobro.supabase.co/functions/v1/ab-tracking';

  if (testSlug && visitorId) {
    localStorage.setItem('panttera_abt', testSlug);
    localStorage.setItem('panttera_abv', visitorId);
    
    // Automatically track impression if we just landed from a redirect
    fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'impression',
        slug: testSlug,
        visitorId: visitorId,
        url: window.location.href
      })
    }).catch(() => {});
  }

  window.Panttera = {
    track: function(event, metadata = {}) {
      const slug = localStorage.getItem('panttera_abt');
      const vid = localStorage.getItem('panttera_abv');
      if (!slug || !vid) return;

      fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: event,
          slug: slug,
          visitorId: vid,
          url: window.location.href,
          metadata: metadata
        })
      }).catch(() => {});
    }
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

      // Find test and variant
      const { data: test } = await supabase
        .from("ab_tests")
        .select("id")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (!test) return new Response("Test not found or inactive", { status: 404, headers: corsHeaders });

      const { data: assignment } = await supabase
        .from("ab_test_assignments")
        .select("variant_id")
        .eq("test_id", test.id)
        .eq("visitor_id", visitorId)
        .maybeSingle();

      if (!assignment) return new Response("No assignment found", { status: 404, headers: corsHeaders });

      // Record event
      const eventType = event === "impression" ? "impression" : (event === "click" ? "click" : "sale");
      
      const { error: eventErr } = await supabase.from("ab_test_events").insert({
        test_id: test.id,
        variant_id: assignment.variant_id,
        visitor_id: visitorId,
        event_type: eventType,
        metadata: metadata || {}
      });

      if (eventErr) throw eventErr;

      // Update aggregate counters
      const updateField = eventType === "impression" ? "impressions" : (eventType === "click" ? "clicks" : "sales");
      await supabase.rpc('increment_ab_variant_stat', {
        p_variant_id: assignment.variant_id,
        p_field: updateField
      });

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
