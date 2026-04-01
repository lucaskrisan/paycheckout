import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate apikey header
    const apikey = req.headers.get("apikey");
    const expectedKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!apikey || apikey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body?.event;

    if (event === "connection.update") {
      const instanceName = body?.instance;
      const state = body?.data?.state || body?.state;

      if (instanceName && state) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const mappedStatus = state === "open" ? "connected" : "disconnected";

        const updateData: Record<string, any> = {
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        };

        if (state === "open") {
          updateData.connected_at = new Date().toISOString();
        }

        await serviceClient
          .from("whatsapp_sessions")
          .update(updateData)
          .eq("instance_id", instanceName);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
