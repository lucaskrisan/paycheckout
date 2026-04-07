import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, TrendingUp, QrCode, Receipt, ArrowUpRight, ArrowDownLeft,
  Loader2, ClipboardCopy, CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw,
  Sparkles, Shield, Zap, Crown, ChevronRight, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TierRow {
  key: string;
  label: string;
  credit_limit: number;
  level: number;
  color: string;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  iron: <Shield className="w-4 h-4" />,
  bronze: <Zap className="w-4 h-4" />,
  silver: <Sparkles className="w-4 h-4" />,
  gold: <Crown className="w-4 h-4" />,
  platinum: <Crown className="w-4 h-4" />,
  diamond: <Crown className="w-4 h-4" />,
};

const TIER_GRADIENTS: Record<string, string> = {
  gray: "from-muted-foreground/20 to-muted-foreground/5",
  amber: "from-amber-500/20 to-amber-600/5",
  slate: "from-slate-300/20 to-slate-400/5",
  yellow: "from-yellow-400/20 to-yellow-500/5",
  cyan: "from-cyan-400/20 to-cyan-500/5",
  violet: "from-violet-400/20 to-violet-500/5",
};

const COLOR_MAP: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  gray:   { text: "text-muted-foreground", border: "border-muted-foreground/30", bg: "bg-muted-foreground/10", glow: "" },
  amber:  { text: "text-amber-500",        border: "border-amber-500/30",        bg: "bg-amber-500/10",       glow: "shadow-amber-500/10" },
  slate:  { text: "text-slate-300",         border: "border-slate-300/30",        bg: "bg-slate-300/10",       glow: "shadow-slate-300/10" },
  yellow: { text: "text-yellow-400",        border: "border-yellow-400/30",       bg: "bg-yellow-400/10",      glow: "shadow-yellow-400/10" },
  cyan:   { text: "text-cyan-400",          border: "border-cyan-400/30",         bg: "bg-cyan-400/10",        glow: "shadow-cyan-400/10" },
  violet: { text: "text-violet-400",        border: "border-violet-400/30",       bg: "bg-violet-400/10",      glow: "shadow-violet-400/10" },
};

interface BillingAccount {
  id: string;
  balance: number;
  credit_tier: string;
  credit_limit: number;
  blocked: boolean;
  card_last4: string | null;
  card_brand: string | null;
  auto_recharge_enabled: boolean;
  auto_recharge_amount: number;
  auto_recharge_threshold: number;
}

interface BillingTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || fallback;
  if (Array.isArray(error)) {
    const message = error.map((item) => getErrorMessage(item, "")).filter(Boolean).join(" ");
    return message || fallback;
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const preferred = getErrorMessage(record.description ?? record.message ?? record.error, "");
    if (preferred) return preferred;
    const nested = Object.values(record).map((value) => getErrorMessage(value, "")).filter(Boolean).join(" ");
    return nested || fallback;
  }
  return fallback;
};

const ProducerBilling = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixAmount, setPixAmount] = useState<number>(50);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixResult, setPixResult] = useState<{ pix_code: string | null; qr_code_url: string | null; amount: number } | null>(null);
  const [copying, setCopying] = useState(false);
  const [cardAmount, setCardAmount] = useState<number>(50);
  const [cardLoading, setCardLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
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

  const handleValidateCard = async () => {
    if (!cardForm.number || !cardForm.name || !cardForm.expiryMonth || !cardForm.expiryYear || !cardForm.cvv || !cardForm.cpf) {
      toast.error("Preencha todos os campos do cartão"); return;
    }
    setCardValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-validate-card', {
        body: { card_number: cardForm.number.replace(/\s/g, ''), card_name: cardForm.name, card_expiry_month: cardForm.expiryMonth, card_expiry_year: cardForm.expiryYear, card_cvv: cardForm.cvv, card_cpf: cardForm.cpf.replace(/\D/g, '') },
      });
      const functionError = (data as { error?: unknown; success?: boolean } | null)?.error;
      if (error || functionError || !data?.success) throw new Error(getErrorMessage(functionError ?? error, 'Erro ao validar cartão'));
      toast.success(`Cartão •••• ${data.card_last4} validado com sucesso!`);
      setShowCardModal(false);
      setCardForm({ number: "", name: "", expiryMonth: "", expiryYear: "", cvv: "", cpf: "" });
      loadData();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Erro ao validar cartão')); }
    finally { setCardValidating(false); }
  };

  const handleChargeCard = async () => {
    setCardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-recharge', { body: { amount: cardAmount, method: 'card' } });
      const functionError = (data as { error?: unknown; success?: boolean } | null)?.error;
      if (error || functionError || !data?.success) {
        if ((data as any)?.needs_card) { setShowCardModal(true); return; }
        throw new Error(getErrorMessage(functionError ?? error, 'Erro ao cobrar no cartão'));
      }
      toast.success(`Recarga de ${fmt(cardAmount)} processada!`);
      loadData();
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Erro ao cobrar no cartão')); }
    finally { setCardLoading(false); }
  };

  const handleToggleAutoRecharge = async (enabled: boolean) => {
    if (!account) return;
    if (enabled && !account.card_last4) { toast.error("Cadastre um cartão primeiro"); setShowCardModal(true); return; }
    try {
      const { error } = await supabase.from("billing_accounts").update({ auto_recharge_enabled: enabled }).eq("user_id", user!.id);
      if (error) throw error;
      toast.success(enabled ? "Recarga automática ativada!" : "Recarga automática desativada");
      loadData();
    } catch { toast.error("Erro ao salvar configuração"); }
  };

  const handleUpdateAutoRechargeSettings = async (field: string, value: number) => {
    try {
      const { error } = await supabase.from("billing_accounts").update({ [field]: value }).eq("user_id", user!.id);
      if (error) throw error;
      loadData();
    } catch { toast.error("Erro ao salvar"); }
  };

  const handleGeneratePix = async () => {
    setPixLoading(true); setPixResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('billing-recharge', { body: { amount: pixAmount, method: 'pix' } });
      const functionError = (data as { error?: unknown; success?: boolean } | null)?.error;
      if (error || functionError || !data?.success) throw new Error(getErrorMessage(functionError ?? error, 'Erro ao gerar PIX'));
      setPixResult(data);
      toast.success('QR Code gerado!');
    } catch (err: unknown) { toast.error(getErrorMessage(err, 'Erro ao gerar PIX')); }
    finally { setPixLoading(false); }
  };

  const handleCopyPix = async () => {
    if (!pixResult?.pix_code) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(pixResult.pix_code); toast.success('Código PIX copiado!'); }
    catch { toast.error('Erro ao copiar'); }
    finally { setTimeout(() => setCopying(false), 2000); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentTierKey = account?.credit_tier ?? "iron";
  const currentTier = tiers.find((t) => t.key === currentTierKey) ?? tiers[0];
  const balance = account?.balance ?? 0;
  const limit = account?.credit_limit ?? (currentTier?.credit_limit ?? 5);
  const usagePercent = limit > 0 ? Math.min(100, (balance / limit) * 100) : 0;
  const colors = COLOR_MAP[currentTier?.color ?? "gray"] ?? COLOR_MAP.gray;
  const tierGradient = TIER_GRADIENTS[currentTier?.color ?? "gray"] ?? TIER_GRADIENTS.gray;

  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  const AmountSelector = ({ amounts, selected, onSelect }: { amounts: number[]; selected: number; onSelect: (v: number) => void }) => (
    <div className="flex gap-2 flex-wrap">
      {amounts.map((v) => (
        <button key={v} onClick={() => onSelect(v)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            selected === v
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
              : 'bg-card border border-border hover:border-primary/50 hover:bg-muted/50 text-foreground'
          }`}
        >
          {fmt(v)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hero Balance Section */}
      <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${tierGradient} p-6 md:p-8`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saldo disponível</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">{fmt(balance)}</p>
              <div className="flex items-center gap-3 mt-3">
                {account?.blocked ? (
                  <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                    <XCircle className="w-3.5 h-3.5" /> Bloqueada
                  </Badge>
                ) : balance < 20 ? (
                  <Badge className="gap-1.5 py-1 px-3 bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/15">
                    <AlertTriangle className="w-3.5 h-3.5" /> Saldo baixo
                  </Badge>
                ) : (
                  <Badge className="gap-1.5 py-1 px-3 bg-primary/15 text-primary border border-primary/25 hover:bg-primary/15">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Operacional
                  </Badge>
                )}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${colors.bg} border ${colors.border}`}>
                  {TIER_ICONS[currentTierKey] || <Shield className="w-3.5 h-3.5" />}
                  <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{currentTier?.label ?? "Iron"}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2 rounded-xl h-10" onClick={() => document.getElementById('pix-tab')?.click()}>
                <QrCode className="w-4 h-4" /> Recarga PIX
              </Button>
              <Button size="sm" className="gap-2 rounded-xl h-10" onClick={() => document.getElementById('card-tab')?.click()}>
                <CreditCard className="w-4 h-4" /> Recarga Cartão
              </Button>
            </div>
          </div>

          {/* Usage bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uso do crédito</span>
              <span>{fmt(balance)} / {fmt(limit)}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 80 ? 'bg-destructive' : usagePercent > 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gamification Banner */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Primeiros R$ 1.000 faturados são grátis!</p>
          <p className="text-xs text-muted-foreground mt-0.5">Até atingir R$ 1.000 em vendas aprovadas, a taxa de R$ 0,99 não é cobrada.</p>
        </div>
      </div>

      {/* Blocked Alert */}
      {account?.blocked && (
        <Alert className="border-destructive/40 bg-destructive/10 rounded-xl">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            Conta bloqueada — adicione saldo para reativar seus checkouts.
            <Button size="sm" className="ml-3 h-7 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
              onClick={() => document.getElementById('pix-tab')?.click()}>
              Recarregar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharge Section */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="card">
            <TabsList className="bg-card border border-border rounded-xl p-1 h-auto">
              <TabsTrigger id="card-tab" value="card" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4">
                <CreditCard className="w-4 h-4" /> Cartão
              </TabsTrigger>
              <TabsTrigger id="pix-tab" value="pix" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4">
                <QrCode className="w-4 h-4" /> PIX
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <Card className="border-border/60 rounded-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Cartão de Crédito</CardTitle>
                  <CardDescription>Método de pagamento para recargas e cobranças automáticas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {account?.card_last4 ? (
                    <>
                      {/* Card Display */}
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card to-muted/50 border border-border p-5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                              <CreditCard className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{account.card_brand?.toUpperCase()} •••• {account.card_last4}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Cartão validado e ativo</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs rounded-lg" onClick={() => setShowCardModal(true)}>
                            Trocar
                          </Button>
                        </div>
                      </div>

                      {/* Recharge Amount */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Valor da recarga</label>
                        <AmountSelector amounts={[20, 50, 100, 200, 500]} selected={cardAmount} onSelect={setCardAmount} />
                      </div>

                      <Button className="w-full gap-2 h-12 rounded-xl text-sm font-semibold" onClick={handleChargeCard} disabled={cardLoading}>
                        {cardLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                        ) : (
                          <><CreditCard className="w-4 h-4" /> Recarregar {fmt(cardAmount)}</>
                        )}
                      </Button>

                      {/* Auto-Recharge */}
                      <div className="pt-5 border-t border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Recarga Automática</Label>
                              <p className="text-xs text-muted-foreground">Cobra automaticamente quando o saldo ficar baixo</p>
                            </div>
                          </div>
                          <Switch checked={account.auto_recharge_enabled} onCheckedChange={handleToggleAutoRecharge} />
                        </div>

                        {account.auto_recharge_enabled && (
                          <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border">
                            <div className="space-y-2.5">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recarregar quando saldo ≤</label>
                              <AmountSelector amounts={[3, 5, 10, 20]} selected={account.auto_recharge_threshold} onSelect={(v) => handleUpdateAutoRechargeSettings('auto_recharge_threshold', v)} />
                            </div>
                            <div className="space-y-2.5">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor da recarga</label>
                              <AmountSelector amounts={[20, 50, 100, 200]} selected={account.auto_recharge_amount} onSelect={(v) => handleUpdateAutoRechargeSettings('auto_recharge_amount', v)} />
                            </div>
                            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              <p className="text-xs text-muted-foreground">
                                Saldo ≤ <strong className="text-foreground">{fmt(account.auto_recharge_threshold)}</strong> → cobrança de <strong className="text-foreground">{fmt(account.auto_recharge_amount)}</strong> no •••• {account.card_last4}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <CreditCard className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Nenhum cartão cadastrado</p>
                      <p className="text-xs text-muted-foreground mb-5">Adicione um cartão para recargas rápidas e cobrança automática</p>
                      <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowCardModal(true)}>
                        <CreditCard className="w-4 h-4" /> Adicionar Cartão
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pix" className="mt-4">
              <Card className="border-border/60 rounded-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Recarga via PIX</CardTitle>
                  <CardDescription>Saldo creditado automaticamente após confirmação — taxa fixa de R$ 0,99 por venda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!pixResult ? (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Valor da recarga</label>
                        <AmountSelector amounts={[20, 50, 100, 200, 500]} selected={pixAmount} onSelect={setPixAmount} />
                      </div>
                      <Button className="w-full gap-2 h-12 rounded-xl text-sm font-semibold" onClick={handleGeneratePix} disabled={pixLoading}>
                        {pixLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</>
                        ) : (
                          <><QrCode className="w-4 h-4" /> Gerar QR Code — {fmt(pixAmount)}</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-5 py-4">
                      {pixResult.qr_code_url && (
                        <div className="p-3 bg-white rounded-2xl">
                          <img src={pixResult.qr_code_url} alt="QR Code PIX" className="w-44 h-44 rounded-lg" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{fmt(pixResult.amount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Escaneie ou copie o código abaixo</p>
                      </div>
                      {pixResult.pix_code && (
                        <Button variant="outline" className="w-full gap-2 rounded-xl h-11" onClick={handleCopyPix}>
                          {copying ? (
                            <><CheckCircle2 className="w-4 h-4 text-primary" /> Copiado!</>
                          ) : (
                            <><ClipboardCopy className="w-4 h-4" /> Copiar código PIX</>
                          )}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">Saldo creditado em até 1 minuto</p>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPixResult(null)}>Gerar novo PIX</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Tiers Column */}
        <div>
          <Card className="border-border/60 rounded-xl overflow-hidden sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-semibold">Níveis de Crédito</CardTitle>
              </div>
              <CardDescription className="text-xs">Limite aumenta com recargas frequentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {tiers.map((t) => {
                const isCurrent = t.key === currentTierKey;
                const c = COLOR_MAP[t.color] ?? COLOR_MAP.gray;
                const currentIdx = tiers.findIndex((x) => x.key === currentTierKey);
                const tIdx = tiers.findIndex((x) => x.key === t.key);
                const isUnlocked = tIdx <= currentIdx;

                return (
                  <div key={t.key}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                      isCurrent
                        ? `${c.bg} border ${c.border} shadow-lg ${c.glow}`
                        : isUnlocked
                          ? "border border-border/30 bg-card/50"
                          : "border border-border/10 opacity-40"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent ? `${c.bg} ${c.text}` : "bg-muted text-muted-foreground"
                    }`}>
                      {TIER_ICONS[t.key] || <Shield className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isCurrent ? c.text : "text-foreground"}`}>{t.label}</span>
                        {isCurrent && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>Atual</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${isCurrent ? c.text : "text-muted-foreground"}`}>{fmt(t.credit_limit)}</span>
                    {!isUnlocked && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History */}
      <Card className="border-border/60 rounded-xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Extrato</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{transactions.length} registros</span>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma transação</p>
              <p className="text-xs text-muted-foreground mt-1">Suas taxas e recargas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.type === "fee" ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {tx.type === "fee"
                      ? <ArrowUpRight className="w-4 h-4 text-destructive" />
                      : <ArrowDownLeft className="w-4 h-4 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{tx.type === "fee" ? "Taxa" : "Recarga"}</p>
                    <p className="text-xs text-muted-foreground truncate">{tx.description || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${tx.type === "fee" ? "text-destructive" : "text-primary"}`}>
                      {tx.type === "fee" ? "-" : "+"}{fmt(Math.abs(tx.amount))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Validation Modal */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">Validar Cartão</DialogTitle>
            <DialogDescription className="text-center">
              Adicione um cartão para recargas e cobranças automáticas
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-400">Validação de R$ 5,00 — estornada imediatamente.</p>
          </div>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Número do Cartão</label>
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
