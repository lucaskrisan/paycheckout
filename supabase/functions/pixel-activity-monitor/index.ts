// Edge function: pixel-activity-monitor
// Cron a cada 30min — atualiza last_event_at de cada pixel com base nos eventos recentes
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Use an aggregate query to update all pixels in a single efficient operation
  const { data: recentEvents, error: queryErr } = await supabase.rpc('get_latest_pixel_events_per_product');

  if (queryErr) {
    console.error('[pixel-monitor] RPC error:', queryErr);
    return new Response(JSON.stringify({ error: queryErr.message }), { status: 500, headers: corsHeaders });
  }

  let updated = 0;
  for (const row of recentEvents || []) {
    const { error: updErr } = await supabase
      .from('product_pixels')
      .update({ last_event_at: row.latest_event })
      .eq('product_id', row.product_id);
    
    if (!updErr) updated++;
  }

  return new Response(
    JSON.stringify({ checked: (recentEvents ?? []).length, updated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  return new Response(
    JSON.stringify({ checked: (pixels ?? []).length, updated, stale }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
