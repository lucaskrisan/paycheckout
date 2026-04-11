import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!resendApiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch all distinct producers that have abandoned carts pending recovery
    const { data: producerRows, error: producerError } = await supabaseAdmin
      .from("abandoned_carts")
      .select("user_id")
      .eq("recovered", false)
      .not("customer_email", "is", null)
      .is("email_recovery_sent_at", null);

    if (producerError) {
      console.error("[cron] Error fetching producers:", producerError);
      return new Response(JSON.stringify({ error: producerError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!producerRows || producerRows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending abandoned carts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate producer user_ids
    const uniqueProducerIds = [...new Set(producerRows.map((r) => r.user_id).filter(Boolean))] as string[];

    // 2. Fetch settings for producers that have explicit config
    const { data: settingsRows } = await supabaseAdmin
      .from("cart_recovery_settings")
      .select("user_id, email_enabled, email_delay_minutes")
      .in("user_id", uniqueProducerIds);

    const settingsMap = new Map<string, { email_enabled: boolean; email_delay_minutes: number }>();
    for (const s of settingsRows || []) {
      settingsMap.set(s.user_id, { email_enabled: s.email_enabled, email_delay_minutes: s.email_delay_minutes });
    }

    // Build final list: use defaults (enabled=true, 30min) for producers without config
    const settings = uniqueProducerIds
      .map((uid) => {
        const cfg = settingsMap.get(uid) || { email_enabled: true, email_delay_minutes: 30 };
        return { user_id: uid, email_delay_minutes: cfg.email_delay_minutes, email_enabled: cfg.email_enabled };
      })
      .filter((s) => s.email_enabled);

    let totalProcessed = 0;
    const MAX_TOTAL = 50;
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    for (const setting of settings) {
      if (totalProcessed >= MAX_TOTAL) break;

      const cutoff = new Date(Date.now() - setting.email_delay_minutes * 60 * 1000).toISOString();

      // 2. Fetch eligible abandoned carts for this producer
      const { data: carts, error: cartsError } = await supabaseAdmin
        .from("abandoned_carts")
        .select("*, products(name, price, image_url, user_id)")
        .eq("user_id", setting.user_id)
        .eq("recovered", false)
        .not("customer_email", "is", null)
        .is("email_recovery_sent_at", null)
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(MAX_TOTAL - totalProcessed);

      if (cartsError || !carts || carts.length === 0) continue;

      // Fetch company name for this producer
      const { data: checkoutSettings } = await supabaseAdmin
        .from("checkout_settings")
        .select("company_name")
        .eq("user_id", setting.user_id)
        .maybeSingle();

      const companyName = checkoutSettings?.company_name || "Loja Online";

      // 3. Send emails
      for (const cart of carts) {
        if (totalProcessed >= MAX_TOTAL) break;

        const product = (cart as any).products;
        const productName = product?.name || "seu produto";
        const productPrice = (cart as any).product_price || product?.price || 0;

        // Build checkout URL with pre-filled params
        let checkoutUrl = cart.checkout_url || cart.page_url || `https://app.panttera.com.br/checkout/${cart.product_id}`;
        const params = new URLSearchParams();
        if (cart.customer_name) params.set("name", cart.customer_name);
        if (cart.customer_email) params.set("email", cart.customer_email);
        if (cart.customer_phone) params.set("phone", cart.customer_phone);
        if (cart.customer_cpf) params.set("cpf", cart.customer_cpf);
        const separator = checkoutUrl.includes("?") ? "&" : "?";
        const finalUrl = params.toString() ? `${checkoutUrl}${separator}${params}` : checkoutUrl;

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Você esqueceu algo no carrinho 🛒</h2>
            <p style="color: #666;">Olá${cart.customer_name ? ` ${cart.customer_name}` : ''},</p>
            <p style="color: #666;">Notamos que você não finalizou sua compra. Seu carrinho ainda está esperando por você!</p>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="font-weight: bold; margin: 0;">${productName}</p>
              <p style="color: #22c55e; font-size: 18px; margin: 8px 0;">R$ ${Number(productPrice).toFixed(2)}</p>
            </div>
            <a href="${finalUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              Finalizar compra →
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Se você já finalizou sua compra, por favor ignore este e-mail.
            </p>
          </div>
        `;

        let emailStatus = "error";
        try {
          const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify({
              from: `${companyName} <onboarding@resend.dev>`,
              to: [cart.customer_email],
              subject: "Você esqueceu algo no carrinho 🛒",
              html,
            }),
          });

          if (emailRes.ok) {
            emailStatus = "sent";
          } else {
            const errBody = await emailRes.text();
            console.error(`[cron] Resend error for cart ${cart.id}:`, errBody);
          }
        } catch (sendErr) {
          console.error(`[cron] Send error for cart ${cart.id}:`, sendErr);
        }

        // 4. Update cart status
        await supabaseAdmin
          .from("abandoned_carts")
          .update({
            email_recovery_sent_at: new Date().toISOString(),
            email_recovery_status: emailStatus,
          } as any)
          .eq("id", cart.id);

        totalProcessed++;
      }
    }

    console.log(`[cron] Processed ${totalProcessed} abandoned cart emails`);

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[cron] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
