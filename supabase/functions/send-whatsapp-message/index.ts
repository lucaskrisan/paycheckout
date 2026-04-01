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
    const { instance_id, to_number, message, pending_send_id } = body;

    if (!instance_id || !to_number || !message) {
      return new Response(
        JSON.stringify({ error: "instance_id, to_number e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize number
    let cleanNumber = String(to_number).replace(/\D/g, "");
    if (!cleanNumber.startsWith("55")) {
      cleanNumber = "55" + cleanNumber;
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    const sendRes = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instance_id}`,
      {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: `${cleanNumber}@s.whatsapp.net`,
          text: message,
        }),
      }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (sendRes.ok) {
      if (pending_send_id) {
        await serviceClient
          .from("pending_sends")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", pending_send_id);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errData = await sendRes.json().catch(() => ({}));
      console.error("send-whatsapp-message error:", errData);
      if (pending_send_id) {
        await serviceClient
          .from("pending_sends")
          .update({ status: "failed" })
          .eq("id", pending_send_id);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao enviar mensagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("send-whatsapp-message error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
