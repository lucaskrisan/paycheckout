import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_LABELS: Record<string, string> = {
  asaas: "Asaas IP S.A. (CNPJ 19.540.550/0001-21)",
  pagarme: "Pagar.me Pagamentos S.A. (CNPJ 18.727.053/0001-74)",
  stripe: "Stripe Payments Brasil Serviços de Pagamentos Ltda. (CNPJ 31.992.173/0001-83)",
  mercadopago: "Mercado Pago.com Representações Ltda. (CNPJ 10.573.521/0001-91)",
};

function detectGateway(metadata: any, externalId: string | null): string | null {
  if (metadata?.gateway) return String(metadata.gateway).toLowerCase();
  if (metadata?.provider) return String(metadata.provider).toLowerCase();
  if (!externalId) return null;
  if (externalId.startsWith("pay_") || externalId.startsWith("ch_")) {
    if (externalId.startsWith("pay_") && externalId.length < 25) return "asaas";
    if (externalId.startsWith("ch_")) return "stripe";
    return "pagarme";
  }
  if (externalId.startsWith("pi_") || externalId.startsWith("cs_")) return "stripe";
  return null;
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");

    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return new Response(JSON.stringify({ error: "Invalid order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id, amount, status, payment_method, created_at, updated_at,
        external_id, metadata, platform_fee_amount, user_id, customer_id,
        customer_city, customer_state, customer_country, customer_zip,
        customers(name, email, phone, cpf),
        products(name, description, currency)
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["paid", "approved", "confirmed"].includes(order.status)) {
      return new Response(
        JSON.stringify({ error: "Receipt only available for paid orders", status: order.status }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve producer (seller) info
    let producer: { name: string | null; email: string | null; cpf_cnpj: string | null } = {
      name: null,
      email: null,
      cpf_cnpj: null,
    };
    if (order.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, cpf")
        .eq("id", order.user_id)
        .maybeSingle();
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      producer = {
        name: profile?.full_name || authUser?.user?.user_metadata?.full_name || null,
        email: authUser?.user?.email || null,
        cpf_cnpj: (profile as any)?.cpf || null,
      };
    }

    const gateway = detectGateway(order.metadata, order.external_id);
    const gatewayLabel = gateway ? GATEWAY_LABELS[gateway] || gateway : null;

    // E-mails relacionados ao pedido (prova de envio do acesso e da confirmação)
    const customerEmail = (order as any).customers?.email || null;
    let emailsSent: Array<{
      type: string;
      subject: string;
      to_email: string;
      sent_at: string;
      status: string;
      delivered_at: string | null;
      opened_at: string | null;
      resend_id: string | null;
    }> = [];

    if (customerEmail) {
      const { data: logs } = await supabase
        .from("email_logs")
        .select("email_type, subject, to_email, created_at, status, delivered_at, opened_at, resend_id, order_id, customer_id")
        .or(
          [
            `order_id.eq.${order.id}`,
            (order as any).customer_id ? `customer_id.eq.${(order as any).customer_id}` : null,
            `to_email.eq.${customerEmail}`,
          ]
            .filter(Boolean)
            .join(","),
        )
        .in("email_type", ["access_link", "purchase_confirmation", "order_confirmation", "purchase"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (logs) {
        // Deduplica por email_type, mantendo o mais recente
        const seen = new Set<string>();
        emailsSent = logs
          .filter((l: any) => {
            if (seen.has(l.email_type)) return false;
            seen.add(l.email_type);
            return true;
          })
          .map((l: any) => ({
            type: l.email_type,
            subject: l.subject,
            to_email: l.to_email,
            sent_at: l.created_at,
            status: l.status,
            delivered_at: l.delivered_at,
            opened_at: l.opened_at,
            resend_id: l.resend_id,
          }));
      }
    }

    // Authenticity hash — anyone can recompute by hashing these fields server-side
    const hashInput = [
      order.id,
      order.amount,
      order.status,
      order.created_at,
      order.external_id || "",
      (order as any).customers?.email || "",
    ].join("|");
    const authenticityHash = await sha256(hashInput);

    return new Response(
      JSON.stringify({
        order,
        producer,
        gateway: gateway ? { code: gateway, label: gatewayLabel } : null,
        emails_sent: emailsSent,
        authenticity_hash: authenticityHash,
        verified_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-receipt error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
