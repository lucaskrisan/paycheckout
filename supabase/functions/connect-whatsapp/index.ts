import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const readResponseBody = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const extractErrorMessage = (payload: any) => {
  const message = payload?.response?.message ?? payload?.message ?? payload?.error ?? payload;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  return "Erro desconhecido";
};

const cleanupInstance = async (baseUrl: string, apikey: string, instanceId: string) => {
  const requests: Array<{ url: string; init: RequestInit }> = [
    { url: `${baseUrl}/instance/logout/${instanceId}`, init: { method: "DELETE", headers: { apikey } } },
    { url: `${baseUrl}/instance/delete/${instanceId}`, init: { method: "DELETE", headers: { apikey } } },
    { url: `${baseUrl}/instance/delete`, init: { method: "DELETE", headers: { apikey, "Content-Type": "application/json" }, body: JSON.stringify({ instanceName: instanceId }) } },
  ];

  let cleaned = false;
  for (const request of requests) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(request.url, { ...request.init, signal: controller.signal });
      clearTimeout(timeout);
      await readResponseBody(response);
      if (response.ok || response.status === 404) cleaned = true;
    } catch (error) {
      console.warn("cleanup instance failed:", error);
    }
  }
  return cleaned;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // ✅ Use getUser() instead of getClaims()
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      return json({ error: "Token inválido" }, 401);
    }

    const userId = user.id;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const serviceClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingSession, error: sessionError } = await serviceClient
      .from("whatsapp_sessions")
      .select("instance_id")
      .eq("tenant_id", userId)
      .maybeSingle();

    if (sessionError) throw sessionError;

    if (existingSession?.instance_id) {
      await cleanupInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, existingSession.instance_id);
    }

    const instanceId = `pantera_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    // Create instance with 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ instanceName: instanceId, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const evoData = await readResponseBody(evoRes);

    if (!evoRes.ok) {
      console.error("Evolution API error:", evoData);
      if (evoRes.status === 401 || evoRes.status === 403) {
        return json({ error: "Falha na autenticação com a Evolution API", details: "A chave configurada no backend não coincide com AUTHENTICATION_API_KEY da sua Evolution API." }, 502);
      }
      return json({ error: "Falha ao criar instância", details: extractErrorMessage(evoData) }, 500);
    }

    const rawQr = evoData?.qrcode?.base64 ?? evoData?.qrcode ?? evoData?.base64 ?? evoData?.data?.qrcode?.base64 ?? evoData?.data?.qrcode ?? null;
    const qrcode = typeof rawQr === "string" ? rawQr.replace(/\s/g, "") : null;

    if (!qrcode) {
      console.error("Evolution API returned no QR code:", evoData);
      return json({ error: "QR Code não retornado pela Evolution API" }, 502);
    }

    // ✅ Auto-register webhook URL on Evolution API
    const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    try {
      const whController = new AbortController();
      const whTimeout = setTimeout(() => whController.abort(), 10_000);
      await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceId}`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT"],
        }),
        signal: whController.signal,
      });
      clearTimeout(whTimeout);
      console.log(`[connect-whatsapp] Webhook auto-registered: ${webhookUrl}`);
    } catch (whErr) {
      console.warn("[connect-whatsapp] Webhook registration failed (non-blocking):", whErr);
    }

    const { error: upsertError } = await serviceClient.from("whatsapp_sessions").upsert(
      {
        tenant_id: userId,
        instance_id: instanceId,
        node_url: EVOLUTION_API_URL,
        status: "connecting",
        phone_number: null,
        connected_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    );

    if (upsertError) throw upsertError;

    return json({ qrcode, instance_id: instanceId });
  } catch (err) {
    console.error("connect-whatsapp error:", err);
    if (err instanceof DOMException && err.name === "AbortError") {
      return json({ error: "Evolution API não respondeu a tempo (timeout 10s)" }, 504);
    }
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
