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
 * whatsapp-abandon-cron
 *
 * Called by pg_cron every 15 minutes.
 * Two modes:
 * 1. Standard: Finds abandoned carts older than 30 min with a phone and no email sent
 * 2. Fallback: If email was sent 2h+ ago and NOT opened, tries WhatsApp as 2nd channel
 *
 * FIX v2: Dedup now checks whatsapp_send_log (not email_logs).
 *         Pre-send recovery check prevents messaging paid customers.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // ── MODE 1: Standard — carts with phone, no email sent yet ──
    const { data: standardCarts, error: cartError } = await supabase
      .from("abandoned_carts")
      .select("id, customer_phone, customer_name, customer_email, product_id, user_id, email_recovery_status, email_recovery_sent_at")
      .eq("recovered", false)
      .not("customer_phone", "is", null)
      .is("email_recovery_sent_at", null)
      .lt("created_at", thirtyMinAgo)
      .gt("created_at", twentyFourHAgo)
      .limit(30);

    if (cartError) {
      console.error("Error fetching standard carts:", cartError);
      return json({ error: "Failed to fetch carts" }, 500);
    }

    // ── MODE 2: Fallback — email sent 2h+ ago, not opened, has phone ──
    const { data: fallbackCarts, error: fallbackError } = await supabase
      .from("abandoned_carts")
      .select("id, customer_phone, customer_name, customer_email, product_id, user_id, email_recovery_status, email_recovery_sent_at")
      .eq("recovered", false)
      .not("customer_phone", "is", null)
      .eq("email_recovery_status", "sent")
      .lt("email_recovery_sent_at", twoHoursAgo)
      .gt("created_at", twentyFourHAgo)
      .limit(20);

    if (fallbackError) {
      console.error("Error fetching fallback carts:", fallbackError);
    }

    // Check which fallback emails were NOT opened (no opened_at in email_logs)
    const eligibleFallbacks: any[] = [];
    for (const cart of fallbackCarts || []) {
      if (!cart.customer_email) continue;
      const { data: emailLog } = await supabase
        .from("email_logs")
        .select("opened_at")
        .eq("to_email", cart.customer_email)
        .eq("product_id", cart.product_id)
        .in("source", ["abandoned_cart_cron", "abandoned_cart_cron_2nd"])
        .not("opened_at", "is", null)
        .limit(1);

      // If email was opened, skip — recovery via email is working
      if (emailLog && emailLog.length > 0) continue;
      eligibleFallbacks.push(cart);
    }

    const allCarts = [...(standardCarts || []), ...eligibleFallbacks];

    if (allCarts.length === 0) {
      return json({ processed: 0, reason: "no_carts" });
    }

    // ── FIX: Dedup using whatsapp_send_log (correct table) ──
    const cartIds = allCarts.map((c) => c.id);
    const { data: alreadySent } = await supabase
      .from("whatsapp_send_log")
      .select("order_id, customer_phone")
      .eq("template_category", "abandono")
      .eq("status", "sent")
      .in("order_id", cartIds);

    const sentCartIds = new Set<string>();
    const phoneProductSent = new Set<string>();
    for (const log of alreadySent || []) {
      if (log.order_id) sentCartIds.add(log.order_id);
      if (log.customer_phone) {
        // Also build phone-level dedup from the same query
        const cart = allCarts.find((c) => c.id === log.order_id);
        if (cart) phoneProductSent.add(`${log.customer_phone}::${cart.product_id}`);
      }
    }

    const pendingCarts = allCarts.filter((c) => {
      if (sentCartIds.has(c.id)) return false;
      if (phoneProductSent.has(`${c.customer_phone}::${c.product_id}`)) return false;
      return true;
    });

    let dispatched = 0;
    let fallbackCount = 0;
    let skippedRecovered = 0;
    const fallbackIds = new Set(eligibleFallbacks.map((c) => c.id));

    for (const cart of pendingCarts) {
      if (!cart.user_id) continue;

      // ── FIX: Pre-send recovery check — avoid messaging customers who already paid ──
      const { data: freshCart } = await supabase
        .from("abandoned_carts")
        .select("recovered")
        .eq("id", cart.id)
        .maybeSingle();

      if (!freshCart || freshCart.recovered) {
        skippedRecovered++;
        console.log(`[wa-cron] Skipped cart ${cart.id} — already recovered`);
        continue;
      }

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

        const isFallback = fallbackIds.has(cart.id);
        if (isFallback) fallbackCount++;

        phoneProductSent.add(`${cart.customer_phone}::${cart.product_id}`);
        dispatched++;
      } catch (err) {
        console.error("Dispatch error for cart:", cart.id, err);
      }
    }

    console.log(`[wa-cron] Processed ${pendingCarts.length}, dispatched ${dispatched}, fallback ${fallbackCount}, skipped_recovered ${skippedRecovered}`);

    return json({
      processed: pendingCarts.length,
      dispatched,
      fallback_triggered: fallbackCount,
      skipped_recovered: skippedRecovered,
    });
  } catch (err) {
    console.error("whatsapp-abandon-cron error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
