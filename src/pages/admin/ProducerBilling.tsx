// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Loader2, ClipboardCopy, CheckCircle2, Zap, AlertTriangle,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, Gift,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

// ── Types ──────────────────────────────────────────
interface TierRow { key: string; label: string; credit_limit: number; level: number; color: string; }
interface BillingAccount {
  id: string; balance: number; credit_tier: string; credit_limit: number; blocked: boolean;
  card_last4: string | null; card_brand: string | null;
  auto_recharge_enabled: boolean; auto_recharge_amount: number; auto_recharge_threshold: number;
}
interface BillingTransaction { id: string; type: string; amount: number; description: string | null; created_at: string; }

// ── Helpers ────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toSales = (reais: number) => Math.max(0, Math.floor(reais / 0.99));
const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || fallback;
  if (Array.isArray(error)) return error.map((i) => getErrorMessage(i, "")).filter(Boolean).join(" ") || fallback;
  if (typeof error === "object") {
    const r = error as Record<string, unknown>;
    return getErrorMessage(r.description ?? r.message ?? r.error, "") || Object.values(r).map((v) => getErrorMessage(v, "")).filter(Boolean).join(" ") || fallback;
  }
  return fallback;
};

const TIER_META: Record<string, { title: string }> = {
  iron: { title: "Filhote" }, bronze: { title: "Caçador" }, silver: { title: "Predador" },
  gold: { title: "Alpha" }, platinum: { title: "Apex" }, diamond: { title: "Lenda" },
};

const RECHARGE_AMOUNTS = [
  { value: 20, sales: "20" },
  { value: 50, sales: "50" },
  { value: 100, sales: "101" },
  { value: 200, sales: "202" },
];

// ── Component ──────────────────────────────────────
const ProducerBilling = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pixAmount, setPixAmount] = useState(50);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixResult, setPixResult] = useState<{ pix_code: string | null; qr_code_url: string | null; amount: number } | null>(null);
  const [copying, setCopying] = useState(false);
  const [cardAmount, setCardAmount] = useState(50);
  const [cardLoading, setCardLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showManualRecharge, setShowManualRecharge] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cardValidating, setCardValidating] = useState(false);
  const [cardForm, setCardForm] = useState({ number: "", name: "", expiryMonth: "", expiryYear: "", cvv: "", cpf: "" });

  useEffect(() => { if (user?.id) loadData(); }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: accs }, { data: txs }, { data: tierData }, { data: revenueData }] = await Promise.all([
      supabase.from("billing_accounts").select("*").eq("user_id", user!.id).limit(1),
      supabase.from("billing_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("billing_tiers").select("*").order("level", { ascending: true }),
      supabase.rpc("get_revenue_summary", { p_user_id: user!.id }),
    ]);
    setAccount((accs?.[0] as unknown as BillingAccount) ?? null);
    setTransactions((txs as unknown as BillingTransaction[]) ?? []);
    setTiers((tierData as unknown as TierRow[]) ?? []);
    const rev = Array.isArray(revenueData) ? revenueData[0] : revenueData;
    setTotalRevenue(Number(rev?.total_revenue ?? 0));
    setLoading(false);
  };

  // ── Handlers ──
  const handleValidateCard = async () => {
    if (!cardForm.number || !cardForm.name || !cardForm.expiryMonth || !cardForm.expiryYear || !cardForm.cvv || !cardForm.cpf) {
      toast.error("Preencha todos os campos"); return;
    }
    setCardValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-validate-card', {
        body: { card_number: cardForm.number.replace(/\s/g, ''), card_name: cardForm.name, card_expiry_month: cardForm.expiryMonth, card_expiry_year: cardForm.expiryYear, card_cvv: cardForm.cvv, card_cpf: cardForm.cpf.replace(/\D/g, '') },
      });
      const fe = (data as any)?.error;
      if (error || fe || !data?.success) throw new Error(getErrorMessage(fe ?? error, 'Erro ao validar'));
      toast.success(`Cartão •••• ${data.card_last4} validado!`);
      await supabase.from("billing_accounts").update({ auto_recharge_enabled: true }).eq("user_id", user!.id);
      setShowCardModal(false);
      setCardForm({ number: "", name: "", expiryMonth: "", expiryYear: "", cvv: "", cpf: "" });
      loadData();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Erro ao validar')); }
    finally { setCardValidating(false); }
  };

  const handleChargeCard = async () => {
    setCardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-recharge', { body: { amount: cardAmount, method: 'card' } });
      const fe = (data as any)?.error;
      if (error || fe || !data?.success) {
        if ((data as any)?.needs_card) { setShowCardModal(true); return; }
        throw new Error(getErrorMessage(fe ?? error, 'Erro'));
      }
      toast.success(`+${toSales(cardAmount)} vendas adicionadas!`);
      loadData();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Erro')); }
    finally { setCardLoading(false); }
  };

  const handleToggleAutoRecharge = async (enabled: boolean) => {
    if (!account) return;
    if (enabled && !account.card_last4) { toast.error("Cadastre um cartão primeiro"); setShowCardModal(true); return; }
    try {
      const { error } = await supabase.from("billing_accounts").update({ auto_recharge_enabled: enabled }).eq("user_id", user!.id);
      if (error) throw error;
      toast.success(enabled ? "Recarga automática ativada" : "Recarga automática desativada");
      loadData();
    } catch { toast.error("Erro ao salvar"); }
  };

  const handleUpdateAutoRecharge = async (field: string, value: number) => {
    try {
      const { error } = await supabase.from("billing_accounts").update({ [field]: value }).eq("user_id", user!.id);
      if (error) throw error; loadData();
    } catch { toast.error("Erro ao salvar"); }
  };

  const handleGeneratePix = async () => {
    setPixLoading(true); setPixResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('billing-recharge', { body: { amount: pixAmount, method: 'pix' } });
      const fe = (data as any)?.error;
      if (error || fe || !data?.success) throw new Error(getErrorMessage(fe ?? error, 'Erro'));
      setPixResult(data); toast.success('QR Code gerado!');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Erro')); }
    finally { setPixLoading(false); }
  };

  const handleCopyPix = async () => {
    if (!pixResult?.pix_code) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(pixResult.pix_code); toast.success('Copiado!'); }
    catch { toast.error('Erro ao copiar'); }
    finally { setTimeout(() => setCopying(false), 2000); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  // ── Derived state ──
  const balance = account?.balance ?? 0;
  const FREE_THRESHOLD = 500;
  const freeSalesRemaining = totalRevenue < FREE_THRESHOLD ? Math.floor((FREE_THRESHOLD - totalRevenue) / 0.99) : 0;
  const paidSales = toSales(balance);
  const salesCovered = freeSalesRemaining + paidSales;
  const isInFreeTrial = freeSalesRemaining > 0;
  const hasCard = !!account?.card_last4;
  const hasAutoRecharge = account?.auto_recharge_enabled && hasCard;
  const isBlocked = !!account?.blocked;
  const isDead = isBlocked || (salesCovered <= 0 && !isInFreeTrial);
  const isCritical = !isDead && salesCovered > 0 && salesCovered < 10;
  const currentTierKey = account?.credit_tier ?? "iron";
  const tierMeta = TIER_META[currentTierKey] ?? TIER_META.iron;
  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  const statusColor = isDead ? "text-destructive" : isCritical ? "text-amber-500" : "text-primary";
  const statusBg = isDead ? "bg-destructive/10 border-destructive/20" : isCritical ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/10 border-primary/20";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus créditos e pagamentos</p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
          {tierMeta.title}
        </Badge>
      </div>

      {/* ── Alert Banner (only when critical/dead) ── */}
      {(isDead || isCritical) && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${statusBg}`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${statusColor}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${statusColor}`}>
              {isDead ? "Checkout pausado — suas vendas estão paradas" : "Créditos acabando"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDead && !hasCard
                ? "Adicione um cartão para reativar suas vendas automaticamente."
                : isDead && hasCard
                  ? "Recarregue agora para continuar vendendo."
                  : `Restam apenas ${salesCovered} vendas. Recarregue para não parar.`
              }
            </p>
          </div>
          <Button
            size="sm"
            variant={isDead ? "destructive" : "default"}
            className="shrink-0 text-xs font-semibold"
            onClick={() => isDead && !hasCard ? setShowCardModal(true) : handleChargeCard()}
            disabled={cardLoading}
          >
            {cardLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isDead && !hasCard ? "Adicionar cartão" : "Recarregar"}
          </Button>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sales available */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Vendas disponíveis</p>
            <p className={`text-3xl font-bold tabular-nums ${isDead ? "text-destructive" : "text-foreground"}`}>
              {salesCovered.toLocaleString("pt-BR")}
            </p>
            {isInFreeTrial && (
              <div className="flex items-center gap-1.5 mt-2">
                <Gift className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">{freeSalesRemaining} vendas grátis</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Saldo</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{fmt(balance)}</p>
            <p className="text-xs text-muted-foreground mt-2">R$ 0,99 por venda</p>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${isDead ? "bg-destructive" : isCritical ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span className={`text-sm font-semibold ${isDead ? "text-destructive" : isCritical ? "text-amber-500" : "text-foreground"}`}>
                {isDead ? "Pausado" : isCritical ? "Baixo" : "Ativo"}
              </span>
            </div>
            {hasAutoRecharge && (
              <div className="flex items-center gap-1.5 mt-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">Recarga automática</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Auto Recharge Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Recarga automática</CardTitle>
                <p className="text-xs text-muted-foreground">Nunca pare de vender</p>
              </div>
            </div>
            {hasCard && (
              <Switch
                checked={!!account?.auto_recharge_enabled}
                onCheckedChange={handleToggleAutoRecharge}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCard ? (
            <>
              {/* Card info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {account?.card_brand?.toUpperCase()} •••• {account?.card_last4}
                </span>
                <button
                  onClick={() => setShowCardModal(true)}
                  className="text-xs text-primary font-medium hover:underline ml-auto"
                >
                  Trocar
                </button>
              </div>

              {/* Auto recharge settings */}
              {account?.auto_recharge_enabled && (
                <div className="space-y-4 pt-1">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recarregar quando restar</p>
                    <div className="flex gap-2">
                      {[3, 5, 10, 20].map((v) => (
                        <button
                          key={v}
                          onClick={() => handleUpdateAutoRecharge('auto_recharge_threshold', v)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            account?.auto_recharge_threshold === v
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {toSales(v)} vendas
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Valor da recarga</p>
                    <div className="flex gap-2 flex-wrap">
                      {[20, 50, 100, 200].map((v) => (
                        <button
                          key={v}
                          onClick={() => handleUpdateAutoRecharge('auto_recharge_amount', v)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                            account?.auto_recharge_amount === v
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {fmt(v)} (~{toSales(v)} vendas)
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando restar ≤ {toSales(account?.auto_recharge_threshold ?? 5)} vendas, será cobrado {fmt(account?.auto_recharge_amount ?? 50)} no cartão •••• {account?.card_last4}.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Adicione um cartão de crédito para ativar a recarga automática e nunca parar de vender.
              </p>
              <Button onClick={() => setShowCardModal(true)} className="gap-2 font-semibold">
                <CreditCard className="w-4 h-4" /> Adicionar cartão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manual Recharge ── */}
      <Card>
        <button
          onClick={() => setShowManualRecharge(!showManualRecharge)}
          className="flex items-center justify-between w-full px-6 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Recarga via PIX</p>
            <p className="text-xs text-muted-foreground">Adicione créditos manualmente</p>
          </div>
          {showManualRecharge ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showManualRecharge && (
          <CardContent className="pt-0 space-y-4">
            {!pixResult ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {RECHARGE_AMOUNTS.map(({ value, sales }) => (
                    <button
                      key={value}
                      onClick={() => setPixAmount(value)}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        pixAmount === value
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted/30 border border-border hover:border-primary/30"
                      }`}
                    >
                      <p className={`text-lg font-bold ${pixAmount === value ? "text-primary" : "text-foreground"}`}>
                        ~{sales}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{fmt(value)}</p>
                    </button>
                  ))}
                </div>
                <Button className="w-full font-semibold" onClick={handleGeneratePix} disabled={pixLoading}>
                  {pixLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
                    : <>Gerar PIX · {fmt(pixAmount)}</>
                  }
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                {pixResult.qr_code_url && (
                  <div className="p-3 bg-white rounded-xl">
                    <img src={pixResult.qr_code_url} alt="QR Code PIX" className="w-44 h-44 rounded" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{fmt(pixResult.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">~{toSales(pixResult.amount)} vendas · creditado em até 1 min</p>
                </div>
                {pixResult.pix_code && (
                  <Button variant="outline" className="w-full gap-2 font-semibold" onClick={handleCopyPix}>
                    {copying
                      ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Copiado!</>
                      : <><ClipboardCopy className="w-4 h-4" /> Copiar código PIX</>
                    }
                  </Button>
                )}
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setPixResult(null)}>
                  Gerar novo código
                </button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Transactions ── */}
      {transactions.length > 0 && (
        <Card>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full px-6 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Histórico</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{transactions.length}</Badge>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showHistory && (
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          {tx.type === "fee" ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span className="text-xs font-medium">{tx.type === "fee" ? "Taxa" : "Recarga"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                          {tx.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell className={`py-2.5 text-right text-xs font-semibold tabular-nums ${
                        tx.type === "fee" ? "text-destructive" : "text-primary"
                      }`}>
                        {tx.type === "fee" ? "-" : "+"}{fmt(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Tier Progression ── */}
      {tiers.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
          {tiers.map((t) => {
            const isCurrent = t.key === currentTierKey;
            const currentIdx = tiers.findIndex((x) => x.key === currentTierKey);
            const tIdx = tiers.findIndex((x) => x.key === t.key);
            const isPast = tIdx < currentIdx;

            return (
              <div key={t.key} className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full ${
                  isCurrent ? "bg-primary ring-2 ring-primary/20" : isPast ? "bg-primary/40" : "bg-border"
                }`} />
                <span className={`text-[11px] font-medium whitespace-nowrap ${
                  isCurrent ? "text-foreground font-semibold" : isPast ? "text-muted-foreground" : "text-muted-foreground/40"
                }`}>
                  {TIER_META[t.key]?.title ?? t.label}
                </span>
                {tIdx < tiers.length - 1 && <span className={`w-5 h-px ${isPast ? "bg-primary/30" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <p className="text-xs text-muted-foreground text-center">
        R$ 0,99 por venda aprovada · Sem mensalidade · Sem taxa escondida
        {isInFreeTrial && " · Primeiras 500 vendas grátis"}
      </p>

      {/* ── MODAL: CARD ── */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Adicionar cartão</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Validação de R$ 5,00 estornada imediatamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Número do cartão</label>
              <Input value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000" className={`${inputClass} font-mono`} maxLength={19} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome no cartão</label>
              <Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                placeholder="COMO ESTÁ NO CARTÃO" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mês</label>
                <Input value={cardForm.expiryMonth} onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ano</label>
                <Input value={cardForm.expiryYear} onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="AA" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CVV</label>
                <Input value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123" className={inputClass} maxLength={4} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CPF do titular</label>
              <Input value={cardForm.cpf} onChange={(e) => setCardForm({ ...cardForm, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00" className={inputClass} maxLength={14} />
            </div>
            <Button className="w-full gap-2 font-semibold" onClick={handleValidateCard} disabled={cardValidating}>
              {cardValidating ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : <><CreditCard className="w-4 h-4" /> Validar cartão</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerBilling;
