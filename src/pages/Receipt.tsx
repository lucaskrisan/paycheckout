import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Printer, ShieldCheck, CheckCircle2, Lock, Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto Bancário",
};

const EMAIL_TYPE_LABEL: Record<string, string> = {
  access_link: "E-mail de acesso ao produto",
  purchase_confirmation: "E-mail de confirmação de compra",
  order_confirmation: "E-mail de confirmação do pedido",
  purchase: "E-mail de confirmação de compra",
};

interface EmailSent {
  type: string;
  subject: string;
  to_email: string;
  sent_at: string;
  status: string;
  delivered_at: string | null;
  opened_at: string | null;
  resend_id: string | null;
}

interface ReceiptResponse {
  order: {
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    updated_at: string | null;
    external_id: string | null;
    metadata: any;
    platform_fee_amount: number | null;
    customer_state: string | null;
    customer_city: string | null;
    customer_country: string | null;
    customer_zip: string | null;
    customers: { name: string; email: string; phone: string | null; cpf: string | null } | null;
    products: { name: string; description: string | null; currency: string } | null;
  };
  producer: { name: string | null; email: string | null; cpf_cnpj: string | null } | null;
  gateway: { code: string; label: string } | null;
  emails_sent: EmailSent[];
  authenticity_hash: string;
  verified_at: string;
}

const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`;
};

const Receipt = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<ReceiptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.functions.supabase.co/get-receipt?order_id=${orderId}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Erro ao carregar recibo");
        setData(body);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (data) document.title = `Recibo #${data.order.id.slice(0, 8).toUpperCase()} — Panttera`;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center shadow-sm">
          <h1 className="font-semibold text-lg text-slate-900 mb-2">Recibo indisponível</h1>
          <p className="text-sm text-slate-500">
            {error || "Não foi possível carregar este recibo."}
          </p>
        </div>
      </div>
    );
  }

  const { order, producer, gateway, emails_sent, authenticity_hash, verified_at } = data;
  const isUSD = order.products?.currency === "USD";
  const formatPrice = (v: number) =>
    isUSD ? `$${v.toFixed(2)}` : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const txAt = new Date(order.created_at);
  const receiptNumber = order.id.slice(0, 8).toUpperCase();
  const gross = Number(order.amount);
  const fee = Number(order.platform_fee_amount || 0);
  const net = gross - fee;
  const cardBrand = order.metadata?.card_brand || order.metadata?.brand;
  const cardLast4 = order.metadata?.card_last4 || order.metadata?.last4;
  const installments = Number(order.metadata?.installments || 1);
  const payerIp =
    order.metadata?.ip ||
    order.metadata?.remote_ip ||
    order.metadata?.customer_ip ||
    order.metadata?.client_ip ||
    null;
  const payerUserAgent = order.metadata?.user_agent || null;

  const verificationUrl = typeof window !== "undefined" ? window.location.href : "";
  const customerName = order.customers?.name || "Cliente";
  const firstName = customerName.split(" ")[0];
  const maskedName =
    firstName.length > 1
      ? `${firstName[0]}${"*".repeat(Math.max(firstName.length - 2, 3))}${firstName.slice(-1)}`
      : firstName;

  const accessEmail = emails_sent?.find((e) => e.type === "access_link");
  const confirmationEmail = emails_sent?.find((e) =>
    ["purchase_confirmation", "order_confirmation", "purchase"].includes(e.type),
  );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white py-8 print:py-0">
      {/* Toolbar (hidden on print) */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <div className="text-sm text-slate-500">
          Recibo nº <strong className="text-slate-900">{receiptNumber}</strong>
        </div>
        <Button
          onClick={() => window.print()}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Printer className="w-4 h-4" />
          Baixar / Imprimir PDF
        </Button>
      </div>

      {/* Receipt sheet — clean white, CartPanda-inspired */}
      <div className="max-w-3xl mx-auto bg-white text-slate-900 shadow-sm print:shadow-none rounded-2xl print:rounded-none border border-slate-200 print:border-0 overflow-hidden">
        {/* Top — minimal centered header */}
        <div className="px-6 sm:px-10 pt-10 pb-6 text-center">
          <p className="text-sm text-slate-500">Pedido #{receiptNumber}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Obrigado, {maskedName}
          </h1>

          {/* Confirmation icon */}
          <div className="flex justify-center mt-8 mb-4">
            <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
              <svg
                className="w-9 h-9 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"
                />
              </svg>
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-white">
                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">Seu pedido foi confirmado</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Seu pedido aparecerá na fatura como{" "}
            <strong className="text-slate-700 uppercase">
              {(producer?.name || "PANTTERA").replace(/\s+/g, "").toUpperCase().slice(0, 22)}
            </strong>
          </p>

          {accessEmail && (
            <a
              href="#email-proof"
              className="inline-flex items-center justify-center gap-2 mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
            >
              Ver acesso enviado
            </a>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* Detalhes do pedido */}
        <div className="px-6 sm:px-10 py-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Detalhes do pedido</h3>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
              <svg
                className="w-7 h-7 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">
                {order.products?.name || "Produto digital"}
              </p>
              {order.products?.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {order.products.description}
                </p>
              )}
            </div>
            <p className="font-medium text-slate-900 whitespace-nowrap">1 x {formatPrice(gross)}</p>
          </div>

          <p className="text-xs text-slate-500 mt-6 leading-relaxed">
            Também enviamos para a sua caixa de entrada, assim você pode acessar a qualquer
            momento. Se não encontrar, verifique sua pasta de spam ou promoções!
          </p>
        </div>

        <div className="border-t border-slate-100" />

        {/* Resumo financeiro */}
        <div className="px-6 sm:px-10 py-6">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="text-slate-500">1 Item(s)</dd>
              <dd className="text-slate-900 font-medium tabular-nums">{formatPrice(gross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Envio</dt>
              <dd className="text-slate-500">Entrega digital</dd>
              <dd className="text-slate-900 font-medium tabular-nums">{formatPrice(0)}</dd>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-xs">
                <dt className="text-slate-400">Taxa da plataforma</dt>
                <dd className="text-slate-400">Líquido ao vendedor: {formatPrice(net)}</dd>
                <dd className="text-slate-400 tabular-nums">− {formatPrice(fee)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <dt className="text-slate-900 font-semibold">Total</dt>
              <dd></dd>
              <dd className="text-slate-900 font-semibold tabular-nums">
                {installments > 1 && (
                  <span className="text-slate-500 font-normal mr-2">
                    {installments}x {formatPrice(gross / installments)}
                  </span>
                )}
                {formatPrice(gross)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-slate-100" />

        {/* Informações do cliente */}
        <div className="px-6 sm:px-10 py-6 space-y-5">
          <h3 className="text-base font-semibold text-slate-900">Informações do cliente</h3>

          <div>
            <p className="text-sm font-medium text-slate-900 mb-1">Endereço de e-mail</p>
            <p className="text-sm text-slate-500">
              {order.customers?.email ? maskEmail(order.customers.email) : "—"}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-900 mb-1">Método de pagamento</p>
            <p className="text-sm text-slate-500 inline-flex items-center gap-2">
              {order.payment_method === "pix" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  PIX
                </span>
              )}
              {order.payment_method === "credit_card" && cardBrand && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium uppercase">
                  {cardBrand}
                </span>
              )}
              {order.payment_method === "credit_card" && cardLast4
                ? `${String(cardBrand || "cartão").toLowerCase()} terminando em ${cardLast4}`
                : `${PAYMENT_LABEL[order.payment_method] || order.payment_method} — ${formatPrice(gross)}`}
            </p>
          </div>

          {(order.customer_city || order.customer_state || order.customer_zip) && (
            <div>
              <p className="text-sm font-medium text-slate-900 mb-1">Localização</p>
              <p className="text-sm text-slate-500">
                {[order.customer_city, order.customer_state, order.customer_country]
                  .filter(Boolean)
                  .join(" / ")}
                {order.customer_zip && ` — CEP ${order.customer_zip}`}
              </p>
            </div>
          )}
        </div>

        {/* Prova de envio do e-mail de acesso */}
        {(accessEmail || confirmationEmail) && (
          <>
            <div className="border-t border-slate-100" />
            <div id="email-proof" className="px-6 sm:px-10 py-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Comprovação de envio de e-mails
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  Auditoria
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Registro técnico oficial do disparo automático para o cliente após a confirmação do
                pagamento.
              </p>

              <div className="space-y-3">
                {accessEmail && (
                  <EmailProofRow email={accessEmail} icon="access" />
                )}
                {confirmationEmail && (
                  <EmailProofRow email={confirmationEmail} icon="confirmation" />
                )}
              </div>
            </div>
          </>
        )}

        {/* Detalhes técnicos da transação (collapsed style) */}
        <div className="border-t border-slate-100" />
        <div className="px-6 sm:px-10 py-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Detalhes da transação</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Data e hora</p>
              <p className="text-slate-900">
                {txAt.toLocaleDateString("pt-BR")} às{" "}
                {txAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{txAt.toISOString()} UTC</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-emerald-700 font-semibold">✓ Aprovado e liquidado</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Vendedor</p>
              <p className="text-slate-900">{producer?.name || "—"}</p>
              {producer?.cpf_cnpj && (
                <p className="text-[11px] text-slate-500">CPF/CNPJ: {producer.cpf_cnpj}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Moeda</p>
              <p className="text-slate-900">{order.products?.currency || "BRL"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">ID interno (Panttera)</p>
              <p className="text-slate-700 font-mono text-xs break-all">{order.id}</p>
            </div>
            {order.external_id && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Referência no gateway</p>
                <p className="text-slate-700 font-mono text-xs break-all">{order.external_id}</p>
              </div>
            )}
            {gateway && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Adquirente</p>
                <p className="text-slate-700 text-xs">{gateway.label}</p>
              </div>
            )}
          </div>
        </div>

        {/* Selo de autenticidade — diferencial Panttera, mas em estilo clean */}
        <div className="border-t border-slate-100" />
        <div className="px-6 sm:px-10 py-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Selo de autenticidade digital
              </p>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Este documento foi gerado eletronicamente e seu conteúdo está protegido por hash
              criptográfico SHA-256. Qualquer alteração no documento original invalidará a
              verificação pública.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <Field label="Hash SHA-256" value={authenticity_hash} mono />
              <Field label="Verificação pública" value={verificationUrl} mono />
              <Field
                label="Verificado em"
                value={`${new Date(verified_at).toLocaleString("pt-BR")}`}
                mono
              />
              {payerIp && <Field label="IP do pagador" value={payerIp} mono />}
              {payerUserAgent && <Field label="Dispositivo" value={payerUserAgent} mono />}
            </div>
          </div>
        </div>

        {/* Legal footer */}
        <div className="border-t border-slate-100" />
        <div className="px-6 sm:px-10 py-6">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
              <p>
                <strong className="text-slate-700">Natureza:</strong> Comprovante eletrônico de
                transação financeira emitido pela Panttera Tecnologia em sua qualidade de
                plataforma processadora de pagamentos digitais.
              </p>
              <p>
                <strong className="text-slate-700">Validade jurídica:</strong> Documento eletrônico
                válido nos termos da MP 2.200-2/2001, da Lei 14.063/2020 e do Marco Civil da
                Internet (Lei 12.965/2014).
              </p>
              <p>
                <strong className="text-slate-700">Contestações:</strong> Em caso de dúvida, entre
                em contato com <strong>contato@panttera.com.br</strong> informando o recibo{" "}
                <strong>#{receiptNumber}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Print footer */}
        <div className="px-6 sm:px-10 py-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Panttera Tecnologia · panttera.com.br · Recibo nº {receiptNumber}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
    </div>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
    <p className={`text-[10px] text-slate-700 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>
);

const EmailProofRow = ({ email, icon }: { email: EmailSent; icon: "access" | "confirmation" }) => {
  const sentAt = new Date(email.sent_at);
  const deliveredAt = email.delivered_at ? new Date(email.delivered_at) : null;
  const openedAt = email.opened_at ? new Date(email.opened_at) : null;

  const isOk = ["sent", "delivered", "opened", "clicked"].includes(email.status);
  const Icon = icon === "access" ? MailCheck : Mail;
  const accentColor = icon === "access" ? "emerald" : "blue";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className={`px-4 py-3 flex items-center gap-3 border-b border-slate-100 ${
          accentColor === "emerald" ? "bg-emerald-50/60" : "bg-blue-50/60"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            accentColor === "emerald"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {EMAIL_TYPE_LABEL[email.type] || email.type}
          </p>
          <p className="text-xs text-slate-500 truncate">{email.subject}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
            isOk
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {isOk ? "✓ Enviado" : email.status}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            Destinatário
          </p>
          <p className="text-slate-700">{maskEmail(email.to_email)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            Disparado em
          </p>
          <p className="text-slate-700">
            {sentAt.toLocaleDateString("pt-BR")} às{" "}
            {sentAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>
        {deliveredAt && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Entregue em
            </p>
            <p className="text-emerald-700 font-medium">
              {deliveredAt.toLocaleDateString("pt-BR")} às{" "}
              {deliveredAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
        {openedAt && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Aberto em
            </p>
            <p className="text-emerald-700 font-medium">
              {openedAt.toLocaleDateString("pt-BR")} às{" "}
              {openedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
        {email.resend_id && (
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              ID do provedor (Resend)
            </p>
            <p className="text-slate-600 font-mono text-[10px] break-all">{email.resend_id}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Receipt;
