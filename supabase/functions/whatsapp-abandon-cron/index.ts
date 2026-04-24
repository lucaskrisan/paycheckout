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

const MAX_ATTEMPTS_PER_CART = 2;
const RETRY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * whatsapp-abandon-cron
 *
 * Runs every 15 min. For each abandoned cart:
 *   - Skip if already recovered (paid).
 *   - Skip if already attempted MAX_ATTEMPTS_PER_CART times (sent OR failed).
 *   - Skip if last attempt was < 6h ago (cooldown for retries).
 *   - Otherwise: build prefilled checkout link and dispatch WhatsApp.
 *
 * The link sent uses the original `checkout_url` + customer prefill query params,
 * so the customer lands in the checkout with name/email/phone/cpf already filled
 * and just clicks "Pagar com Pix" to regenerate the QR.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Pull candidate carts (15min .. 24h old, has phone, not recovered)
    const { data: carts, error: cartError } = await supabase
      .from("abandoned_carts")
      .select("id, customer_phone, customer_name, customer_email, customer_cpf, product_id, user_id, checkout_url, page_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
      .eq("recovered", false)
      .not("customer_phone", "is", null)
      .lt("created_at", fifteenMinAgo)
      .gt("created_at", twentyFourHAgo)
      .limit(50);

    if (cartError) {
      console.error("Error fetching carts:", cartError);
      return json({ error: "Failed to fetch carts" }, 500);
    }

    if (!carts || carts.length === 0) {
      return json({ processed: 0, reason: "no_carts" });
    }

    // Fetch all attempt logs for these carts in one shot (sent + failed)
    const cartIds = carts.map((c) => c.id);
    const { data: logs } = await supabase
      .from("whatsapp_send_log")
      .select("order_id, customer_phone, status, created_at")
      .eq("template_category", "abandono")
      .in("status", ["sent", "failed"])
      .in("order_id", cartIds);

    // Index attempts by cart id and by phone+product
    const attemptsByCart = new Map<string, { count: number; lastAt: number }>();
    const attemptsByPhoneProduct = new Map<string, { count: number; lastAt: number }>();

    for (const log of logs || []) {
      const ts = log.created_at ? new Date(log.created_at).getTime() : 0;
      if (log.order_id) {
        const cur = attemptsByCart.get(log.order_id) || { count: 0, lastAt: 0 };
        cur.count++;
        cur.lastAt = Math.max(cur.lastAt, ts);
        attemptsByCart.set(log.order_id, cur);
      }
      if (log.customer_phone) {
        const cart = carts.find((c) => c.id === log.order_id);
        if (cart) {
          const key = `${log.customer_phone}::${cart.product_id}`;
          const cur = attemptsByPhoneProduct.get(key) || { count: 0, lastAt: 0 };
          cur.count++;
          cur.lastAt = Math.max(cur.lastAt, ts);
          attemptsByPhoneProduct.set(key, cur);
        }
      }
    }

    const now = Date.now();
    let dispatched = 0;
    let skippedRecovered = 0;
    let skippedMaxAttempts = 0;
    let skippedCooldown = 0;

    for (const cart of carts) {
      if (!cart.user_id) continue;

      // Dedup by cart id
      const cartAttempts = attemptsByCart.get(cart.id);
      const phoneKey = `${cart.customer_phone}::${cart.product_id}`;
      const phoneAttempts = attemptsByPhoneProduct.get(phoneKey);

      const totalAttempts = Math.max(
        cartAttempts?.count || 0,
        phoneAttempts?.count || 0,
      );
      const lastAt = Math.max(
        cartAttempts?.lastAt || 0,
        phoneAttempts?.lastAt || 0,
      );

      if (totalAttempts >= MAX_ATTEMPTS_PER_CART) {
        skippedMaxAttempts++;
        continue;
      }

      if (lastAt > 0 && now - lastAt < RETRY_COOLDOWN_MS) {
        skippedCooldown++;
        continue;
      }

      // Pre-send recovery check
      const { data: freshCart } = await supabase
        .from("abandoned_carts")
        .select("recovered")
        .eq("id", cart.id)
        .maybeSingle();

      if (!freshCart || freshCart.recovered) {
        skippedRecovered++;
        continue;
      }

      const { data: product } = await supabase
        .from("products")
        .select("name, price")
        .eq("id", cart.product_id)
        .maybeSingle();

      // Build recovery link — PII (name/email/phone/cpf) kept server-side via cart_id token
      // Only UTMs and cart_id are exposed in URL to avoid PII in browser history/logs
      const baseUrl = cart.checkout_url || cart.page_url || "";
      let recoveryLink = "";
      if (baseUrl) {
        try {
          const u = new URL(baseUrl);
          // Strip all sensitive and UTM params
          ["name", "email", "phone", "cpf", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
            .forEach((k) => u.searchParams.delete(k));

          // Use cart_id as opaque token — checkout prefills from DB via this ID
          u.searchParams.set("cart_id", cart.id);
          u.searchParams.set("utm_source", "recovery");
          u.searchParams.set("utm_medium", "whatsapp");
          u.searchParams.set("utm_campaign", "abandoned_cart");
          if (cart.utm_content) u.searchParams.set("utm_content", cart.utm_content);
          if (cart.utm_term) u.searchParams.set("utm_term", cart.utm_term);

          recoveryLink = u.toString();
        } catch (e) {
          console.warn(`[wa-cron] Invalid URL for cart ${cart.id}: ${baseUrl}`);
          recoveryLink = baseUrl;
        }
      }

      try {
        await supabase.functions.invoke("whatsapp-dispatch", {
          body: {
            tenant_id: cart.user_id,
            order_id: cart.id,
            customer_phone: cart.customer_phone,
            customer_name: cart.customer_name || "Cliente",
            product_name: product?.name || "",
            product_price: product?.price?.toString() || "",
            access_link: recoveryLink,
            category: "abandono",
          },
        });

        dispatched++;
      } catch (err) {
        console.error("Dispatch error for cart:", cart.id, err);
      }
    }

    console.log(
      `[wa-cron] candidates=${carts.length} dispatched=${dispatched} skipped_recovered=${skippedRecovered} skipped_max=${skippedMaxAttempts} skipped_cooldown=${skippedCooldown}`,
    );

    return json({
      processed: carts.length,
      dispatched,
      skipped_recovered: skippedRecovered,
      skipped_max_attempts: skippedMaxAttempts,
      skipped_cooldown: skippedCooldown,
    });
  } catch (err) {
    console.error("whatsapp-abandon-cron error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
