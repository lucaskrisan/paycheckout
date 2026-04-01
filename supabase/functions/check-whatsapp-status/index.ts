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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const instanceId = body?.instance_id;

    if (!instanceId || typeof instanceId !== "string") {
      return new Response(JSON.stringify({ error: "instance_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    const stateRes = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceId}`,
      { headers: { apikey: EVOLUTION_API_KEY } }
    );

    const stateData = await stateRes.json();
    const state = stateData?.instance?.state || "close";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let phoneNumber: string | null = null;

    if (state === "open") {
      try {
        const instancesRes = await fetch(
          `${EVOLUTION_API_URL}/instance/fetchInstances`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );
        const instances = await instancesRes.json();
        const mine = Array.isArray(instances)
          ? instances.find((i: any) => i.instance?.instanceName === instanceId)
          : null;
        const ownerJid = mine?.instance?.ownerJid || "";
        phoneNumber = ownerJid.replace("@s.whatsapp.net", "");
      } catch (e) {
        console.error("Error fetching instances:", e);
      }

      await serviceClient
        .from("whatsapp_sessions")
        .update({
          status: "connected",
          connected_at: new Date().toISOString(),
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("instance_id", instanceId);
    } else {
      const mappedStatus = state === "connecting" ? "connecting" : "disconnected";
      await serviceClient
        .from("whatsapp_sessions")
        .update({
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("instance_id", instanceId);
    }

    return new Response(
      JSON.stringify({ state, phone_number: phoneNumber }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-whatsapp-status error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
