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

    const userId = claimsData.claims.sub as string;
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const instanceId = `pantera_${suffix}`;

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    // Try to clean up any existing instance for this tenant
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: existing } = await serviceClient
      .from("whatsapp_sessions")
      .select("instance_id")
      .eq("tenant_id", userId)
      .maybeSingle();

    if (existing?.instance_id) {
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/logout/${existing.instance_id}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        }).then(r => r.text());
      } catch (_) {}
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${existing.instance_id}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        }).then(r => r.text());
      } catch (_) {}
    }

    const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName: instanceId,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const evoData = await evoRes.json();

    if (!evoRes.ok) {
      console.error("Evolution API error:", evoData);
      return new Response(
        JSON.stringify({ error: "Falha ao criar instância", details: evoData?.response?.message || "Erro desconhecido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qrcode = evoData?.qrcode?.base64 || null;

    await serviceClient.from("whatsapp_sessions").upsert(
      {
        tenant_id: userId,
        instance_id: instanceId,
        node_url: EVOLUTION_API_URL,
        status: "connecting",
      },
      { onConflict: "tenant_id" }
    );

    return new Response(
      JSON.stringify({ qrcode, instance_id: instanceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("connect-whatsapp error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
