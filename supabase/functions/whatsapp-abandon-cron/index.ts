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
 * Finds abandoned carts older than 30 min with a phone number and
 * dispatches a WhatsApp message via whatsapp-dispatch.
 * 
 * Features:
 * - Cross-channel deduplication (skips if email already sent for same customer+product)
 * - Logs all dispatches to email_logs for admin visibility
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find abandoned carts from the last 24h that:
    // - Have a phone number
    // - Are not recovered
    // - Were created between 30min and 24h ago
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: carts, error: cartError } = await supabase
      .from("abandoned_carts")
      .select("id, customer_phone, customer_name, customer_email, product_id, user_id, email_recovery_status")
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

    // Cross-channel deduplication: build set of customer_email::product_id that already got email
    const emailSentSet = new Set<string>();
    const cartsWithEmail = carts.filter(c => c.customer_email && c.email_recovery_status === "sent");
    for (const c of cartsWithEmail) {
      emailSentSet.add(`${c.customer_email}::${c.product_id}`);
    }

    // Deduplication: check which carts already had a WhatsApp message sent
    // Use email_logs with source = 'whatsapp_abandon_cron' as our log
    const cartIds = carts.map((c) => c.id);
    const { data: alreadySent } = await supabase
      .from("email_logs")
      .select("metadata")
      .eq("source", "whatsapp_abandon_cron")
      .in("product_id", carts.map(c => c.product_id));

    const sentCartIds = new Set<string>();
    for (const log of alreadySent || []) {
      const cartId = (log.metadata as any)?.cart_id;
      if (cartId) sentCartIds.add(cartId);
    }

    // Also deduplicate by phone+product to avoid multiple messages
    const phoneProductSent = new Set<string>();
    const { data: phoneLogs } = await supabase
      .from("email_logs")
      .select("to_email, product_id")
      .eq("source", "whatsapp_abandon_cron");

    for (const log of phoneLogs || []) {
      if (log.to_email && log.product_id) {
        phoneProductSent.add(`${log.to_email}::${log.product_id}`);
      }
    }

    const pendingCarts = carts.filter((c) => {
      // Skip if already sent WhatsApp for this cart
      if (sentCartIds.has(c.id)) return false;
      // Skip if already sent WhatsApp to this phone+product
      if (phoneProductSent.has(`${c.customer_phone}::${c.product_id}`)) return false;
      return true;
    });

    let dispatched = 0;
    let skippedCrossChannel = 0;

    for (const cart of pendingCarts) {
      if (!cart.user_id) continue;

      // Cross-channel check: if email already sent to this customer for this product, skip WhatsApp
      if (cart.customer_email && emailSentSet.has(`${cart.customer_email}::${cart.product_id}`)) {
        skippedCrossChannel++;
        continue;
      }

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

        // Log the dispatch for admin visibility
        try {
          await supabase.from("email_logs").insert({
            user_id: cart.user_id,
            to_email: cart.customer_phone,
            to_name: cart.customer_name || null,
            subject: `WhatsApp: Carrinho abandonado - ${product?.name || "Produto"}`,
            email_type: "transactional",
            status: "sent",
            source: "whatsapp_abandon_cron",
            product_id: cart.product_id,
            cost_estimate: 0,
            metadata: { cart_id: cart.id, channel: "whatsapp" },
          });
        } catch (logErr) {
          console.error(`[wa-cron] Failed to log dispatch for cart ${cart.id}:`, logErr);
        }

        // Add to dedup set for this batch
        phoneProductSent.add(`${cart.customer_phone}::${cart.product_id}`);

        dispatched++;
      } catch (err) {
        console.error("Dispatch error for cart:", cart.id, err);
      }
    }

    console.log(`[wa-cron] Processed ${pendingCarts.length}, dispatched ${dispatched}, skipped cross-channel ${skippedCrossChannel}`);

    return json({ processed: pendingCarts.length, dispatched, skipped_cross_channel: skippedCrossChannel });
  } catch (err) {
    console.error("whatsapp-abandon-cron error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
