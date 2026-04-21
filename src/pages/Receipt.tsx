import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Printer, Download, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto",
};

interface ReceiptData {
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
  customers: { name: string; email: string; phone: string | null; cpf: string | null } | null;
  products: { name: string; description: string | null; currency: string } | null;
}

const Receipt = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.functions.supabase.co/get-receipt?order_id=${orderId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro ao carregar recibo");
        setOrder(data.order);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (order) {
      document.title = `Recibo #${order.id.slice(0, 8).toUpperCase()} — Panttera`;
    }
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="bg-card rounded-xl border border-border p-8 max-w-md text-center">
          <h1 className="font-bold text-lg text-foreground mb-2">Recibo indisponível</h1>
          <p className="text-sm text-muted-foreground">
            {error || "Não foi possível carregar este recibo. Verifique o link ou aguarde a confirmação do pagamento."}
          </p>
        </div>
      </div>
    );
  }

  const isUSD = order.products?.currency === "USD";
  const formatPrice = (v: number) =>
    isUSD ? `$${v.toFixed(2)}` : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const issuedAt = new Date(order.updated_at || order.created_at);
  const receiptNumber = order.id.slice(0, 8).toUpperCase();

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
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xl font-black">
                  P
                </div>
                <span className="font-black text-xl tracking-tight">Panttera</span>
              </div>
              <p className="text-xs text-white/60 mt-1">Plataforma de pagamentos digitais</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Recibo</p>
              <p className="font-bold text-lg">#{receiptNumber}</p>
              <p className="text-[10px] text-white/60 mt-0.5">
                Emitido em {issuedAt.toLocaleDateString("pt-BR")} às{" "}
                {issuedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation banner */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-8 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-900">Pagamento confirmado e processado</span>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Issuer + Customer */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                Emitido por
              </p>
              <p className="text-sm font-bold text-slate-900">Panttera Tecnologia</p>
              <p className="text-xs text-slate-600">Processadora de pagamentos</p>
              <p className="text-xs text-slate-600">www.panttera.com.br</p>
              <p className="text-xs text-slate-600">contato@panttera.com.br</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                Pago por
              </p>
              <p className="text-sm font-bold text-slate-900">{order.customers?.name || "—"}</p>
              <p className="text-xs text-slate-600">{order.customers?.email || ""}</p>
              {order.customers?.cpf && <p className="text-xs text-slate-600">CPF: {order.customers.cpf}</p>}
              {order.customers?.phone && <p className="text-xs text-slate-600">{order.customers.phone}</p>}
              {(order.customer_city || order.customer_state) && (
                <p className="text-xs text-slate-600">
                  {[order.customer_city, order.customer_state, order.customer_country].filter(Boolean).join(" / ")}
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
                    <p className="font-semibold text-slate-900">{order.products?.name || "Produto digital"}</p>
                    {order.products?.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{order.products.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatPrice(Number(order.amount))}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 text-right text-xs uppercase tracking-widest text-slate-500 font-bold">
                    Total pago
                  </td>
                  <td className="px-4 py-3 text-right font-black text-lg text-slate-900 whitespace-nowrap">
                    {formatPrice(Number(order.amount))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Método de pagamento</p>
              <p className="text-slate-900 font-medium">
                {PAYMENT_LABEL[order.payment_method] || order.payment_method}
                {order.metadata?.installments && Number(order.metadata.installments) > 1 && (
                  <span className="text-slate-500"> · {order.metadata.installments}x</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Data da transação</p>
              <p className="text-slate-900 font-medium">
                {new Date(order.created_at).toLocaleDateString("pt-BR")}{" "}
                <span className="text-slate-500">
                  às {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Status</p>
              <p className="text-emerald-700 font-bold uppercase text-xs">Aprovado</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">ID da transação</p>
              <p className="text-slate-900 font-mono text-xs break-all">{order.id}</p>
            </div>
            {order.external_id && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Referência do gateway</p>
                <p className="text-slate-900 font-mono text-xs break-all">{order.external_id}</p>
              </div>
            )}
          </div>

          {/* Verification footer */}
          <div className="border-t border-slate-200 pt-4 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-[10px] text-slate-500 leading-relaxed">
              Este recibo é uma confirmação eletrônica oficial emitida pela Panttera Tecnologia, plataforma processadora
              da transação acima. A autenticidade pode ser verificada acessando o link permanente deste documento ou
              através do ID da transação. Em caso de dúvidas sobre a cobrança, o titular pode entrar em contato com{" "}
              <strong>contato@panttera.com.br</strong> informando o número do recibo{" "}
              <strong>#{receiptNumber}</strong>.
            </div>
          </div>
        </div>

        {/* Print footer */}
        <div className="px-8 py-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 print:block">
          panttera.com.br · Recibo gerado eletronicamente — válido sem assinatura
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </div>
  );
};

export default Receipt;
