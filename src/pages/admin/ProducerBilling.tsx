import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  QrCode,
  Plus,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TIERS = [
  { key: "iron",     label: "Iron",     limit: 5,   level: 1, color: "text-muted-foreground",  border: "border-muted-foreground/40" },
  { key: "bronze",   label: "Bronze",   limit: 10,  level: 2, color: "text-amber-600",         border: "border-amber-600/40" },
  { key: "silver",   label: "Silver",   limit: 20,  level: 3, color: "text-slate-300",         border: "border-slate-300/40" },
  { key: "gold",     label: "Gold",     limit: 35,  level: 4, color: "text-yellow-400",        border: "border-yellow-400/40" },
  { key: "platinum", label: "Platinum", limit: 70,  level: 5, color: "text-cyan-400",          border: "border-cyan-400/40" },
  { key: "diamond",  label: "Diamond",  limit: 100, level: 6, color: "text-violet-400",        border: "border-violet-400/40" },
];

const getTier = (key: string) => TIERS.find((t) => t.key === key) ?? TIERS[0];

interface BillingAccount {
  id: string;
  balance: number;
  credit_tier: string;
  credit_limit: number;
  blocked: boolean;
  card_last4: string | null;
  card_brand: string | null;
}

interface BillingTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ProducerBilling = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: accs }, { data: txs }] = await Promise.all([
      supabase.from("billing_accounts").select("*").eq("user_id", user!.id).limit(1),
      supabase.from("billing_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setAccount((accs?.[0] as unknown as BillingAccount) ?? null);
    setTransactions((txs as unknown as BillingTransaction[]) ?? []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Carregando billing...</p>
      </div>
    );
  }

  const tier = getTier(account?.credit_tier ?? "iron");
  const balance = account?.balance ?? 0;
  const limit = account?.credit_limit ?? tier.limit;
  const toleranceLimit = limit * 1.15;
  const usagePercent = limit > 0 ? Math.min(100, (balance / toleranceLimit) * 100) : 0;
  const updatedAt = account ? new Date(account.card_last4 ? Date.now() : Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas taxas e pagamentos</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Crédito
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxas a Pagar</CardTitle>
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{fmt(balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Taxas acumuladas no período</p>
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
            <p className={`text-3xl font-bold ${tier.color}`}>{tier.label}</p>
            <p className="text-xs text-muted-foreground mt-1">Limite: {fmt(limit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Usage + Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Usage + Payment Tabs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Usage bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Uso do Limite de Crédito</CardTitle>
              <CardDescription>
                {fmt(balance)} de {fmt(toleranceLimit)} (com 15% de tolerância)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% utilizado</p>
            </CardContent>
          </Card>

          {/* Payment tabs */}
          <Tabs defaultValue="card">
            <TabsList>
              <TabsTrigger value="card" className="gap-2">
                <CreditCard className="w-4 h-4" /> Cartão
              </TabsTrigger>
              <TabsTrigger value="pix" className="gap-2">
                <QrCode className="w-4 h-4" /> PIX
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cartão de Crédito</CardTitle>
                  <CardDescription>Cartão para cobrança automática de taxas</CardDescription>
                </CardHeader>
                <CardContent>
                  {account?.card_last4 ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{account.card_brand?.toUpperCase() ?? "Cartão"} •••• {account.card_last4}</p>
                        <p className="text-xs text-muted-foreground">Cobrança automática ativa</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CreditCard className="w-10 h-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">Nenhum cartão cadastrado</p>
                      <Button variant="outline" size="sm">Adicionar Cartão</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pix">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pagar via PIX</CardTitle>
                  <CardDescription>Adicione crédito pré-pago à sua conta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <QrCode className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Gere um QR Code para adicionar crédito</p>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" /> Gerar PIX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Tiers Ladder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Níveis de Crédito</CardTitle>
            <CardDescription>
              Seu limite aumenta conforme você mantém os pagamentos em dia
            </CardDescription>
            <p className="text-[10px] text-muted-foreground text-right mt-1">
              Atualizado em {updatedAt}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {TIERS.map((t) => {
              const isCurrent = t.key === (account?.credit_tier ?? "iron");
              const currentIdx = TIERS.findIndex((x) => x.key === (account?.credit_tier ?? "iron"));
              const tIdx = TIERS.findIndex((x) => x.key === t.key);
              const isLocked = tIdx > currentIdx;
              const faltam = isLocked
                ? (() => {
                    // Simple: show how many fees needed to unlock
                    const prevTier = TIERS[tIdx - 1];
                    return `Faltam ${fmt(prevTier?.limit ?? 0)} em taxas`;
                  })()
                : null;

              return (
                <div
                  key={t.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? `${t.border} bg-muted/50`
                      : "border-border/30 opacity-70"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${t.color}`}>
                        {t.label}
                      </span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          Atual
                        </Badge>
                      )}
                    </div>
                    {isLocked && faltam && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {faltam}
                      </p>
                    )}
                    {!isCurrent && !isLocked && (
                      <p className="text-[11px] text-muted-foreground">
                        Nível {t.level}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-medium shrink-0 ${t.color}`}>
                    {fmt(t.limit)}
                  </span>
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
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {tx.description || "-"}
                    </TableCell>
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
    </div>
  );
};

export default ProducerBilling;
