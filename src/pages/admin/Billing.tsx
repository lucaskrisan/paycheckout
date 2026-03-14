import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CreditCard,
  TrendingUp,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";

const TIER_CONFIG: Record<string, { label: string; limit: number; color: string; next?: string }> = {
  iron: { label: "Iron", limit: 5, color: "text-muted-foreground", next: "bronze" },
  bronze: { label: "Bronze", limit: 50, color: "text-amber-700", next: "silver" },
  silver: { label: "Silver", limit: 500, color: "text-slate-400", next: "gold" },
  gold: { label: "Gold", limit: 5000, color: "text-yellow-500" },
};

interface BillingAccount {
  id: string;
  user_id: string;
  balance: number;
  credit_tier: string;
  credit_limit: number;
  blocked: boolean;
  card_last4: string | null;
  card_brand: string | null;
  created_at: string;
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

const Billing = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixAmount, setPixAmount] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);

    // Ensure account exists
    const { data: existing } = await supabase
      .from("billing_accounts")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("billing_accounts").insert({ user_id: user!.id });
    }

    const [{ data: acc }, { data: txns }] = await Promise.all([
      supabase
        .from("billing_accounts")
        .select("*")
        .eq("user_id", user!.id)
        .single(),
      supabase
        .from("billing_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (acc) setAccount(acc as unknown as BillingAccount);
    if (txns) setTransactions(txns as unknown as BillingTransaction[]);
    setLoading(false);
  };

  const handleAddCredit = async () => {
    const amount = parseFloat(pixAmount);
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    // In production, this would generate a real PIX payment
    // For now, simulate the credit addition
    const { error } = await supabase.from("billing_transactions").insert({
      user_id: user!.id,
      type: "credit",
      amount: -amount,
      description: `Crédito adicionado via PIX - ${fmt(amount)}`,
    });

    if (error) {
      toast.error("Erro ao adicionar crédito");
      return;
    }

    // Update balance
    await supabase
      .from("billing_accounts")
      .update({
        balance: Math.max(0, (account?.balance || 0) - amount),
        blocked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user!.id);

    toast.success(`Crédito de ${fmt(amount)} adicionado!`);
    setPixAmount("");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tier = TIER_CONFIG[account?.credit_tier || "iron"];
  const usagePercent = account ? Math.min(100, (account.balance / account.credit_limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
        {account?.blocked && (
          <Badge variant="destructive" className="gap-1.5 px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Vendas Bloqueadas
          </Badge>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <Card className={account?.blocked ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Taxas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${account?.blocked ? "text-destructive" : "text-foreground"}`}>
              {fmt(account?.balance || 0)}
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uso do limite</span>
                <span>{usagePercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-yellow-500" : "bg-primary"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Limite de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${tier.color}`}>{tier.label}</p>
              <span className="text-sm text-muted-foreground">até {fmt(tier.limit)}</span>
            </div>
            {tier.next && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Próximo: {TIER_CONFIG[tier.next].label} ({fmt(TIER_CONFIG[tier.next].limit)})
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {account?.card_last4 ? (
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {account.card_brand} •••• {account.card_last4}
                </p>
                <Button variant="link" size="sm" className="px-0 text-xs">
                  Alterar cartão
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Nenhum cartão cadastrado</p>
                <Button variant="outline" size="sm">
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  Cadastrar cartão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Credit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Adicionar Crédito via PIX
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deposite um valor antecipado e as taxas serão descontadas automaticamente do seu saldo.
          </p>
          <div className="flex gap-3 items-end max-w-md">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Valor (R$)
              </label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="50.00"
                value={pixAmount}
                onChange={(e) => setPixAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleAddCredit} className="gap-1.5">
              <QrCode className="w-4 h-4" />
              Gerar PIX
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            {[10, 50, 100, 500].map((v) => (
              <Button
                key={v}
                variant="outline"
                size="sm"
                onClick={() => setPixAmount(String(v))}
                className="text-xs"
              >
                {fmt(v)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma transação registrada ainda.
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
                        tx.type === "fee" ? "text-destructive" : "text-primary"
                      }`}
                    >
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

export default Billing;
