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
  CreditCard, Loader2, ClipboardCopy, CheckCircle2,
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
  const [showHistory, setShowHistory] = useState(false);
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Carregando</span>
      </div>
    </div>
  );

  const balance = account?.balance ?? 0;
  const salesCovered = toSales(balance);
  const hasAutoRecharge = account?.auto_recharge_enabled && !!account?.card_last4;
  const isBlocked = !!account?.blocked;
  const isDead = isBlocked || salesCovered <= 0;
  const isCritical = salesCovered > 0 && salesCovered < 10;
  const isLow = salesCovered >= 10 && salesCovered < 50;
  const currentTierKey = account?.credit_tier ?? "iron";
  const tierMeta = TIER_META[currentTierKey] ?? TIER_META.iron;
  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  // State color
  const stateColor = isDead ? "destructive" : isCritical ? "amber-500" : "primary";

  const RECHARGE_AMOUNTS = [
    { value: 20, label: "20 vendas" },
    { value: 50, label: "50 vendas" },
    { value: 100, label: "101 vendas" },
    { value: 200, label: "202 vendas" },
    { value: 500, label: "505 vendas" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-1">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — ONE THING: STATE + NUMBER
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden"
      >
        {/* Ambient state glow */}
        <div className={`absolute inset-0 pointer-events-none ${
          isDead ? "bg-gradient-to-b from-destructive/8 to-transparent" :
          isCritical ? "bg-gradient-to-b from-amber-500/8 to-transparent" :
          "bg-gradient-to-b from-primary/5 to-transparent"
        }`} />

        <div className="relative px-2 pt-8 pb-6 md:pt-12 md:pb-8">
          {/* Status line */}
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
              {isDead ? "Checkout parado" : isCritical ? "Últimas vendas" : hasAutoRecharge ? "Caçando vendas" : "Checkout ativo"}
            </span>
          </div>

          {/* THE NUMBER — massive, impossible to ignore */}
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
              {salesCovered === 1 ? "venda disponível" : "vendas disponíveis"}
            </p>
          </div>

          {/* One-line impact message */}
          <p className={`mt-6 text-base md:text-lg font-medium leading-snug max-w-md ${
            isDead ? "text-destructive" : isCritical ? "text-amber-500" : "text-muted-foreground"
          }`}>
            {isDead
              ? "Você não está vendendo. Cada minuto parado é dinheiro perdido."
              : isCritical
                ? "Seu checkout pode parar a qualquer momento."
                : isLow
                  ? `Seus créditos estão acabando. ${salesCovered} vendas restantes.`
                  : hasAutoRecharge
                    ? "Recarga automática ativa. Sua pantera nunca para."
                    : "Sua pantera está pronta. Vendas sendo capturadas."
            }
          </p>

          {/* PRIMARY CTA — big, unmissable */}
          <div className="mt-8">
            <Button
              onClick={() => setShowRecharge(true)}
              className={`h-14 md:h-16 px-10 rounded-2xl text-base md:text-lg font-black tracking-tight transition-all duration-300 ${
                isDead
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.4)]"
                  : isCritical
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_40px_rgba(245,158,11,0.3)]"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
              }`}
            >
              {isDead ? "Voltar a vender agora" : isCritical ? "Recarregar agora" : "Escolha quantas vendas quer fazer"}
            </Button>
          </div>

          {/* Tier badge — subtle */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-widest">
              {tierMeta.title} · R$ 0,99/venda · Sem mensalidade
            </span>
          </div>
        </div>
      </motion.div>

      {/* ━━━ RECHARGE — "Escolha quanto quer vender" ━━━ */}
      <AnimatePresence>
        {showRecharge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-foreground">Escolha quanto quer vender</h3>
                <p className="text-sm text-muted-foreground mt-1">Cada R$ 0,99 = 1 venda. Sem limite. Sem contrato.</p>
              </div>

              <Tabs defaultValue="pix">
                <TabsList className="bg-muted/30 p-1 rounded-xl">
                  <TabsTrigger value="pix" className="rounded-lg text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    PIX — instantâneo
                  </TabsTrigger>
                  <TabsTrigger value="card" className="rounded-lg text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Cartão
                  </TabsTrigger>
                </TabsList>

                {/* PIX TAB */}
                <TabsContent value="pix" className="mt-5 space-y-5">
                  {!pixResult ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {RECHARGE_AMOUNTS.map(({ value, label }) => (
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
                            }`}>{label.split(" ")[0]}</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">vendas · {fmt(value)}</p>
                          </button>
                        ))}
                      </div>

                      <Button className="w-full h-14 rounded-xl font-black text-base" onClick={handleGeneratePix} disabled={pixLoading}>
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
                </TabsContent>

                {/* CARD TAB */}
                <TabsContent value="card" className="mt-5 space-y-5">
                  {account?.card_last4 ? (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-bold text-foreground">{account.card_brand?.toUpperCase()} •••• {account.card_last4}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShowCardModal(true)}>Trocar</Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {RECHARGE_AMOUNTS.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setCardAmount(value)}
                            className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                              cardAmount === value
                                ? "bg-primary/10 border-2 border-primary ring-2 ring-primary/20"
                                : "bg-muted/20 border border-border hover:border-primary/30"
                            }`}
                          >
                            <p className={`text-2xl font-black tracking-tight ${
                              cardAmount === value ? "text-primary" : "text-foreground"
                            }`}>{label.split(" ")[0]}</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">vendas · {fmt(value)}</p>
                          </button>
                        ))}
                      </div>

                      <Button className="w-full h-14 rounded-xl font-black text-base" onClick={handleChargeCard} disabled={cardLoading}>
                        {cardLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando...</>
                          : <>Adicionar +{toSales(cardAmount)} vendas</>
                        }
                      </Button>

                      {/* Auto-Recharge */}
                      <div className="pt-5 border-t border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-black">Piloto automático</Label>
                            <p className="text-[11px] text-muted-foreground">Pantera nunca para de caçar</p>
                          </div>
                          <Switch checked={account.auto_recharge_enabled} onCheckedChange={handleToggleAutoRecharge} />
                        </div>

                        {account.auto_recharge_enabled && (
                          <div className="space-y-4 p-4 rounded-xl bg-muted/10 border border-border">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recarregar quando restar ≤</label>
                              <div className="flex gap-2">
                                {[3, 5, 10, 20].map((v) => (
                                  <button key={v} onClick={() => handleUpdateAutoRecharge('auto_recharge_threshold', v)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                      account.auto_recharge_threshold === v
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/30 border border-border text-foreground hover:border-primary/30"
                                    }`}
                                  >{fmt(v)}</button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor da recarga</label>
                              <div className="flex gap-2 flex-wrap">
                                {[20, 50, 100, 200].map((v) => (
                                  <button key={v} onClick={() => handleUpdateAutoRecharge('auto_recharge_amount', v)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                      account.auto_recharge_amount === v
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/30 border border-border text-foreground hover:border-primary/30"
                                    }`}
                                  >{fmt(v)} <span className="text-[10px] opacity-70 ml-1">≈{toSales(v)}v</span></button>
                                ))}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                              <p className="text-[11px] text-muted-foreground">
                                ⚡ Quando restar ≤ {fmt(account.auto_recharge_threshold)} → cobra +{fmt(account.auto_recharge_amount)} (~{toSales(account.auto_recharge_amount)} vendas) no •••• {account.card_last4}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado</p>
                      <Button variant="outline" className="font-bold" onClick={() => setShowCardModal(true)}>
                        Adicionar cartão
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━ 500 VENDAS GRÁTIS — power statement, not banner ━━━ */}
      {!showRecharge && (
        <div className="px-2 py-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-bold">Suas primeiras 500 vendas são gratuitas.</span>
            {" "}Depois disso, cada venda custa menos de R$ 1. Sem mensalidade. Sem taxa escondida. Você só paga quando vende.
          </p>
        </div>
      )}

      {/* ━━━ EXTRATO — collapsed by default ━━━ */}
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

      {/* ━━━ TIER — minimal line ━━━ */}
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

      {/* ━━━ MODAL: CARTÃO ━━━ */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black">Validar cartão</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">Cobrança de R$ 5,00 estornada imediatamente</DialogDescription>
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
              {cardValidating ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : "Validar cartão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerBilling;
