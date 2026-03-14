import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Users,
  Ban,
  CheckCircle,
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
  email?: string;
  full_name?: string;
}

interface BillingTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Billing = () => {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !isSuperAdmin) return;
    loadAccounts();
  }, [user?.id, isSuperAdmin]);

  useEffect(() => {
    if (selectedUserId) loadTransactions(selectedUserId);
  }, [selectedUserId]);

  const loadAccounts = async () => {
    setLoading(true);

    // 1. Get ALL admin/super_admin producers from user_roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "super_admin"]);

    const adminUserIds = [...new Set((roles || []).map((r: any) => r.user_id))];

    if (adminUserIds.length === 0) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    // 2. Fetch billing_accounts and profiles in parallel
    const [{ data: accs }, { data: profiles }] = await Promise.all([
      supabase.from("billing_accounts").select("*").in("user_id", adminUserIds),
      supabase.from("profiles").select("id, full_name").in("id", adminUserIds),
    ]);

    const billingMap = new Map((accs || []).map((a: any) => [a.user_id, a]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    // 3. Merge: every admin gets a row, even without billing_account
    const merged: BillingAccount[] = adminUserIds.map((uid) => {
      const billing = billingMap.get(uid);
      return {
        id: billing?.id || uid,
        user_id: uid,
        balance: billing?.balance ?? 0,
        credit_tier: billing?.credit_tier ?? "iron",
        credit_limit: billing?.credit_limit ?? 5,
        blocked: billing?.blocked ?? false,
        card_last4: billing?.card_last4 ?? null,
        card_brand: billing?.card_brand ?? null,
        created_at: billing?.created_at ?? new Date().toISOString(),
        full_name: profileMap.get(uid) || "Sem nome",
      };
    });

    // Sort by balance descending
    merged.sort((a, b) => b.balance - a.balance);
    setAccounts(merged);
    setLoading(false);
  };

  const loadTransactions = async (userId: string) => {
    const { data } = await supabase
      .from("billing_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setTransactions((data as unknown as BillingTransaction[]) || []);
  };

  const handleChangeTier = async (accountId: string, userId: string, newTier: string) => {
    const newLimit = TIER_CONFIG[newTier]?.limit || 5;
    const { error } = await supabase
      .from("billing_accounts")
      .update({ credit_tier: newTier, credit_limit: newLimit, updated_at: new Date().toISOString() })
      .eq("id", accountId);
    if (error) toast.error("Erro ao alterar tier");
    else {
      toast.success(`Tier alterado para ${TIER_CONFIG[newTier].label}`);
      loadAccounts();
    }
  };

  const handleToggleBlock = async (accountId: string, currentlyBlocked: boolean) => {
    const { error } = await supabase
      .from("billing_accounts")
      .update({ blocked: !currentlyBlocked, updated_at: new Date().toISOString() })
      .eq("id", accountId);
    if (error) toast.error("Erro");
    else {
      toast.success(currentlyBlocked ? "Produtor desbloqueado" : "Produtor bloqueado");
      loadAccounts();
    }
  };

  const handleResetBalance = async (accountId: string, userId: string) => {
    if (!confirm("Zerar o saldo devedor deste produtor?")) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account || account.balance <= 0) return;

    await supabase.from("billing_transactions").insert({
      user_id: userId,
      type: "credit",
      amount: -account.balance,
      description: "Saldo zerado pelo Super Admin",
    });

    await supabase
      .from("billing_accounts")
      .update({ balance: 0, blocked: false, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    toast.success("Saldo zerado");
    loadAccounts();
    if (selectedUserId === userId) loadTransactions(userId);
  };

  if (authLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const totalOwed = accounts.reduce((s, a) => s + Math.max(a.balance, 0), 0);
  const blockedCount = accounts.filter((a) => a.blocked).length;
  const selectedAccount = accounts.find((a) => a.user_id === selectedUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Billing — Gestão de Produtores</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{fmt(totalOwed)}</p>
            <p className="text-xs text-muted-foreground mt-1">Taxas acumuladas de todos os produtores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Produtores com Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{accounts.length}</p>
          </CardContent>
        </Card>

        <Card className={blockedCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ban className="w-4 h-4" /> Produtores Bloqueados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${blockedCount > 0 ? "text-destructive" : "text-foreground"}`}>
              {blockedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas de Billing</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma conta de billing ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Saldo Devedor</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => {
                  const tier = TIER_CONFIG[acc.credit_tier] || TIER_CONFIG.iron;
                  const usagePercent = Math.min(100, (acc.balance / acc.credit_limit) * 100);
                  return (
                    <TableRow
                      key={acc.id}
                      className={`cursor-pointer ${selectedUserId === acc.user_id ? "bg-muted/50" : ""}`}
                      onClick={() => setSelectedUserId(acc.user_id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-foreground">{acc.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{acc.user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={acc.credit_tier}
                          onValueChange={(v) => handleChangeTier(acc.id, acc.user_id, v)}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>
                                {cfg.label} ({fmt(cfg.limit)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={acc.balance > acc.credit_limit ? "text-destructive font-bold" : "font-medium"}>
                          {fmt(acc.balance)}
                        </span>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-yellow-500" : "bg-primary"}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {fmt(acc.credit_limit)}
                      </TableCell>
                      <TableCell>
                        {acc.blocked ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="w-3 h-3" /> Bloqueado
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleToggleBlock(acc.id, acc.blocked)}
                          >
                            {acc.blocked ? "Desbloquear" : "Bloquear"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleResetBalance(acc.id, acc.user_id)}
                          >
                            Zerar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transaction History for selected producer */}
      {selectedAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Transações — {selectedAccount.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma transação.</p>
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
      )}
    </div>
  );
};

export default Billing;
