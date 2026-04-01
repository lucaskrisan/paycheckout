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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apikey = req.headers.get("apikey");
    const expectedKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!apikey || apikey !== expectedKey) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const event = body?.event;

    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const instanceName = body?.instance ?? body?.data?.instance?.instanceName ?? body?.data?.instanceName;
      const state = body?.data?.state ?? body?.state;

      if (instanceName && state) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const mappedStatus = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
        const updateData: Record<string, string | null> = {
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        };

        if (state === "open") {
          updateData.connected_at = new Date().toISOString();

          const ownerJid = body?.data?.ownerJid ?? body?.data?.instance?.ownerJid ?? null;
          if (typeof ownerJid === "string" && ownerJid) {
            updateData.phone_number = ownerJid.replace("@s.whatsapp.net", "");
          }
        }

        if (mappedStatus === "disconnected") {
          updateData.connected_at = null;
          updateData.phone_number = null;
        }

        await serviceClient.from("whatsapp_sessions").update(updateData).eq("instance_id", instanceName);
      }
    }

    return json({ received: true });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return json({ received: true });
  }
});