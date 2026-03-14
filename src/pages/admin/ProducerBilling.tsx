import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  AlertTriangle,
  TrendingUp,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Ban,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TIER_CONFIG: Record<string, { label: string; limit: number; color: string }> = {
  iron:   { label: "Iron",   limit: 5,    color: "text-muted-foreground" },
  bronze: { label: "Bronze", limit: 50,   color: "text-amber-700" },
  silver: { label: "Silver", limit: 500,  color: "text-slate-400" },
  gold:   { label: "Gold",   limit: 5000, color: "text-yellow-500" },
};

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
      supabase
        .from("billing_accounts")
        .select("*")
        .eq("user_id", user!.id)
        .limit(1),
      supabase
        .from("billing_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50),
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

  const tier = TIER_CONFIG[account?.credit_tier ?? "iron"] ?? TIER_CONFIG.iron;
  const balance = account?.balance ?? 0;
  const limit = account?.credit_limit ?? 5;
  const usagePercent = Math.min(100, (balance / limit) * 100);
  const isBlocked = account?.blocked ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Financeiro
        </h1>
        {isBlocked && (
          <Badge variant="destructive" className="gap-1 text-sm px-3 py-1">
            <Ban className="w-4 h-4" /> Conta Bloqueada
          </Badge>
        )}
      </div>

      {isBlocked && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                Seus checkouts estão suspensos
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Seu saldo devedor ultrapassou o limite de crédito do tier{" "}
                <strong>{tier.label}</strong>. Entre em contato com o suporte
                para regularizar e desbloquear sua conta.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Saldo Devedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                balance > limit
                  ? "text-destructive"
                  : balance > 0
                  ? "text-foreground"
                  : "text-primary"
              }`}
            >
              {fmt(balance)}
            </p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uso do limite</span>
                <span>{usagePercent.toFixed(0)}%</span>
              </div>
              <Progress
                value={usagePercent}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" /> Tier de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${tier.color}`}>{tier.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Limite: {fmt(limit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBlocked ? (
              <div className="flex items-center gap-2">
                <Ban className="w-6 h-6 text-destructive" />
                <span className="text-xl font-bold text-destructive">
                  Bloqueado
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold text-primary">Ativo</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {isBlocked
                ? "Regularize para voltar a vender"
                : `Disponível: ${fmt(Math.max(limit - balance, 0))}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como funciona a cobrança?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            A cada venda aprovada, uma taxa de plataforma é adicionada ao seu
            saldo devedor. Enquanto o saldo estiver abaixo do limite de crédito
            do seu tier, seus checkouts continuam ativos normalmente.
          </p>
          <p>
            Se o saldo ultrapassar o limite, seus checkouts são pausados até a
            regularização.
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma transação registrada ainda. As taxas aparecerão aqui assim
              que suas vendas forem aprovadas.
            </p>
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
                      <Badge
                        variant={tx.type === "fee" ? "secondary" : "default"}
                        className="gap-1"
                      >
                        {tx.type === "fee" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3" />
                        )}
                        {tx.type === "fee" ? "Taxa" : "Crédito"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {tx.description || "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.type === "fee"
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {tx.type === "fee" ? "+" : "-"}
                      {fmt(Math.abs(tx.amount))}
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
