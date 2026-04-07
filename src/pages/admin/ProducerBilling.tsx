// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, QrCode, Loader2, ClipboardCopy, CheckCircle2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

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
const toSales = (reais: number) => Math.floor(reais / 0.99);
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

const TIER_META: Record<string, { title: string; glow: string }> = {
  iron:     { title: "Filhote",   glow: "from-muted-foreground/20 to-muted-foreground/5" },
  bronze:   { title: "Caçador",   glow: "from-amber-600/20 to-amber-600/5" },
  silver:   { title: "Predador",  glow: "from-slate-300/20 to-slate-300/5" },
  gold:     { title: "Alpha",     glow: "from-yellow-400/20 to-yellow-400/5" },
  platinum: { title: "Apex",      glow: "from-cyan-400/20 to-cyan-400/5" },
  diamond:  { title: "Lenda",     glow: "from-violet-400/20 to-violet-400/5" },
};

const TIER_COLORS: Record<string, { ring: string; text: string; dot: string }> = {
  gray:   { ring: "ring-muted-foreground/30", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  amber:  { ring: "ring-amber-500/40",        text: "text-amber-500",        dot: "bg-amber-500" },
  slate:  { ring: "ring-slate-300/40",         text: "text-slate-300",        dot: "bg-slate-300" },
  yellow: { ring: "ring-yellow-400/40",        text: "text-yellow-400",       dot: "bg-yellow-400" },
  cyan:   { ring: "ring-cyan-400/40",          text: "text-cyan-400",         dot: "bg-cyan-400" },
  violet: { ring: "ring-violet-400/40",        text: "text-violet-400",       dot: "bg-violet-400" },
};

// ── Amount Selector (shows sales equivalent) ──────
const RECHARGE_OPTIONS = [
  { value: 20, sales: toSales(20) },
  { value: 50, sales: toSales(50) },
  { value: 100, sales: toSales(100) },
  { value: 200, sales: toSales(200) },
  { value: 500, sales: toSales(500) },
];

const AmountSelector = ({ amounts, selected, onSelect, showSales = false }: { amounts: number[]; selected: number; onSelect: (v: number) => void; showSales?: boolean }) => (
  <div className="flex gap-2 flex-wrap">
    {amounts.map((v) => {
      const sales = toSales(v);
      return (
        <button key={v} onClick={() => onSelect(v)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            selected === v
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
              : 'bg-card border border-border hover:border-primary/50 text-foreground'
          }`}
        >
          <span>{fmt(v)}</span>
          {showSales && <span className="block text-[10px] opacity-70 font-normal">≈ {sales} vendas</span>}
        </button>
      );
    })}
  </div>
);

// ── Panther Status Indicator ───────────────────────
const PantherStatus = ({ status }: { status: "hunting" | "idle" | "paused" | "dead" }) => {
  const configs = {
    hunting: { color: "bg-primary", pulse: true, label: "Caçando" },
    idle:    { color: "bg-primary", pulse: false, label: "Pronta" },
    paused:  { color: "bg-amber-500", pulse: true, label: "Pausando" },
    dead:    { color: "bg-destructive", pulse: true, label: "Parada" },
  };
  const c = configs[status];
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {c.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.color} opacity-75`} />}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.color}`} />
      </span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{c.label}</span>
    </div>
  );
};

// ── Component ──────────────────────────────────────
const ProducerBilling = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixAmount, setPixAmount] = useState(50);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixResult, setPixResult] = useState<{ pix_code: string | null; qr_code_url: string | null; amount: number } | null>(null);
  const [copying, setCopying] = useState(false);
  const [cardAmount, setCardAmount] = useState(50);
  const [cardLoading, setCardLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [cardValidating, setCardValidating] = useState(false);
  const [cardForm, setCardForm] = useState({ number: "", name: "", expiryMonth: "", expiryYear: "", cvv: "", cpf: "" });

  useEffect(() => { if (user?.id) loadData(); }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: accs }, { data: txs }, { data: tierData }] = await Promise.all([
      supabase.from("billing_accounts").select("*").eq("user_id", user!.id).limit(1),
      supabase.from("billing_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("billing_tiers").select("*").order("level", { ascending: true }),
    ]);
    setAccount((accs?.[0] as unknown as BillingAccount) ?? null);
    setTransactions((txs as unknown as BillingTransaction[]) ?? []);
    setTiers((tierData as unknown as TierRow[]) ?? []);
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
      toast.success(`${fmt(cardAmount)} adicionados!`);
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
      toast.success(enabled ? "Recarga automática ativada!" : "Desativada");
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
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Carregando</span>
      </div>
    </div>
  );

  const balance = account?.balance ?? 0;
  const salesCovered = balance > 0 ? toSales(balance) : 0;
  const hasAutoRecharge = account?.auto_recharge_enabled && !!account?.card_last4;
  const isBlocked = !!account?.blocked;
  const currentTierKey = account?.credit_tier ?? "iron";
  const currentTier = tiers.find((t) => t.key === currentTierKey) ?? tiers[0];
  const tierColors = TIER_COLORS[currentTier?.color ?? "gray"] ?? TIER_COLORS.gray;
  const tierMeta = TIER_META[currentTierKey] ?? TIER_META.iron;
  const pantherStatus = isBlocked ? "dead" : salesCovered <= 0 ? "dead" : salesCovered < 10 ? "paused" : hasAutoRecharge ? "hunting" : "idle";
  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  // Usage bar
  const usagePercent = account?.credit_limit ? Math.min(100, (balance / account.credit_limit) * 100) : 0;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ━━━ HERO CARD — The Panther ━━━ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card"
      >
        {/* Ambient glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tierMeta.glow} pointer-events-none`} />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative p-6 md:p-8">
          {/* Top row: status + tier */}
          <div className="flex items-center justify-between mb-6">
            <PantherStatus status={pantherStatus} />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${tierColors.ring} bg-background/50 backdrop-blur-sm`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tierColors.dot}`} />
              <span className={`text-[11px] font-bold uppercase tracking-widest ${tierColors.text}`}>
                {currentTier?.label ?? "Iron"} · {tierMeta.title}
              </span>
            </div>
          </div>

          {/* The Number — in SALES */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Vendas disponíveis</span>
            <motion.p 
              key={salesCovered}
              initial={{ opacity: 0.5, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl md:text-6xl font-bold text-foreground tracking-tighter leading-none tabular-nums"
            >
              {salesCovered}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-1">
              {salesCovered > 0 ? `equivalente a ${fmt(balance)} em créditos` : "nenhum crédito disponível"}
            </p>
          </div>

          {/* Usage bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">
                {salesCovered === 0 
                  ? "Você não pode vender no momento" 
                  : salesCovered < 10
                    ? `Últimas ${salesCovered} vendas disponíveis`
                    : salesCovered < 50
                      ? `Seus créditos estão acabando — ${salesCovered} vendas restantes`
                      : `${salesCovered} vendas disponíveis`}
              </span>
              <span className="text-muted-foreground">Limite: {toSales(account?.credit_limit ?? 0)} vendas</span>
            </div>
            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  isBlocked || salesCovered <= 0 ? "bg-destructive" : salesCovered < 10 ? "bg-amber-500" : "bg-primary"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Urgency message */}
          <p className="text-sm mt-4 leading-relaxed">
            {isBlocked ? (
              <span className="text-destructive font-medium">Sua pantera está parada. Você está perdendo vendas agora.</span>
            ) : salesCovered <= 0 ? (
              <span className="text-destructive font-medium">Seus créditos gratuitos acabaram. Seu checkout está pausado.</span>
            ) : salesCovered < 10 ? (
              <span className="text-amber-500 font-medium">Últimas vendas disponíveis — seu checkout pode pausar a qualquer momento.</span>
            ) : salesCovered < 50 ? (
              <span className="text-amber-500 font-medium">Seus créditos estão acabando. Você ainda pode fazer {salesCovered} vendas.</span>
            ) : hasAutoRecharge ? (
              <span className="text-muted-foreground">Recarga automática ativa — pantera caça sem parar.</span>
            ) : (
              <span className="text-muted-foreground">Você tem {salesCovered} vendas disponíveis. Você só começa a pagar depois de usar todas.</span>
            )}
          </p>

          {/* CTA */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              className="gap-2 h-12 rounded-xl text-sm font-semibold px-8 flex-1 sm:flex-none"
              onClick={() => setShowRecharge(true)}
              variant={isBlocked || salesCovered < 10 ? "default" : "outline"}
            >
              {isBlocked || salesCovered <= 0 ? "Adicionar créditos e continuar vendendo" : salesCovered < 10 ? "Recarregar agora" : "Adicionar créditos"}
            </Button>
            {!showRecharge && account?.card_last4 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-12" onClick={() => setShowCardModal(true)}>
                •••• {account.card_last4}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            {isBlocked || salesCovered <= 0
              ? "Sem créditos, você não está vendendo"
              : `Cada venda custa R$ 0,99 · Recarregue a qualquer momento`
            }
          </p>
        </div>
      </motion.div>

      {/* ━━━ VALUE PROPS — Clean strip ━━━ */}
      <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
        {[
          { value: "R$ 0,99", sub: "por venda capturada" },
          { value: "R$ 0", sub: "mensalidade" },
          { value: "0%", sub: "taxa sobre gateway" },
        ].map((item) => (
          <div key={item.sub} className="bg-card p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wider">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ━━━ ISENÇÃO ━━━ */}
      <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-5">
        <p className="text-sm font-semibold text-foreground">Suas primeiras 500 vendas são 100% grátis</p>
        <p className="text-xs text-muted-foreground mt-1">Você só começa a pagar R$ 0,99 por venda depois de atingir 500 vendas aprovadas. Sem truques.</p>
      </div>

      {/* ━━━ RECHARGE PANEL ━━━ */}
      {showRecharge && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <Tabs defaultValue="pix">
            <div className="border-b border-border px-5 pt-4">
              <TabsList className="bg-transparent p-0 h-auto gap-6">
                <TabsTrigger value="pix" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-semibold">
                  PIX
                </TabsTrigger>
                <TabsTrigger value="card" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-semibold">
                  Cartão
                </TabsTrigger>
              </TabsList>
            </div>

            {/* PIX TAB */}
            <TabsContent value="pix" className="p-5 space-y-5 mt-0">
              {!pixResult ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</label>
                    <AmountSelector amounts={[20, 50, 100, 200, 500]} selected={pixAmount} onSelect={setPixAmount} showSales />
                  </div>
                  <Button className="w-full gap-2 h-12 rounded-xl font-semibold" onClick={handleGeneratePix} disabled={pixLoading}>
                    {pixLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                      : <>Gerar PIX · {fmt(pixAmount)}</>
                    }
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-5 py-2">
                  {pixResult.qr_code_url && (
                    <div className="p-3 bg-white rounded-2xl">
                      <img src={pixResult.qr_code_url} alt="QR Code PIX" className="w-44 h-44 rounded-lg" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">{fmt(pixResult.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Escaneie ou copie o código</p>
                  </div>
                  {pixResult.pix_code && (
                    <Button variant="outline" className="w-full gap-2 rounded-xl h-11" onClick={handleCopyPix}>
                      {copying
                        ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Copiado!</>
                        : <><ClipboardCopy className="w-4 h-4" /> Copiar código PIX</>
                      }
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">Creditado em até 1 minuto</p>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPixResult(null)}>Gerar novo</Button>
                </div>
              )}
            </TabsContent>

            {/* CARD TAB */}
            <TabsContent value="card" className="p-5 space-y-5 mt-0">
              {account?.card_last4 ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-6 rounded bg-muted flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{account.card_brand?.toUpperCase()} •••• {account.card_last4}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShowCardModal(true)}>Trocar</Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</label>
                    <AmountSelector amounts={[20, 50, 100, 200, 500]} selected={cardAmount} onSelect={setCardAmount} />
                  </div>

                  <Button className="w-full gap-2 h-12 rounded-xl font-semibold" onClick={handleChargeCard} disabled={cardLoading}>
                    {cardLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                      : <>Adicionar {fmt(cardAmount)}</>
                    }
                  </Button>

                  {/* Auto-Recharge */}
                  <div className="pt-4 border-t border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Recarga automática</Label>
                        <p className="text-[11px] text-muted-foreground">Pantera nunca para</p>
                      </div>
                      <Switch checked={account.auto_recharge_enabled} onCheckedChange={handleToggleAutoRecharge} />
                    </div>

                    {account.auto_recharge_enabled && (
                      <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Recarregar quando ≤</label>
                          <AmountSelector amounts={[3, 5, 10, 20]} selected={account.auto_recharge_threshold} onSelect={(v) => handleUpdateAutoRecharge('auto_recharge_threshold', v)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Valor</label>
                          <AmountSelector amounts={[20, 50, 100, 200]} selected={account.auto_recharge_amount} onSelect={(v) => handleUpdateAutoRecharge('auto_recharge_amount', v)} />
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <p className="text-[11px] text-muted-foreground">
                            Saldo ≤ {fmt(account.auto_recharge_threshold)} → +{fmt(account.auto_recharge_amount)} no •••• {account.card_last4}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-border/50">
                  <span className="text-sm text-muted-foreground">Nenhum cartão</span>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCardModal(true)}>
                    Adicionar
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {/* ━━━ EXTRATO ━━━ */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Histórico</h3>
            <span className="text-[11px] text-muted-foreground">{transactions.length}</span>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  tx.type === "fee" ? "bg-destructive" : "bg-primary"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tx.type === "fee" ? "Venda capturada" : "Recarga"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tx.description || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${tx.type === "fee" ? "text-destructive" : "text-primary"}`}>
                    {tx.type === "fee" ? "-" : "+"}{fmt(Math.abs(tx.amount))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ TIER PROGRESSION ━━━ */}
      {tiers.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Evolução</h3>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tiers.map((t) => {
              const isCurrent = t.key === currentTierKey;
              const tc = TIER_COLORS[t.color] ?? TIER_COLORS.gray;
              const currentIdx = tiers.findIndex((x) => x.key === currentTierKey);
              const tIdx = tiers.findIndex((x) => x.key === t.key);
              const isUnlocked = tIdx <= currentIdx;

              return (
                <div key={t.key}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl min-w-[72px] transition-all ${
                    isCurrent
                      ? `ring-1 ${tc.ring} bg-card`
                      : isUnlocked
                        ? "bg-card/30"
                        : "opacity-20"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isCurrent ? tc.dot : "bg-muted-foreground/30"}`} />
                  <span className={`text-[11px] font-bold ${isCurrent ? tc.text : "text-muted-foreground"}`}>{t.label}</span>
                  <span className={`text-[9px] ${isCurrent ? `${tc.text} opacity-70` : "text-muted-foreground/50"}`}>
                    {TIER_META[t.key]?.title ?? ""}
                  </span>
                  <span className={`text-[10px] tabular-nums ${isCurrent ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {fmt(t.credit_limit)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ MODAL: CARTÃO ━━━ */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Validar cartão</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">Cobrança de R$ 5,00 estornada imediatamente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Número</label>
              <Input value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000" className={`${inputClass} font-mono tracking-wider`} maxLength={19} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Nome no cartão</label>
              <Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                placeholder="COMO ESTÁ NO CARTÃO" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Mês</label>
                <Input value={cardForm.expiryMonth} onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Ano</label>
                <Input value={cardForm.expiryYear} onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="AA" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">CVV</label>
                <Input value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123" className={inputClass} maxLength={4} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">CPF do titular</label>
              <Input value={cardForm.cpf} onChange={(e) => setCardForm({ ...cardForm, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00" className={inputClass} maxLength={14} />
            </div>
            <Button className="w-full gap-2 h-12 rounded-xl font-semibold" onClick={handleValidateCard} disabled={cardValidating}>
              {cardValidating ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : "Validar cartão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerBilling;
