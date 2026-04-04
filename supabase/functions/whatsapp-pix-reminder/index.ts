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
 * whatsapp-pix-reminder
 *
 * Called by pg_cron every 30 minutes.
 * Finds pending PIX orders older than 15 min and
 * dispatches a WhatsApp reminder via whatsapp-dispatch.
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

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    // Find pending PIX orders
    const { data: orders, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, customer_id, product_id, amount")
      .eq("status", "pending")
      .eq("payment_method", "pix")
      .lt("created_at", fifteenMinAgo)
      .gt("created_at", fourHoursAgo)
      .limit(50);

    if (orderError) {
      console.error("Error fetching orders:", orderError);
      return json({ error: "Failed to fetch orders" }, 500);
    }

    if (!orders || orders.length === 0) {
      return json({ processed: 0, reason: "no_pending_pix" });
    }

    // Check which orders already had a reminder sent
    const orderIds = orders.map((o) => o.id);
    const { data: alreadySent } = await supabase
      .from("whatsapp_send_log")
      .select("order_id")
      .eq("template_category", "lembrete_pix")
      .in("order_id", orderIds);

    const sentSet = new Set((alreadySent || []).map((s) => s.order_id));
    const pendingOrders = orders.filter((o) => !sentSet.has(o.id));

    let dispatched = 0;

    for (const order of pendingOrders) {
      if (!order.user_id || !order.customer_id) continue;

      // Get customer info
      const { data: customer } = await supabase
        .from("customers")
        .select("name, phone")
        .eq("id", order.customer_id)
        .maybeSingle();

      if (!customer?.phone) continue;

      // Get product info
      const { data: product } = await supabase
        .from("products")
        .select("name")
        .eq("id", order.product_id)
        .maybeSingle();

      try {
        await supabase.functions.invoke("whatsapp-dispatch", {
          body: {
            tenant_id: order.user_id,
            order_id: order.id,
            customer_phone: customer.phone,
            customer_name: customer.name || "Cliente",
            product_name: product?.name || "",
            product_price: order.amount?.toString() || "",
            category: "lembrete_pix",
          },
        });
        dispatched++;
      } catch (err) {
        console.error("Dispatch error for order:", order.id, err);
      }
    }

    return json({ processed: pendingOrders.length, dispatched });
  } catch (err) {
    console.error("whatsapp-pix-reminder error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
