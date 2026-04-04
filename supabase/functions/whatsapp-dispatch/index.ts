import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * whatsapp-dispatch
 *
 * Called internally (service_role) by payment webhooks.
 * 1. Checks if the feature flag for the category is enabled for the tenant.
 * 2. Finds active templates matching the category (supports multiple).
 * 3. Resolves variables ({nome}, {produto}, {valor}, {link}, {telefone}).
 * 4. Calls send-whatsapp-message.
 * 5. Logs the result in whatsapp_send_log.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid body" }, 400);
    }

    const {
      tenant_id,
      order_id,
      customer_phone,
      customer_name,
      product_name,
      product_price,
      access_link,
      category,
    } = body as Record<string, string | undefined>;

    if (!tenant_id || !category) {
      return json({ error: "tenant_id and category are required" }, 400);
    }

    if (!customer_phone) {
      return json({ skipped: true, reason: "no_phone" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check feature flag
    const { data: flag } = await supabase
      .from("whatsapp_feature_flags")
      .select("enabled")
      .eq("tenant_id", tenant_id)
      .eq("feature", category)
      .maybeSingle();

    if (!flag?.enabled) {
      return json({ skipped: true, reason: "feature_disabled" });
    }

    // 2. Check if tenant has WhatsApp connected
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("instance_id, status")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!session?.instance_id || session.status !== "connected") {
      return json({ skipped: true, reason: "whatsapp_not_connected" });
    }

    // 3. Find active templates for this category (supports multiple — pick random)
    const { data: templates } = await supabase
      .from("whatsapp_templates")
      .select("body")
      .eq("user_id", tenant_id)
      .eq("category", category)
      .eq("active", true)
      .order("updated_at", { ascending: false });

    if (!templates || templates.length === 0) {
      return json({ skipped: true, reason: "no_template" });
    }

    // Pick a random template if multiple exist
    const template = templates.length === 1
      ? templates[0]
      : templates[Math.floor(Math.random() * templates.length)];

    if (!template?.body) {
      return json({ skipped: true, reason: "no_template" });
    }

    // 4. Resolve variables
    const priceFormatted = product_price
      ? `R$ ${Number(product_price).toFixed(2).replace(".", ",")}`
      : "";

    const message = template.body
      .replace(/\{nome\}/gi, customer_name || "Cliente")
      .replace(/\{produto\}/gi, product_name || "")
      .replace(/\{valor\}/gi, priceFormatted)
      .replace(/\{link\}/gi, access_link || "")
      .replace(/\{telefone\}/gi, customer_phone || "");

    // 5. Send via Evolution API
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    let cleanNumber = customer_phone.replace(/\D/g, "");
    if (!cleanNumber.startsWith("55")) {
      cleanNumber = `55${cleanNumber}`;
    }

    let sendStatus = "sent";
    let errorMessage: string | null = null;

    try {
      const sendRes = await fetch(
        `${EVOLUTION_API_URL}/message/sendText/${session.instance_id}`,
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

      if (!sendRes.ok) {
        const errBody = await sendRes.text().catch(() => "");
        sendStatus = "failed";
        errorMessage = `HTTP ${sendRes.status}: ${errBody.slice(0, 200)}`;
      }
    } catch (err) {
      sendStatus = "failed";
      errorMessage = err instanceof Error ? err.message : "Unknown send error";
    }

    // 6. Log
    await supabase.from("whatsapp_send_log").insert({
      tenant_id,
      order_id: order_id || null,
      customer_phone,
      template_category: category,
      message_body: message,
      status: sendStatus,
      error_message: errorMessage,
    });

    return json({ success: sendStatus === "sent", status: sendStatus });
  } catch (err) {
    console.error("whatsapp-dispatch error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
