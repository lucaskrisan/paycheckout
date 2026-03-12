import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch order with customer and product info
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, customers(name, email, phone, cpf), products(name, price, description)")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Order is not pending");
    if (order.payment_method !== "pix") throw new Error("Order is not PIX");
    if (!order.customers?.email) throw new Error("Customer email not found");

    const customerName = order.customers.name || "Cliente";
    const customerEmail = order.customers.email;
    const customerPhone = order.customers.phone || "";
    const customerCpf = order.customers.cpf || "";
    const productName = order.products?.name || "seu produto";
    const productPrice = Number(order.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const productDescription = order.products?.description || "";

    // Build pre-filled checkout link
    const checkoutParams = new URLSearchParams();
    if (customerName) checkoutParams.set("name", customerName);
    if (customerEmail) checkoutParams.set("email", customerEmail);
    if (customerPhone) checkoutParams.set("phone", customerPhone);
    if (customerCpf) checkoutParams.set("cpf", customerCpf);
    const checkoutUrl = `https://paycheckout.lovable.app/checkout/${order.product_id}?${checkoutParams.toString()}`;

    // Use AI to generate personalized reminder email
    let emailSubject = `⏰ Seu PIX de R$ ${productPrice} está aguardando pagamento`;
    let emailHtml = "";

    if (lovableKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Você é um copywriter especialista em recuperação de vendas digitais no Brasil.
Escreva emails curtos, persuasivos e amigáveis para lembrar o cliente de pagar um PIX pendente.
Use tom informal mas profissional. Inclua urgência sutil sem ser agressivo.
Responda APENAS com um JSON válido: {"subject": "...", "body": "..."}.
O body deve ser HTML simples com <p>, <strong>, <br> apenas. Não use markdown.
Não inclua links de pagamento (o sistema adiciona automaticamente).
Máximo 4 parágrafos curtos.`,
              },
              {
                role: "user",
                content: `Escreva um email de lembrete para:
- Cliente: ${customerName}
- Produto: ${productName}
- Valor: R$ ${productPrice}
- Descrição do produto: ${productDescription || "produto digital"}
O cliente gerou o PIX mas não pagou ainda.`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            emailSubject = parsed.subject || emailSubject;
            emailHtml = parsed.body || "";
          }
        }
      } catch (aiErr) {
        console.error("AI generation failed, using fallback:", aiErr);
      }
    }

    // Fallback email if AI didn't generate
    if (!emailHtml) {
      emailHtml = `
        <p>Olá <strong>${customerName}</strong>,</p>
        <p>Notamos que você gerou um PIX para <strong>${productName}</strong> no valor de <strong>R$ ${productPrice}</strong>, mas o pagamento ainda não foi confirmado.</p>
        <p>O PIX tem prazo de validade! Se você ainda deseja garantir sua compra, finalize o pagamento o quanto antes para não perder sua vaga.</p>
        <p>Qualquer dúvida, estamos por aqui! 💚</p>
      `;
    }

    // Get checkout settings for branding
    const { data: settings } = await supabase
      .from("checkout_settings")
      .select("company_name, primary_color, logo_url")
      .eq("user_id", order.user_id)
      .limit(1)
      .single();

    const companyName = settings?.company_name || "PayCheckout";
    const primaryColor = settings?.primary_color || "#22c55e";

    const fullHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      ${settings?.logo_url ? `<img src="${settings.logo_url}" alt="${companyName}" style="max-height:40px;margin-bottom:24px;">` : `<p style="font-size:18px;font-weight:bold;color:${primaryColor};margin-bottom:24px;">${companyName}</p>`}
      ${emailHtml}
      <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid ${primaryColor};">
        <p style="margin:0;font-size:14px;color:#166534;"><strong>📦 ${productName}</strong></p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#166534;">R$ ${productPrice}</p>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${checkoutUrl}" style="display:inline-block;background:${primaryColor};color:#fff;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Finalizar pagamento →
        </a>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#a1a1aa;text-align:center;">
        Este email foi enviado por ${companyName}
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@paolasemfiltro.com>`,
        to: [customerEmail],
        subject: emailSubject,
        html: fullHtml,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      throw new Error("Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, email: customerEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-pix-reminder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
