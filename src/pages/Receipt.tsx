import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Printer, ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto Bancário",
};

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
  authenticity_hash: string;
  verified_at: string;
}

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
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="bg-card rounded-xl border border-border p-8 max-w-md text-center">
          <h1 className="font-bold text-lg text-foreground mb-2">Recibo indisponível</h1>
          <p className="text-sm text-muted-foreground">
            {error || "Não foi possível carregar este recibo."}
          </p>
        </div>
      </div>
    );
  }

  const { order, producer, gateway, authenticity_hash, verified_at } = data;
  const isUSD = order.products?.currency === "USD";
  const formatPrice = (v: number) =>
    isUSD ? `$${v.toFixed(2)}` : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const issuedAt = new Date(order.updated_at || order.created_at);
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

  return (
    <div className="min-h-screen bg-muted print:bg-white py-6 print:py-0">
      {/* Toolbar (hidden on print) */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <div className="text-sm text-muted-foreground">
          Recibo nº <strong className="text-foreground">{receiptNumber}</strong>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Baixar / Imprimir PDF
        </Button>
      </div>

      {/* Receipt sheet */}
      <div className="max-w-3xl mx-auto bg-white text-slate-900 shadow-lg print:shadow-none rounded-xl print:rounded-none overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-8 py-6 print:py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-xl font-black">
                  P
                </div>
                <span className="font-black text-xl tracking-tight">Panttera</span>
              </div>
              <p className="text-xs text-white/70 mt-1 font-semibold">
                COMPROVANTE OFICIAL DE TRANSAÇÃO
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">
                Documento eletrônico — válido sem assinatura física
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Recibo nº</p>
              <p className="font-bold text-lg">#{receiptNumber}</p>
              <p className="text-[10px] text-white/60 mt-0.5">
                Emitido em {issuedAt.toLocaleDateString("pt-BR")} às{" "}
                {issuedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[9px] text-white/40 mt-0.5">
                ({issuedAt.toISOString()} UTC)
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation banner */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-8 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-900">
            Pagamento confirmado, processado e liquidado
          </span>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Three-party panel: Processor, Seller, Buyer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
                Plataforma processadora
              </p>
              <p className="text-sm font-bold text-slate-900">Panttera Tecnologia</p>
              <p className="text-slate-600">Plataforma de checkout digital</p>
              <p className="text-slate-600">contato@panttera.com.br</p>
              <p className="text-slate-600">www.panttera.com.br</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
                Vendedor / Beneficiário
              </p>
              <p className="text-sm font-bold text-slate-900">{producer?.name || "—"}</p>
              {producer?.email && <p className="text-slate-600 break-all">{producer.email}</p>}
              {producer?.cpf_cnpj && <p className="text-slate-600">CPF/CNPJ: {producer.cpf_cnpj}</p>}
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
                Pagador / Cliente
              </p>
              <p className="text-sm font-bold text-slate-900">{order.customers?.name || "—"}</p>
              {order.customers?.email && (
                <p className="text-slate-600 break-all">{order.customers.email}</p>
              )}
              {order.customers?.cpf && <p className="text-slate-600">CPF: {order.customers.cpf}</p>}
              {order.customers?.phone && <p className="text-slate-600">{order.customers.phone}</p>}
              {(order.customer_city || order.customer_state || order.customer_zip) && (
                <p className="text-slate-600">
                  {[order.customer_city, order.customer_state, order.customer_country]
                    .filter(Boolean)
                    .join(" / ")}
                  {order.customer_zip && ` — CEP ${order.customer_zip}`}
                </p>
              )}
            </div>
          </div>

          {/* Product */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Descrição da compra
              </p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {order.products?.name || "Produto digital"}
                    </p>
                    {order.products?.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {order.products.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatPrice(gross)}
                  </td>
                </tr>
                {fee > 0 && (
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <td className="px-4 py-2">Taxa de processamento da plataforma</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">− {formatPrice(fee)}</td>
                  </tr>
                )}
                {fee > 0 && (
                  <tr className="border-b border-slate-100 text-xs text-slate-700">
                    <td className="px-4 py-2 font-semibold">Valor líquido ao vendedor</td>
                    <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">
                      {formatPrice(net)}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-900 text-white">
                  <td className="px-4 py-3 text-right text-xs uppercase tracking-widest font-bold">
                    Total pago pelo cliente
                  </td>
                  <td className="px-4 py-3 text-right font-black text-lg whitespace-nowrap">
                    {formatPrice(gross)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Método de pagamento
              </p>
              <p className="text-slate-900 font-medium">
                {PAYMENT_LABEL[order.payment_method] || order.payment_method}
                {installments > 1 && (
                  <span className="text-slate-500"> · {installments}x</span>
                )}
                {cardBrand && cardLast4 && (
                  <span className="text-slate-500">
                    {" "}
                    · {String(cardBrand).toUpperCase()} ****{cardLast4}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Data e hora da transação
              </p>
              <p className="text-slate-900 font-medium">
                {txAt.toLocaleDateString("pt-BR")} às{" "}
                {txAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}
                <span className="text-slate-400 text-xs">(BRT)</span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{txAt.toISOString()} UTC</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Status</p>
              <p className="text-emerald-700 font-bold uppercase text-xs">
                ✓ Aprovado e liquidado
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Moeda</p>
              <p className="text-slate-900 font-medium">{order.products?.currency || "BRL"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                ID interno da transação (Panttera)
              </p>
              <p className="text-slate-900 font-mono text-xs break-all">{order.id}</p>
            </div>
            {order.external_id && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Referência no gateway adquirente
                </p>
                <p className="text-slate-900 font-mono text-xs break-all">{order.external_id}</p>
              </div>
            )}
            {gateway && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Adquirente / Instituição de pagamento
                </p>
                <p className="text-slate-900 text-xs">{gateway.label}</p>
              </div>
            )}
          </div>

          {/* Authenticity block */}
          <div className="border-2 border-emerald-200 bg-emerald-50/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Selo de autenticidade digital
              </p>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Este documento foi gerado eletronicamente e seu conteúdo está protegido por hash
              criptográfico SHA-256. A integridade pode ser verificada acessando o link público
              abaixo a qualquer momento. Qualquer alteração no documento original invalidará a
              verificação.
            </p>
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                  Hash SHA-256
                </span>
                <p className="font-mono text-[10px] text-slate-700 break-all">{authenticity_hash}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                  Link de verificação pública
                </span>
                <p className="font-mono text-[10px] text-slate-700 break-all">{verificationUrl}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                  Verificado em
                </span>
                <p className="font-mono text-[10px] text-slate-700">
                  {new Date(verified_at).toLocaleString("pt-BR")} ({verified_at} UTC)
                </p>
              </div>
              {payerIp && (
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    IP do pagador no ato da compra
                  </span>
                  <p className="font-mono text-[10px] text-slate-700">{payerIp}</p>
                </div>
              )}
              {payerUserAgent && (
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    Dispositivo / User-Agent
                  </span>
                  <p className="font-mono text-[10px] text-slate-700 break-all">{payerUserAgent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Legal footer */}
          <div className="border-t border-slate-200 pt-4 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div className="text-[10px] text-slate-500 leading-relaxed space-y-1.5">
              <p>
                <strong className="text-slate-700">Natureza do documento:</strong> Comprovante
                eletrônico de transação financeira, emitido pela Panttera Tecnologia em sua
                qualidade de plataforma processadora de pagamentos digitais. Este recibo atesta a
                ocorrência, valor, data e partes envolvidas na transação descrita.
              </p>
              <p>
                <strong className="text-slate-700">Validade jurídica:</strong> Documento eletrônico
                válido nos termos da MP 2.200-2/2001, da Lei 14.063/2020 e do Marco Civil da
                Internet (Lei 12.965/2014). Pode ser apresentado a instituições financeiras,
                adquirentes (Asaas, Pagar.me, Stripe, etc.), órgãos reguladores e autoridades
                competentes como prova da transação.
              </p>
              <p>
                <strong className="text-slate-700">LGPD:</strong> Dados pessoais tratados conforme a
                Lei 13.709/2018 e a Política de Privacidade disponível em www.panttera.com.br.
              </p>
              <p>
                <strong className="text-slate-700">Contestações:</strong> Em caso de dúvida sobre
                esta cobrança, o titular do pagamento pode entrar em contato com{" "}
                <strong>contato@panttera.com.br</strong> informando o número do recibo{" "}
                <strong>#{receiptNumber}</strong> e o ID da transação acima.
              </p>
            </div>
          </div>
        </div>

        {/* Print footer */}
        <div className="px-8 py-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 print:block">
          Panttera Tecnologia · panttera.com.br · Recibo nº {receiptNumber} · Página 1 de 1
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

export default Receipt;
