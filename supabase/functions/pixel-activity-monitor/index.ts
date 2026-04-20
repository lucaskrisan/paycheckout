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

  // Para cada pixel, busca o evento mais recente e atualiza last_event_at
  const { data: pixels } = await supabase
    .from("product_pixels")
    .select("id, product_id");

  let updated = 0;
  let stale = 0;

  for (const p of pixels ?? []) {
    const { data: ev } = await supabase
      .from("pixel_events")
      .select("created_at")
      .eq("product_id", p.product_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ev?.created_at) {
      await supabase
        .from("product_pixels")
        .update({ last_event_at: ev.created_at })
        .eq("id", p.id);
      updated++;

      const ageMin = (Date.now() - new Date(ev.created_at).getTime()) / 60000;
      if (ageMin > 60) stale++;
    }
  }

  return new Response(
    JSON.stringify({ checked: (pixels ?? []).length, updated, stale }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
