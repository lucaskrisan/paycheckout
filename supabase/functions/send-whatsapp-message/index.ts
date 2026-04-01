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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Token inválido" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json({ error: "Corpo da requisição inválido" }, 400);
    }

    const toNumberInput = typeof body.to_number === "string" ? body.to_number : String(body.to_number ?? "");
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const pendingSendId = typeof body.pending_send_id === "string" ? body.pending_send_id : null;

    if (!toNumberInput || !message) {
      return json({ error: "to_number e message são obrigatórios" }, 400);
    }

    let cleanNumber = toNumberInput.replace(/\D/g, "");
    if (!cleanNumber.startsWith("55")) {
      cleanNumber = `55${cleanNumber}`;
    }

    if (cleanNumber.length < 12 || cleanNumber.length > 15) {
      return json({ error: "Número de destino inválido" }, 400);
    }

    if (message.length > 4096) {
      return json({ error: "Mensagem muito longa" }, 400);
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sessionRow, error: sessionError } = await serviceClient
      .from("whatsapp_sessions")
      .select("instance_id, status")
      .eq("tenant_id", userId)
      .maybeSingle();

    if (sessionError) throw sessionError;

    if (!sessionRow?.instance_id) {
      return json({ error: "WhatsApp não conectado" }, 404);
    }

    if (sessionRow.status !== "connected") {
      return json({ error: "WhatsApp ainda não está conectado" }, 409);
    }

    const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${sessionRow.instance_id}`, {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: `${cleanNumber}@s.whatsapp.net`,
        text: message,
      }),
    });

    const sendData = await readResponseBody(sendRes);

    if (sendRes.ok) {
      if (pendingSendId) {
        await serviceClient
          .from("pending_sends")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", pendingSendId)
          .eq("tenant_id", userId);
      }

      return json({ success: true });
    }

    console.error("send-whatsapp-message error:", sendData);

    if (pendingSendId) {
      await serviceClient
        .from("pending_sends")
        .update({ status: "failed" })
        .eq("id", pendingSendId)
        .eq("tenant_id", userId);
    }

    if (sendRes.status === 401 || sendRes.status === 403) {
      return json(
        {
          error: "Falha na autenticação com a Evolution API",
          details:
            "A chave configurada no backend não coincide com AUTHENTICATION_API_KEY da sua Evolution API.",
        },
        502
      );
    }

    return json({ success: false, error: "Falha ao enviar mensagem", details: extractErrorMessage(sendData) }, 500);
  } catch (err) {
    console.error("send-whatsapp-message error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});