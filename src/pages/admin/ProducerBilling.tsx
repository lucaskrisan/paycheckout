import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, QrCode, ArrowUpRight, ArrowDownLeft,
  Loader2, ClipboardCopy, CheckCircle2, Info, RefreshCw,
  Sparkles, Shield, Zap, Crown, Wallet, AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

const TIER_ICONS: Record<string, React.ReactNode> = {
  iron: <Shield className="w-3.5 h-3.5" />, bronze: <Zap className="w-3.5 h-3.5" />,
  silver: <Sparkles className="w-3.5 h-3.5" />, gold: <Crown className="w-3.5 h-3.5" />,
  platinum: <Crown className="w-3.5 h-3.5" />, diamond: <Crown className="w-3.5 h-3.5" />,
};

const TIER_SUBTITLES: Record<string, string> = {
  iron: "Filhote", bronze: "Caçador", silver: "Predador",
  gold: "Alpha", platinum: "Apex", diamond: "Lenda",
};

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  gray:   { text: "text-muted-foreground", bg: "bg-muted-foreground/10", border: "border-muted-foreground/20" },
  amber:  { text: "text-amber-500",        bg: "bg-amber-500/10",       border: "border-amber-500/20" },
  slate:  { text: "text-slate-300",         bg: "bg-slate-300/10",       border: "border-slate-300/20" },
  yellow: { text: "text-yellow-400",        bg: "bg-yellow-400/10",      border: "border-yellow-400/20" },
  cyan:   { text: "text-cyan-400",          bg: "bg-cyan-400/10",        border: "border-cyan-400/20" },
  violet: { text: "text-violet-400",        bg: "bg-violet-400/10",      border: "border-violet-400/20" },
};

// ── Amount Selector ────────────────────────────────
const AmountSelector = ({ amounts, selected, onSelect }: { amounts: number[]; selected: number; onSelect: (v: number) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {amounts.map((v) => (
      <button key={v} onClick={() => onSelect(v)}
        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          selected === v
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
            : 'bg-card border border-border hover:border-primary/50 text-foreground'
        }`}
      >{fmt(v)}</button>
    ))}
  </div>
);

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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const balance = account?.balance ?? 0;
  const salesCovered = balance > 0 ? Math.floor(balance / 0.99) : 0;
  const hasAutoRecharge = account?.auto_recharge_enabled && !!account?.card_last4;
  const isBlocked = !!account?.blocked;
  const currentTierKey = account?.credit_tier ?? "iron";
  const currentTier = tiers.find((t) => t.key === currentTierKey) ?? tiers[0];
  const colors = COLOR_MAP[currentTier?.color ?? "gray"] ?? COLOR_MAP.gray;
  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ━━━ BLOCO 1: O NÚMERO ━━━ */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative">
          {/* Label + Tier */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Seus créditos</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
              {TIER_ICONS[currentTierKey] || <Shield className="w-3 h-3" />}
              {currentTier?.label ?? "Iron"}
            </div>
          </div>

          {/* Big Number */}
          <p className="text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-none">
            {fmt(balance)}
          </p>

          {/* Sales covered — always visible */}
          <p className="text-lg font-semibold text-muted-foreground mt-2">
            {salesCovered === 0 ? "Você não pode vender no momento" : `≈ ${salesCovered} ${salesCovered === 1 ? 'captura disponível' : 'capturas disponíveis'} 🐆`}
          </p>

          {/* Urgency line */}
          <p className="text-sm mt-1.5">
            {isBlocked ? (
              <span className="text-destructive font-semibold">🐾 Pantera parada — você está perdendo vendas agora</span>
            ) : balance <= 0 ? (
              <span className="text-destructive font-medium">Sua Pantera está parada. Nenhuma venda está sendo capturada.</span>
            ) : balance < 10 ? (
              <span className="text-amber-400 font-medium">Energia acabando — recarregue antes que a Pantera pause</span>
            ) : hasAutoRecharge ? (
              <span className="text-primary">🐆 Pantera em modo automático ✓</span>
            ) : (
              <span className="text-muted-foreground">🐆 Pantera pronta para atacar</span>
            )}
          </p>

          {/* Single CTA */}
          <Button
            className="mt-5 gap-2 h-12 rounded-xl text-sm font-semibold w-full md:w-auto px-8"
            onClick={() => setShowRecharge(true)}
            variant={isBlocked || balance < 10 ? "default" : "outline"}
          >
            <Wallet className="w-4 h-4" />
            {isBlocked ? "Reativar a Pantera — adicionar créditos" : "Recarregar energia"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {isBlocked || balance <= 0
              ? "Recarregue agora e volte a caçar vendas"
              : balance < 10
                ? "Recarregue e continue caçando sem parar"
                : "Mantenha sua Pantera sempre pronta para atacar"
            }
          </p>
        </div>
      </div>

      {/* ━━━ BLOCO 2: ISENÇÃO — HEADLINE ━━━ */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Seus primeiros R$ 1.000 são 100% livres de taxa</h3>
            <p className="text-sm text-muted-foreground mt-1">Você só começa a pagar depois de atingir R$ 1.000 em faturamento aprovado.</p>
          </div>
        </div>
      </div>

      {/* ━━━ BLOCO 3: RESUMO — SIMPLES ━━━ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">R$ 0,99</p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">menos de R$1 por venda</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">R$ 0</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">sem mensalidade</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">0%</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">sem taxa escondida</p>
        </div>
      </div>

      {/* ━━━ BLOCO 4: RECARGA (expandível) ━━━ */}
      {showRecharge && (
        <Card className="rounded-2xl border-border overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="pix">
              <div className="border-b border-border p-4 pb-0">
                <TabsList className="bg-transparent p-0 h-auto gap-4">
                  <TabsTrigger value="card" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 gap-2 text-sm font-semibold">
                    <CreditCard className="w-4 h-4" /> Cartão
                  </TabsTrigger>
                  <TabsTrigger value="pix" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 gap-2 text-sm font-semibold">
                    <QrCode className="w-4 h-4" /> PIX
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* CARD TAB */}
              <TabsContent value="card" className="p-5 space-y-5 mt-0">
                {account?.card_last4 ? (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 rounded-lg bg-muted flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{account.card_brand?.toUpperCase()} •••• {account.card_last4}</p>
                          <p className="text-[11px] text-muted-foreground">Validado</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowCardModal(true)}>Trocar</Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Quanto adicionar?</label>
                      <AmountSelector amounts={[20, 50, 100, 200, 500]} selected={cardAmount} onSelect={setCardAmount} />
                    </div>

                    <Button className="w-full gap-2 h-12 rounded-xl font-semibold" onClick={handleChargeCard} disabled={cardLoading}>
                      {cardLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                        : <><CreditCard className="w-4 h-4" /> Adicionar {fmt(cardAmount)}</>
                      }
                    </Button>

                    {/* Auto-Recharge */}
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Piloto automático</Label>
                            <p className="text-[11px] text-muted-foreground">Nunca mais pense em créditos</p>
                          </div>
                        </div>
                        <Switch checked={account.auto_recharge_enabled} onCheckedChange={handleToggleAutoRecharge} />
                      </div>

                      {account.auto_recharge_enabled && (
                        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recarregar quando créditos ≤</label>
                            <AmountSelector amounts={[3, 5, 10, 20]} selected={account.auto_recharge_threshold} onSelect={(v) => handleUpdateAutoRecharge('auto_recharge_threshold', v)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor adicionado</label>
                            <AmountSelector amounts={[20, 50, 100, 200]} selected={account.auto_recharge_amount} onSelect={(v) => handleUpdateAutoRecharge('auto_recharge_amount', v)} />
                          </div>
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Créditos ≤ {fmt(account.auto_recharge_threshold)} → adiciona {fmt(account.auto_recharge_amount)} no •••• {account.card_last4}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowCardModal(true)}>
                      Adicionar
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* PIX TAB */}
              <TabsContent value="pix" className="p-5 space-y-5 mt-0">
                {!pixResult ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Quanto adicionar?</label>
                      <AmountSelector amounts={[20, 50, 100, 200, 500]} selected={pixAmount} onSelect={setPixAmount} />
                    </div>
                    <Button className="w-full gap-2 h-12 rounded-xl font-semibold" onClick={handleGeneratePix} disabled={pixLoading}>
                      {pixLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                        : <><QrCode className="w-4 h-4" /> Gerar PIX — {fmt(pixAmount)}</>
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
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ━━━ BLOCO 5: EXTRATO ━━━ */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Extrato</h3>
            <span className="text-xs text-muted-foreground">{transactions.length} registros</span>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  tx.type === "fee" ? "bg-destructive/10" : "bg-primary/10"
                }`}>
                  {tx.type === "fee"
                    ? <ArrowUpRight className="w-4 h-4 text-destructive" />
                    : <ArrowDownLeft className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tx.type === "fee" ? "Captura realizada" : "Recarga de energia"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tx.description || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${tx.type === "fee" ? "text-destructive" : "text-primary"}`}>
                    {tx.type === "fee" ? "-" : "+"}{fmt(Math.abs(tx.amount))}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ BLOCO 6: TIER PROGRESSION (compacto) ━━━ */}
      {tiers.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-sm font-semibold text-foreground">Nível da Pantera</h3>
            <p className="text-xs text-muted-foreground">Quanto mais evolui, mais caça sem risco de parar</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {tiers.map((t) => {
              const isCurrent = t.key === currentTierKey;
              const c = COLOR_MAP[t.color] ?? COLOR_MAP.gray;
              const currentIdx = tiers.findIndex((x) => x.key === currentTierKey);
              const tIdx = tiers.findIndex((x) => x.key === t.key);
              const isUnlocked = tIdx <= currentIdx;

              return (
                <div key={t.key}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border min-w-[80px] transition-all ${
                    isCurrent
                      ? `${c.bg} ${c.border} shadow-lg`
                      : isUnlocked
                        ? "border-border/40 bg-card/50"
                        : "border-border/10 opacity-30"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCurrent ? `${c.bg} ${c.text}` : "bg-muted text-muted-foreground"}`}>
                    {TIER_ICONS[t.key] || <Shield className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-[11px] font-bold ${isCurrent ? c.text : "text-muted-foreground"}`}>{t.label}</span>
                  <span className={`text-[9px] ${isCurrent ? `${c.text} opacity-80` : "text-muted-foreground"}`}>{TIER_SUBTITLES[t.key] || ""}</span>
                  <span className={`text-[10px] ${isCurrent ? c.text : "text-muted-foreground"}`}>{fmt(t.credit_limit)}</span>
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
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Validar Cartão</DialogTitle>
            <DialogDescription className="text-center text-xs">Validação de R$ 5,00 — estornada imediatamente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Número</label>
              <Input value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000" className={`${inputClass} font-mono tracking-wider`} maxLength={19} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nome no Cartão</label>
              <Input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                placeholder="COMO ESTÁ NO CARTÃO" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Mês</label>
                <Input value={cardForm.expiryMonth} onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Ano</label>
                <Input value={cardForm.expiryYear} onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="AA" className={inputClass} maxLength={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">CVV</label>
                <Input value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123" className={inputClass} maxLength={4} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">CPF do Titular</label>
              <Input value={cardForm.cpf} onChange={(e) => setCardForm({ ...cardForm, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00" className={inputClass} maxLength={14} />
            </div>
            <Button className="w-full gap-2 h-12 rounded-xl font-semibold" onClick={handleValidateCard} disabled={cardValidating}>
              {cardValidating ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : "Validar Cartão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerBilling;
