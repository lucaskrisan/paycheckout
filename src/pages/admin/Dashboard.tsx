import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  ArrowDownRight,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";

type Period = "today" | "yesterday" | "7days" | "month" | "lastMonth" | "total";

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7days": "Últimos 7 dias",
  month: "Mês atual",
  lastMonth: "Mês passado",
  total: "Total",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ordersRes, customersRes] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("customers").select("*"),
    ]);
    setOrders(ordersRes.data || []);
    setCustomers(customersRes.data || []);
    setLoading(false);
  };

  const filterByPeriod = (items: any[]) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return items.filter((item) => {
      const date = new Date(item.created_at);
      switch (period) {
        case "today":
          return date >= startOfDay;
        case "yesterday": {
          const yesterday = new Date(startOfDay);
          yesterday.setDate(yesterday.getDate() - 1);
          return date >= yesterday && date < startOfDay;
        }
        case "7days": {
          const week = new Date(startOfDay);
          week.setDate(week.getDate() - 7);
          return date >= week;
        }
        case "month":
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        case "lastMonth": {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          return date >= lm && date <= lmEnd;
        }
        case "total":
          return true;
        default:
          return true;
      }
    });
  };

  const filtered = useMemo(() => filterByPeriod(orders), [orders, period]);
  const approved = useMemo(() => filtered.filter((o) => o.status === "paid" || o.status === "approved"), [filtered]);
  const pending = useMemo(() => filtered.filter((o) => o.status === "pending"), [filtered]);
  const abandoned = useMemo(() => filtered.filter((o) => o.status === "abandoned" || o.status === "expired"), [filtered]);
  const refunded = useMemo(() => filtered.filter((o) => o.status === "refunded"), [filtered]);

  const totalFaturado = approved.reduce((s, o) => s + Number(o.amount), 0);
  // Simple net calc (can be enhanced with actual gateway fees)
  const totalLiquido = totalFaturado * 0.97; // placeholder 3% avg fee

  const pixOrders = approved.filter((o) => o.payment_method === "pix");
  const cardOrders = approved.filter((o) => o.payment_method === "credit_card");
  const pixTotal = pixOrders.reduce((s, o) => s + Number(o.amount), 0);
  const cardTotal = cardOrders.reduce((s, o) => s + Number(o.amount), 0);

  const cardAttempts = filtered.filter((o) => o.payment_method === "credit_card");
  const cardApproved = cardAttempts.filter((o) => o.status === "paid" || o.status === "approved");
  const pixAttempts = filtered.filter((o) => o.payment_method === "pix");
  const pixApproved = pixAttempts.filter((o) => o.status === "paid" || o.status === "approved");

  const conversionRate = filtered.length > 0 ? ((approved.length / filtered.length) * 100).toFixed(1) : "0.0";

  // Chart data
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    const numDays = period === "today" || period === "yesterday" ? 1 : period === "7days" ? 7 : 30;
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[key] = 0;
    }
    approved.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (days[key] !== undefined) days[key] += Number(o.amount);
    });
    return Object.entries(days).map(([name, total]) => ({ name, total }));
  }, [approved, period]);

  // Pie chart data for Total Pedidos
  const ordersPieData = [
    { name: "Aprovados", value: approved.length, color: "hsl(145, 65%, 42%)" },
    { name: "Pendentes", value: pending.length, color: "hsl(45, 93%, 47%)" },
    { name: "Abandonados", value: abandoned.length, color: "hsl(0, 84%, 60%)" },
  ].filter((d) => d.value > 0);

  const salesTypePieData = [
    { name: "Únicas", value: approved.length, color: "hsl(145, 65%, 42%)" },
  ].filter((d) => d.value > 0);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {userName}, foco hoje, resultado logo ali.
          </h1>
          <p className="text-sm text-muted-foreground">Período: {periodLabels[period]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="text-xs h-8"
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Revenue chart + Total cards */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">Receitas</CardTitle>
              <span className="text-xs text-muted-foreground">{periodLabels[period]}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="total" stroke="hsl(145, 65%, 42%)" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Total Faturado + Líquido */}
        <div className="lg:col-span-4 grid grid-cols-1 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Faturado</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{fmt(totalFaturado)}</p>
              <p className="text-xs text-muted-foreground mt-1">{approved.length} vendas confirmadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Líquido</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{fmt(totalLiquido)}</p>
              <p className="text-xs text-muted-foreground mt-1">Taxas: {fmt(totalFaturado - totalLiquido)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Metrics row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Order Bumps */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-checkout-badge" />
              <CardTitle className="text-sm font-display">Order Bumps</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold">R$ 0,00</p>
            <p className="text-xs text-muted-foreground">0 bumps aceitos</p>
            <Separator className="my-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conversões</span><span>0 aceitos</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Taxa</span><span>0,0%</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Pedidos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-sm font-display">Total Pedidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {ordersPieData.length > 0 ? (
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ordersPieData} cx="50%" cy="50%" innerRadius={18} outerRadius={30} dataKey="value" strokeWidth={0}>
                        {ordersPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-4 border-muted" />
              )}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  <span>Aprovados</span>
                  <span className="ml-auto font-semibold">{approved.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span>Pendentes</span>
                  <span className="ml-auto font-semibold">{pending.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-muted-foreground inline-block" />
                  <span>Total</span>
                  <span className="ml-auto font-semibold">{filtered.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aprovados vs Abandonados */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <CardTitle className="text-sm font-display">Aprovados vs Abandonados</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span>Aprovados</span>
                <span className="ml-auto font-semibold">{approved.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-3 h-3 text-destructive" />
                <span>Abandonados</span>
                <span className="ml-auto font-semibold text-destructive">{abandoned.length}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                <span>{fmt(abandoned.reduce((s, o) => s + Number(o.amount), 0))} perdidos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reembolsos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-destructive" />
                <CardTitle className="text-sm font-display">Reembolsos</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  <span>Chargeback</span>
                </div>
                <span className="font-mono">0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Estorno</span>
                </div>
                <span className="font-mono">{refunded.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Churn</span>
                </div>
                <span className="font-mono">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Approval Rate + Sales by Type + Checkout Conversion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Taxa de Aprovação */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-display">Taxa de Aprovação</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    <span>Cartão</span>
                  </div>
                  <span>{cardAttempts.length > 0 ? `${cardApproved.length}/${cardAttempts.length}` : "0/0"}</span>
                </div>
                <Progress
                  value={cardAttempts.length > 0 ? (cardApproved.length / cardAttempts.length) * 100 : 0}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{cardAttempts.length > 0 ? `${((cardApproved.length / cardAttempts.length) * 100).toFixed(0)}%` : "N/A"}</span>
                  <span>{fmt(cardTotal)}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-3.5 h-3.5 text-primary" />
                    <span>Pix</span>
                  </div>
                  <span>{pixAttempts.length > 0 ? `${pixApproved.length}/${pixAttempts.length}` : "0/0"}</span>
                </div>
                <Progress
                  value={pixAttempts.length > 0 ? (pixApproved.length / pixAttempts.length) * 100 : 0}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{pixAttempts.length > 0 ? `${((pixApproved.length / pixAttempts.length) * 100).toFixed(0)}%` : "N/A"}</span>
                  <span>{fmt(pixTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendas por Tipo */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-display">Vendas por Tipo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {salesTypePieData.length > 0 ? (
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salesTypePieData} cx="50%" cy="50%" innerRadius={18} outerRadius={30} dataKey="value" strokeWidth={0}>
                        {salesTypePieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-4 border-muted" />
              )}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>Únicas</span>
                  <span className="ml-auto font-semibold">{approved.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Novas Ass.</span>
                  <span className="ml-auto font-semibold">0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Renovações</span>
                  <span className="ml-auto font-semibold">0</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversão do Checkout */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-checkout-badge" />
              <CardTitle className="text-sm font-display">Conversão do Checkout</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="hsl(145, 65%, 42%)"
                    strokeWidth="3"
                    strokeDasharray={`${parseFloat(conversionRate)} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-display font-bold">{conversionRate}%</span>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <p><span className="font-semibold text-primary">{approved.length}</span> PAGOS</p>
                <p><span className="font-semibold">{filtered.length}</span> PEDIDOS</p>
              </div>
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground mt-3">Sem dados de funil no período</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
