import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard, TrendingUp, QrCode, Plus, Receipt, DollarSign, ArrowUpRight, ArrowDownLeft,
  Loader2, ClipboardCopy, CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TierRow {
  key: string;
  label: string;
  credit_limit: number;
  level: number;
  color: string;
}

const COLOR_MAP: Record<string, { text: string; border: string }> = {
  gray:   { text: "text-muted-foreground", border: "border-muted-foreground/40" },
  amber:  { text: "text-amber-600",        border: "border-amber-600/40" },
  slate:  { text: "text-slate-300",         border: "border-slate-300/40" },
  yellow: { text: "text-yellow-400",        border: "border-yellow-400/40" },
  cyan:   { text: "text-cyan-400",          border: "border-cyan-400/40" },
  violet: { text: "text-violet-400",        border: "border-violet-400/40" },
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || fallback;
  if (Array.isArray(error)) {
    const message = error
      .map((item) => getErrorMessage(item, ""))
      .filter(Boolean)
      .join(" ");
    return message || fallback;
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const preferred = getErrorMessage(record.description ?? record.message ?? record.error, "");
    if (preferred) return preferred;

    const nested = Object.values(record)
      .map((value) => getErrorMessage(value, ""))
      .filter(Boolean)
      .join(" ");

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
  const [pixResult, setPixResult] = useState<{
    pix_code: string | null;
    qr_code_url: string | null;
    amount: number;
  } | null>(null);
  const [copying, setCopying] = useState(false);
  const [cardAmount, setCardAmount] = useState<number>(50);
  const [cardLoading, setCardLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardValidating, setCardValidating] = useState(false);
  const [cardForm, setCardForm] = useState({
    number: "",
    name: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cpf: "",
  });

  const handleValidateCard = async () => {
    if (!cardForm.number || !cardForm.name || !cardForm.expiryMonth || !cardForm.expiryYear || !cardForm.cvv || !cardForm.cpf) {
      toast.error("Preencha todos os campos do cartão");
      return;
    }

    setCardValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-validate-card', {
        body: {
          card_number: cardForm.number.replace(/\s/g, ''),
          card_name: cardForm.name,
          card_expiry_month: cardForm.expiryMonth,
          card_expiry_year: cardForm.expiryYear,
          card_cvv: cardForm.cvv,
          card_cpf: cardForm.cpf.replace(/\D/g, ''),
        },
      });

      const functionError = (data as { error?: unknown; success?: boolean } | null)?.error;
      if (error || functionError || !data?.success) {
        throw new Error(getErrorMessage(functionError ?? error, 'Erro ao validar cartão'));
      }

      toast.success(`Cartão •••• ${data.card_last4} validado com sucesso!`);
      setShowCardModal(false);
      setCardForm({ number: "", name: "", expiryMonth: "", expiryYear: "", cvv: "", cpf: "" });
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao validar cartão'));
    } finally {
      setCardValidating(false);
    }
  };

  const handleChargeCard = async () => {
    setCardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-recharge', {
        body: { amount: cardAmount, method: 'card' },
      });
      const functionError = (data as { error?: unknown; success?: boolean } | null)?.error;
      if (error || functionError || !data?.success) {
        if ((data as any)?.needs_card) {
          setShowCardModal(true);
          return;
        }
        throw new Error(getErrorMessage(functionError ?? error, 'Erro ao cobrar no cartão'));
      }
      toast.success(`Recarga de ${fmt(cardAmount)} processada com sucesso!`);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao cobrar no cartão'));
    } finally {
      setCardLoading(false);
    }
  };

  const handleToggleAutoRecharge = async (enabled: boolean) => {
    if (!account) return;
    // Require card to enable
    if (enabled && !account.card_last4) {
      toast.error("Cadastre um cartão primeiro para ativar a recarga automática");
      setShowCardModal(true);
      return;
    }
    try {
      const { error } = await supabase
        .from("billing_accounts")
        .update({ auto_recharge_enabled: enabled })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success(enabled ? "Recarga automática ativada!" : "Recarga automática desativada");
      loadData();
    } catch {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleUpdateAutoRechargeSettings = async (field: string, value: number) => {
    try {
      const { error } = await supabase
        .from("billing_accounts")
        .update({ [field]: value })
        .eq("user_id", user!.id);
      if (error) throw error;
      loadData();
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleGeneratePix = async () => {
    setPixLoading(true);
    setPixResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('billing-recharge', {
        body: { amount: pixAmount, method: 'pix' },
      });
      const functionError = (data as { error?: unknown; success?: boolean } | null)?.error;
      if (error || functionError || !data?.success) {
        throw new Error(getErrorMessage(functionError ?? error, 'Erro ao gerar PIX'));
      }
      setPixResult(data);
      toast.success('QR Code gerado! Pague para adicionar saldo.');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao gerar PIX'));
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixResult?.pix_code) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(pixResult.pix_code);
      toast.success('Código PIX copiado!');
    } catch {
      toast.error('Erro ao copiar');
    } finally {
      setTimeout(() => setCopying(false), 2000);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Carregando billing...</p></div>;
  }

  const currentTierKey = account?.credit_tier ?? "iron";
  const currentTier = tiers.find((t) => t.key === currentTierKey) ?? tiers[0];
  const balance = account?.balance ?? 0;
  const limit = account?.credit_limit ?? (currentTier?.credit_limit ?? 5);
  const toleranceLimit = limit * 1.15;
  const usagePercent = toleranceLimit > 0 ? Math.min(100, (balance / toleranceLimit) * 100) : 0;
  const colors = COLOR_MAP[currentTier?.color ?? "gray"] ?? COLOR_MAP.gray;

  const inputClass = "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:border-primary focus:ring-primary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas taxas e pagamentos</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => document.getElementById('pix-tab')?.click()}>
          <Plus className="w-4 h-4" /> Adicionar Crédito
        </Button>
      </div>

      {/* Low balance / blocked banner */}
      {account?.blocked && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            Sua conta está <strong>bloqueada</strong>. Adicione saldo via PIX para reativar seus checkouts imediatamente.
            <Button
              size="sm"
              className="ml-3 h-7 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => document.getElementById('pix-tab')?.click()}
            >
              Recarregar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!account?.blocked && balance < 20 && balance >= 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-400">
            Saldo baixo: <strong>{fmt(balance)}</strong> restantes. Recarregue para não ter seus checkouts bloqueados.
            <Button
              size="sm"
              variant="outline"
              className="ml-3 h-7 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              onClick={() => document.getElementById('pix-tab')?.click()}
            >
              Adicionar saldo
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</CardTitle>
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{fmt(balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Saldo pré-pago disponível</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {account?.blocked ? (
                <Badge variant="destructive" className="text-xs">BLOQUEADA</Badge>
              ) : balance < 20 ? (
                <Badge className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">Saldo baixo</Badge>
              ) : (
                <Badge className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/20">Ativo</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Disponível</CardTitle>
              <QrCode className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{fmt(Math.max(limit - balance, 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">Saldo pré-pago via PIX</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nível de Crédito</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${colors.text}`}>{currentTier?.label ?? "Iron"}</p>
            <p className="text-xs text-muted-foreground mt-1">Limite: {fmt(limit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage + Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Uso do Limite de Crédito</CardTitle>
              <CardDescription>{fmt(balance)} de {fmt(toleranceLimit)} (com 15% de tolerância)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% utilizado</p>
            </CardContent>
          </Card>

          <Tabs defaultValue="card">
            <TabsList>
              <TabsTrigger value="card" className="gap-2"><CreditCard className="w-4 h-4" /> Cartão</TabsTrigger>
              <TabsTrigger id="pix-tab" value="pix" className="gap-2"><QrCode className="w-4 h-4" /> PIX</TabsTrigger>
            </TabsList>

            {/* CARD TAB */}
            <TabsContent value="card">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cartão de Crédito</CardTitle>
                  <CardDescription>Cartão para cobrança automática de taxas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {account?.card_last4 ? (
                    <>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{account.card_brand?.toUpperCase()} •••• {account.card_last4}</p>
                            <p className="text-xs text-muted-foreground">Cartão validado e ativo</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowCardModal(true)}>
                          Trocar cartão
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Valor da recarga</label>
                        <div className="flex gap-2 flex-wrap">
                          {[20, 50, 100, 200, 500].map((v) => (
                            <button
                              key={v}
                              onClick={() => setCardAmount(v)}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                cardAmount === v
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-muted/30 hover:bg-muted'
                              }`}
                            >
                              {fmt(v)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        className="w-full gap-2"
                        onClick={handleChargeCard}
                        disabled={cardLoading}
                      >
                        {cardLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                        ) : (
                          <><CreditCard className="w-4 h-4" /> Recarregar {fmt(cardAmount)} no cartão •••• {account.card_last4}</>
                        )}
                      </Button>

                      {/* Auto-Recharge Section */}
                      <div className="mt-6 pt-6 border-t border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <Label className="text-sm font-medium">Recarga Automática</Label>
                              <p className="text-xs text-muted-foreground">
                                Cobra no cartão automaticamente quando o saldo ficar baixo
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={account.auto_recharge_enabled}
                            onCheckedChange={handleToggleAutoRecharge}
                          />
                        </div>

                        {account.auto_recharge_enabled && (
                          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Recarregar quando saldo ficar abaixo de:</label>
                              <div className="flex gap-2 flex-wrap">
                                {[3, 5, 10, 20].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => handleUpdateAutoRechargeSettings('auto_recharge_threshold', v)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                      account.auto_recharge_threshold === v
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-muted/30 hover:bg-muted'
                                    }`}
                                  >
                                    {fmt(v)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Valor da recarga automática:</label>
                              <div className="flex gap-2 flex-wrap">
                                {[20, 50, 100, 200].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => handleUpdateAutoRechargeSettings('auto_recharge_amount', v)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                      account.auto_recharge_amount === v
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-muted/30 hover:bg-muted'
                                    }`}
                                  >
                                    {fmt(v)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <Alert className="border-primary/30 bg-primary/5">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              <AlertDescription className="text-sm">
                                Quando seu saldo ficar abaixo de <strong>{fmt(account.auto_recharge_threshold)}</strong>, cobraremos <strong>{fmt(account.auto_recharge_amount)}</strong> automaticamente no cartão •••• {account.card_last4}.
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CreditCard className="w-10 h-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">Nenhum cartão cadastrado</p>
                      <Button variant="outline" size="sm" onClick={() => setShowCardModal(true)}>
                        Adicionar Cartão
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PIX TAB */}
            <TabsContent value="pix">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Adicionar Saldo via PIX</CardTitle>
                  <CardDescription>O saldo é creditado automaticamente após a confirmação. Taxa fixa de R$ 0,99 por venda aprovada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!pixResult ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Valor da recarga</label>
                        <div className="flex gap-2 flex-wrap">
                          {[20, 50, 100, 200, 500].map((v) => (
                            <button
                              key={v}
                              onClick={() => setPixAmount(v)}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                pixAmount === v
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-muted/30 hover:bg-muted'
                              }`}
                            >
                              {fmt(v)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={handleGeneratePix}
                        disabled={pixLoading}
                      >
                        {pixLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</>
                        ) : (
                          <><QrCode className="w-4 h-4" /> Gerar QR Code — {fmt(pixAmount)}</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      {pixResult.qr_code_url && (
                        <img
                          src={pixResult.qr_code_url}
                          alt="QR Code PIX"
                          className="w-48 h-48 rounded-lg border"
                        />
                      )}
                      <p className="text-sm font-medium text-center">
                        Pague {fmt(pixResult.amount)} via PIX
                      </p>
                      {pixResult.pix_code && (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={handleCopyPix}
                        >
                          {copying ? (
                            <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copiado!</>
                          ) : (
                            <><ClipboardCopy className="w-4 h-4" /> Copiar código PIX</>
                          )}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        Saldo creditado automaticamente em até 1 minuto após o pagamento
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPixResult(null)}
                      >
                        Gerar novo PIX
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Tiers Ladder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Níveis de Crédito</CardTitle>
            <CardDescription>Seu limite aumenta conforme você mantém os pagamentos em dia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tiers.map((t) => {
              const isCurrent = t.key === currentTierKey;
              const c = COLOR_MAP[t.color] ?? COLOR_MAP.gray;
              const currentIdx = tiers.findIndex((x) => x.key === currentTierKey);
              const tIdx = tiers.findIndex((x) => x.key === t.key);
              const isLocked = tIdx > currentIdx;

              return (
                <div key={t.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isCurrent ? `${c.border} bg-muted/50` : "border-border/30 opacity-70"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {t.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${c.text}`}>{t.label}</span>
                      {isCurrent && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Atual</Badge>}
                    </div>
                    {isLocked && <p className="text-[11px] text-muted-foreground">Nível {t.level}</p>}
                  </div>
                  <span className={`text-sm font-medium shrink-0 ${c.text}`}>{fmt(t.credit_limit)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Faturas</CardTitle>
          <CardDescription>Suas faturas de cobrança de taxas</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant={tx.type === "fee" ? "secondary" : "default"} className="gap-1">
                        {tx.type === "fee" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {tx.type === "fee" ? "Taxa" : "Crédito"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{tx.description || "-"}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === "fee" ? "text-destructive" : "text-primary"}`}>
                      {tx.type === "fee" ? "+" : "-"}{fmt(Math.abs(tx.amount))}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Card Validation Modal */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Validar Cartão</DialogTitle>
            <DialogDescription className="text-center">
              Adicione um cartão de crédito para usar como forma de pagamento das taxas
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Info className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-400 text-sm">
              Faremos uma validação de R$ 5,00 que será estornada imediatamente. Nenhum valor será cobrado.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Número do Cartão</label>
              <Input
                value={cardForm.number}
                onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000"
                className={`${inputClass} font-mono tracking-wider`}
                maxLength={19}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome no Cartão</label>
              <Input
                value={cardForm.name}
                onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mês</label>
                <Input
                  value={cardForm.expiryMonth}
                  onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM"
                  className={inputClass}
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ano</label>
                <Input
                  value={cardForm.expiryYear}
                  onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="AA"
                  className={inputClass}
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">CVV</label>
                <Input
                  value={cardForm.cvv}
                  onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123"
                  className={inputClass}
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">CPF do Titular</label>
              <Input
                value={cardForm.cpf}
                onChange={(e) => setCardForm({ ...cardForm, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00"
                className={inputClass}
                maxLength={14}
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleValidateCard}
              disabled={cardValidating}
            >
              {cardValidating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Validando cartão...</>
              ) : (
                "Validar Cartão"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerBilling;
