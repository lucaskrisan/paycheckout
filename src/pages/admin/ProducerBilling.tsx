// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, Loader2, ClipboardCopy, CheckCircle2, Shield, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

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
      // Auto-enable auto recharge after card validation
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
      toast.success(enabled ? "Vendas automáticas ativadas!" : "Desativada");
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
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Carregando</span>
      </div>
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
  const isLow = salesCovered >= 10 && salesCovered < 50;
  const currentTierKey = account?.credit_tier ?? "iron";
  const tierMeta = TIER_META[currentTierKey] ?? TIER_META.iron;
  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  // Continuity state: the KEY differentiator
  const isContinuous = hasAutoRecharge; // The goal state
  const needsCard = !hasCard;
  const needsAutoRecharge = hasCard && !account?.auto_recharge_enabled;

  return (
    <div className="max-w-2xl mx-auto space-y-1">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — STATUS + CONTINUITY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden"
      >
        <div className={`absolute inset-0 pointer-events-none ${
          isDead ? "bg-gradient-to-b from-destructive/8 to-transparent" :
          isCritical ? "bg-gradient-to-b from-amber-500/8 to-transparent" :
          isContinuous ? "bg-gradient-to-b from-primary/5 to-transparent" :
          "bg-gradient-to-b from-primary/3 to-transparent"
        }`} />

        <div className="relative px-2 pt-8 pb-6 md:pt-12 md:pb-8">
          {/* Status indicator */}
          <div className="flex items-center gap-3 mb-8">
            <span className="relative flex h-3 w-3">
              {(isDead || isCritical) && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isDead ? "bg-destructive" : "bg-amber-500"
                } opacity-60`} />
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                isDead ? "bg-destructive" : isCritical ? "bg-amber-500" : "bg-primary"
              }`} />
            </span>
            <span className={`text-sm font-bold uppercase tracking-[0.15em] ${
              isDead ? "text-destructive" : isCritical ? "text-amber-500" : "text-primary"
            }`}>
              {isDead
                ? "Checkout pausado"
                : isCritical
                  ? "Atenção — últimas vendas"
                  : isContinuous
                    ? "Venda contínua ativa"
                    : "Checkout ativo"
              }
            </span>
          </div>

          {/* THE NUMBER */}
          <div className="space-y-2">
            <motion.p
              key={salesCovered}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`text-[5rem] md:text-[7rem] font-black leading-none tracking-tighter tabular-nums ${
                isDead ? "text-destructive/90" : "text-foreground"
              }`}
            >
              {salesCovered}
            </motion.p>
            <p className={`text-lg font-medium tracking-tight ${
              isDead ? "text-destructive/70" : "text-muted-foreground"
            }`}>
              {isInFreeTrial ? "vendas gratuitas disponíveis" : salesCovered === 1 ? "venda disponível" : "vendas disponíveis"}
            </p>
          </div>

          {/* Free trial badge */}
          {isInFreeTrial && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">Primeiras 500 vendas grátis</span>
            </div>
          )}

          {/* Context message — continuity focused */}
          <p className={`mt-6 text-base md:text-lg font-medium leading-snug max-w-md ${
            isDead ? "text-destructive" : isCritical ? "text-amber-500" : "text-muted-foreground"
          }`}>
            {isDead && needsCard
              ? "Você parou de vender. Adicione um cartão para manter suas vendas automáticas."
              : isDead && hasCard
                ? "Suas vendas serão retomadas automaticamente."
                : isCritical
                  ? "Seu checkout pode parar a qualquer momento."
                  : isLow
                    ? `Créditos acabando. ${salesCovered} vendas restantes.`
                    : isContinuous
                      ? "Seu checkout está funcionando sem interrupções."
                      : isInFreeTrial
                        ? "Você só começa a pagar depois de usar todas as vendas gratuitas."
                        : "Suas vendas estão acontecendo normalmente."
            }
          </p>

          {/* PRIMARY CTA — context-aware */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {isDead && needsCard ? (
              <>
                <Button
                  onClick={() => setShowCardModal(true)}
                  className="h-14 md:h-16 px-10 rounded-2xl text-base md:text-lg font-black tracking-tight bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.4)] transition-all duration-300"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Ativar vendas automáticas
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowManualRecharge(true)}
                  className="h-14 px-6 rounded-2xl text-sm font-bold text-muted-foreground"
                >
                  Recarregar manualmente
                </Button>
              </>
            ) : isDead && hasCard ? (
              <Button
                onClick={handleChargeCard}
                disabled={cardLoading}
                className="h-14 md:h-16 px-10 rounded-2xl text-base md:text-lg font-black tracking-tight bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_0_40px_rgba(239,68,68,0.3)] transition-all duration-300"
              >
                {cardLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Recarregando...</> : "Recarregar e continuar vendendo"}
              </Button>
            ) : isCritical ? (
              <Button
                onClick={() => hasCard ? handleChargeCard() : setShowCardModal(true)}
                disabled={cardLoading}
                className="h-14 md:h-16 px-10 rounded-2xl text-base md:text-lg font-black tracking-tight bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all duration-300"
              >
                {cardLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando...</> : hasCard ? "Recarregar agora" : "Ativar vendas automáticas"}
              </Button>
            ) : !isContinuous ? (
              <Button
                onClick={() => needsCard ? setShowCardModal(true) : handleToggleAutoRecharge(true)}
                className="h-14 md:h-16 px-10 rounded-2xl text-base md:text-lg font-black tracking-tight bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300"
              >
                <Shield className="w-5 h-5 mr-2" />
                {needsCard ? "Ativar vendas automáticas" : "Ativar venda contínua"}
              </Button>
            ) : null}
          </div>

          {/* Tier line */}
          <div className="mt-6">
            <span className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-widest">
              {tierMeta.title} · R$ 0,99/venda · Sem mensalidade
            </span>
          </div>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CARD/CONTINUITY BLOCK — THE MAIN THING
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="px-2">
        {isContinuous ? (
          /* ── CONTINUOUS MODE: everything is good ── */
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Venda contínua ativa</p>
                  <p className="text-xs text-muted-foreground">Seu checkout nunca para</p>
                </div>
              </div>
              <Switch checked={true} onCheckedChange={handleToggleAutoRecharge} />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/50">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{account?.card_brand?.toUpperCase()} •••• {account?.card_last4}</span>
              <button onClick={() => setShowCardModal(true)} className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors">Trocar</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recarregar quando restar</label>
                <div className="flex gap-2">
                  {[3, 5, 10, 20].map((v) => (
                    <button key={v} onClick={() => handleUpdateAutoRecharge('auto_recharge_threshold', v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        account?.auto_recharge_threshold === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 border border-border text-foreground hover:border-primary/30"
                      }`}
                    >{toSales(v)} vendas</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor da recarga automática</label>
                <div className="flex gap-2 flex-wrap">
                  {[20, 50, 100, 200].map((v) => (
                    <button key={v} onClick={() => handleUpdateAutoRecharge('auto_recharge_amount', v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        account?.auto_recharge_amount === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 border border-border text-foreground hover:border-primary/30"
                      }`}
                    >~{toSales(v)} vendas</button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              ⚡ Quando restar ≤ {toSales(account?.auto_recharge_threshold ?? 5)} vendas → recarrega automaticamente ~{toSales(account?.auto_recharge_amount ?? 50)} vendas no •••• {account?.card_last4}
            </p>
          </div>
        ) : hasCard && needsAutoRecharge ? (
          /* ── HAS CARD, NEEDS AUTO-RECHARGE ── */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{account?.card_brand?.toUpperCase()} •••• {account?.card_last4}</span>
              <button onClick={() => setShowCardModal(true)} className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors">Trocar</button>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm font-black text-foreground">Ative a venda contínua</p>
              <p className="text-xs text-muted-foreground mt-1">Seu checkout recarrega sozinho. Você nunca para de vender.</p>
              <Button onClick={() => handleToggleAutoRecharge(true)} className="mt-3 h-10 rounded-xl font-bold text-sm gap-2">
                <Zap className="w-4 h-4" /> Ativar agora
              </Button>
            </div>
          </div>
        ) : needsCard ? (
          /* ── NO CARD: push for card ── */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Nunca pare de vender</p>
                <p className="text-xs text-muted-foreground">Adicione um cartão e ative recarga automática</p>
              </div>
            </div>
            <Button onClick={() => setShowCardModal(true)} className="w-full h-12 rounded-xl font-black text-sm gap-2">
              <Zap className="w-4 h-4" /> Adicionar cartão e ativar
            </Button>
          </div>
        ) : null}
      </div>

      {/* ━━━ MANUAL RECHARGE — secondary, subtle ━━━ */}
      <div className="px-2">
        <button
          onClick={() => setShowManualRecharge(!showManualRecharge)}
          className="flex items-center justify-between w-full py-3 group"
        >
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
            {showManualRecharge ? "Fechar recarga manual" : "Preferir recarregar manualmente?"}
          </span>
          <span className={`text-xs text-muted-foreground transition-transform ${showManualRecharge ? "rotate-180" : ""}`}>▼</span>
        </button>

        <AnimatePresence>
          {showManualRecharge && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                {!pixResult ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {RECHARGE_AMOUNTS.map(({ value, sales }) => (
                        <button
                          key={value}
                          onClick={() => setPixAmount(value)}
                          className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                            pixAmount === value
                              ? "bg-primary/10 border-2 border-primary ring-2 ring-primary/20"
                              : "bg-muted/20 border border-border hover:border-primary/30"
                          }`}
                        >
                          <p className={`text-2xl font-black tracking-tight ${
                            pixAmount === value ? "text-primary" : "text-foreground"
                          }`}>~{sales}</p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">vendas · {fmt(value)}</p>
                        </button>
                      ))}
                    </div>

                    <Button className="w-full h-12 rounded-xl font-black text-sm" onClick={handleGeneratePix} disabled={pixLoading}>
                      {pixLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
                        : <>Gerar PIX · +{toSales(pixAmount)} vendas</>
                      }
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-5 py-4">
                    {pixResult.qr_code_url && (
                      <div className="p-3 bg-white rounded-2xl shadow-lg">
                        <img src={pixResult.qr_code_url} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-3xl font-black text-foreground">+{toSales(pixResult.amount)} vendas</p>
                      <p className="text-sm text-muted-foreground mt-1">{fmt(pixResult.amount)} · creditado em até 1 minuto</p>
                    </div>
                    {pixResult.pix_code && (
                      <Button variant="outline" className="w-full gap-2 rounded-xl h-12 font-bold" onClick={handleCopyPix}>
                        {copying
                          ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Copiado!</>
                          : <><ClipboardCopy className="w-4 h-4" /> Copiar código PIX</>
                        }
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setPixResult(null)}>Gerar novo</Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ━━━ VALUE PROP — one line ━━━ */}
      <div className="px-2 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-bold">Menos de R$ 1 por venda.</span>
          {" "}Sem mensalidade. Sem taxa escondida. Você só paga quando vende.
          {isInFreeTrial && <> Suas primeiras 500 vendas são gratuitas.</>}
        </p>
      </div>

      {/* ━━━ HISTORY — collapsed ━━━ */}
      {transactions.length > 0 && (
        <div className="px-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full py-3 group"
          >
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
              Histórico · {transactions.length}
            </span>
            <span className={`text-xs text-muted-foreground transition-transform ${showHistory ? "rotate-180" : ""}`}>▼</span>
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        tx.type === "fee" ? "bg-destructive" : "bg-primary"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{tx.type === "fee" ? "Venda capturada" : "Recarga"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{tx.description || "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black tabular-nums ${tx.type === "fee" ? "text-destructive" : "text-primary"}`}>
                          {tx.type === "fee" ? "-" : "+"}{fmt(Math.abs(tx.amount))}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ━━━ TIER PROGRESSION ━━━ */}
      {tiers.length > 0 && (
        <div className="px-2 pt-4 pb-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {tiers.map((t) => {
              const isCurrent = t.key === currentTierKey;
              const currentIdx = tiers.findIndex((x) => x.key === currentTierKey);
              const tIdx = tiers.findIndex((x) => x.key === t.key);
              const isPast = tIdx < currentIdx;

              return (
                <div key={t.key} className="flex items-center gap-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${
                    isCurrent ? "bg-primary ring-4 ring-primary/20" : isPast ? "bg-primary/40" : "bg-border"
                  }`} />
                  <span className={`text-[11px] font-bold whitespace-nowrap ${
                    isCurrent ? "text-foreground" : isPast ? "text-muted-foreground" : "text-muted-foreground/30"
                  }`}>
                    {TIER_META[t.key]?.title ?? t.label}
                  </span>
                  {tIdx < tiers.length - 1 && (
                    <span className={`w-6 h-px ${isPast ? "bg-primary/30" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ MODAL: CARD ━━━ */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black">Ativar vendas automáticas</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">Validação de R$ 5,00 estornada imediatamente · Seu checkout nunca para</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Número</label>
              <Input value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000" className={`${inputClass} font-mono tracking-wider`} maxLength={19} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Nome no cartão</label>
              <Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                placeholder="COMO ESTÁ NO CARTÃO" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Mês</label>
                <Input value={cardForm.expiryMonth} onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Ano</label>
                <Input value={cardForm.expiryYear} onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="AA" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">CVV</label>
                <Input value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123" className={inputClass} maxLength={4} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">CPF do titular</label>
              <Input value={cardForm.cpf} onChange={(e) => setCardForm({ ...cardForm, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00" className={inputClass} maxLength={14} />
            </div>
            <Button className="w-full gap-2 h-14 rounded-xl font-black text-base" onClick={handleValidateCard} disabled={cardValidating}>
              {cardValidating ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : <><Zap className="w-4 h-4" /> Ativar vendas automáticas</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerBilling;
