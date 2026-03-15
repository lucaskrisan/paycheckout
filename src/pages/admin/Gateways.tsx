import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Wallet, TrendingUp, DollarSign, CreditCard, ArrowDownLeft, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export interface GatewayConfig {
  id?: string;
  provider: "asaas" | "pagarme" | "mercadopago" | "stripe";
  name: string;
  environment: "sandbox" | "production";
  active: boolean;
  payment_methods: string[];
  config: Record<string, any>;
}

const providerLabels: Record<string, string> = {
  asaas: "Asaas",
  pagarme: "Pagar.me",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
};

const Gateways = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllOrders = useCallback(async () => {
    const pageSize = 1000;
    let from = 0;
    const allOrders: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const chunk = data || [];
      allOrders.push(...chunk);

      if (chunk.length < pageSize) break;
      from += pageSize;
    }

    return allOrders;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [allOrders, gwRes] = await Promise.all([
        fetchAllOrders(),
        supabase.from("payment_gateways").select("*").order("created_at"),
      ]);

      setOrders(allOrders);
      if (gwRes.data) {
        setGateways(gwRes.data.map((g: any) => ({
          id: g.id, provider: g.provider, name: g.name, environment: g.environment,
          active: g.active, payment_methods: (g.payment_methods as string[]) || [],
          config: (g.config as Record<string, any>) || {},
        })));
      }
    } catch (error) {
      console.error("[gateways] loadData error:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchAllOrders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "approved");
  const pendingOrders = orders.filter(o => o.status === "pending");
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalPending = pendingOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalFees = paidOrders.reduce((s, o) => s + Number(o.platform_fee_amount || 0), 0);
  const netRevenue = totalRevenue - totalFees;

  const activeGateways = gateways.filter(g => g.active);

  const recentPaid = paidOrders.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumo financeiro e transações recentes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/integrations")}>
          <CreditCard className="w-4 h-4 mr-2" /> Gerenciar Gateways
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">Receita Total</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{paidOrders.length} vendas aprovadas</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Receita Líquida</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              R$ {netRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Após taxas da plataforma</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-yellow-500" />
              </div>
              <span className="text-xs text-muted-foreground">Pendente</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{pendingOrders.length} aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs text-muted-foreground">Taxas Plataforma</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              R$ {totalFees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Acumuladas no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Gateways summary */}
      {activeGateways.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Gateways Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {activeGateways.map(gw => (
                <div key={gw.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-foreground">{gw.name}</span>
                  <Badge variant="outline" className="text-[10px]">{providerLabels[gw.provider]}</Badge>
                  {gw.payment_methods.map(m => (
                    <Badge key={m} variant="secondary" className="text-[10px]">
                      {m === "pix" ? "PIX" : m === "credit_card" ? "Cartão" : m}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Últimas Transações Aprovadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : recentPaid.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transação aprovada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Método</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Taxa</TableHead>
                  <TableHead className="text-xs text-right">Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPaid.map(order => {
                  const fee = Number(order.platform_fee_amount || 0);
                  const net = Number(order.amount) - fee;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-xs">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {order.payment_method === "pix" ? "PIX" : order.payment_method === "credit_card" ? "Cartão" : order.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        R$ {Number(order.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-right text-red-400">
                        -R$ {fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-right text-green-400 font-medium">
                        R$ {net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Gateways;
