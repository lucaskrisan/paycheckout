import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * whatsapp-abandon-cron
 *
 * Called by pg_cron every 15 minutes.
 * Finds abandoned carts older than 30 min with a phone number and
 * dispatches a WhatsApp message via whatsapp-dispatch.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find abandoned carts from the last 24h that:
    // - Have a phone number
    // - Are not recovered
    // - Were created between 30min and 24h ago
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: carts, error: cartError } = await supabase
      .from("abandoned_carts")
      .select("id, customer_phone, customer_name, product_id, user_id")
      .eq("recovered", false)
      .not("customer_phone", "is", null)
      .lt("created_at", thirtyMinAgo)
      .gt("created_at", twentyFourHAgo)
      .limit(50);

    if (cartError) {
      console.error("Error fetching carts:", cartError);
      return json({ error: "Failed to fetch carts" }, 500);
    }

    if (!carts || carts.length === 0) {
      return json({ processed: 0, reason: "no_carts" });
    }

    // Check which carts already had a message sent (avoid duplicates)
    const cartIds = carts.map((c) => c.id);
    const { data: alreadySent } = await supabase
      .from("whatsapp_send_log")
      .select("order_id")
      .eq("template_category", "abandono")
      .in("order_id", cartIds);

    const sentSet = new Set((alreadySent || []).map((s) => s.order_id));
    const pendingCarts = carts.filter((c) => !sentSet.has(c.id));

    let dispatched = 0;

    for (const cart of pendingCarts) {
      if (!cart.user_id) continue;

      // Get product info
      const { data: product } = await supabase
        .from("products")
        .select("name, price")
        .eq("id", cart.product_id)
        .maybeSingle();

      try {
        await supabase.functions.invoke("whatsapp-dispatch", {
          body: {
            tenant_id: cart.user_id,
            order_id: cart.id,
            customer_phone: cart.customer_phone,
            customer_name: cart.customer_name || "Cliente",
            product_name: product?.name || "",
            product_price: product?.price?.toString() || "",
            category: "abandono",
          },
        });
        dispatched++;
      } catch (err) {
        console.error("Dispatch error for cart:", cart.id, err);
      }
    }

    return json({ processed: pendingCarts.length, dispatched });
  } catch (err) {
    console.error("whatsapp-abandon-cron error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
