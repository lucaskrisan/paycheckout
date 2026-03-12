import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  ArrowDownRight,
  Banknote,
  FileText,
  RefreshCcw,
  AlertOctagon,
  Info,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import SalesGamification from "@/components/admin/SalesGamification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platformFee, setPlatformFee] = useState(4.99);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    const [ordersRes, cartsRes, feeRes, productsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", user.id),
      supabase.from("abandoned_carts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("platform_settings").select("platform_fee_percent").limit(1).single(),
      supabase.from("products").select("id, name").eq("user_id", user.id),
    ]);
    setOrders(ordersRes.data || []);
    setAbandonedCarts(cartsRes.data || []);
    if (feeRes.data?.platform_fee_percent != null) setPlatformFee(Number(feeRes.data.platform_fee_percent));
    setProducts(productsRes.data || []);
    setLoading(false);
    if (isRefresh) setRefreshing(false);
  }, [user]);

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

  const productFiltered = useMemo(() => {
    if (selectedProductId === "all") return orders;
    return orders.filter((o) => o.product_id === selectedProductId);
  }, [orders, selectedProductId]);

  const filtered = useMemo(() => filterByPeriod(productFiltered), [productFiltered, period]);
  const approved = useMemo(() => filtered.filter((o) => o.status === "paid" || o.status === "approved"), [filtered]);
  const refunded = useMemo(() => filtered.filter((o) => o.status === "refunded"), [filtered]);

  const totalBruto = approved.reduce((s, o) => s + Number(o.amount), 0);
  const totalLiquido = totalBruto * (1 - platformFee / 100);
  const totalVendas = approved.length;

  const cardAttempts = filtered.filter((o) => o.payment_method === "credit_card");
  const cardApproved = cardAttempts.filter((o) => o.status === "paid" || o.status === "approved");
  const cardApprovalRate = cardAttempts.length > 0 ? ((cardApproved.length / cardAttempts.length) * 100).toFixed(0) : "0";

  const pixAttempts = filtered.filter((o) => o.payment_method === "pix");
  const pixApproved = pixAttempts.filter((o) => o.status === "paid" || o.status === "approved");
  const pixConversionRate = pixAttempts.length > 0 ? ((pixApproved.length / pixAttempts.length) * 100).toFixed(0) : "0";

  const refundRate = filtered.length > 0 ? ((refunded.length / filtered.length) * 100).toFixed(0) : "0";

  const boletoOrders = filtered.filter((o) => o.payment_method === "boleto");
  const boletoApproved = boletoOrders.filter((o) => o.status === "paid" || o.status === "approved");
  const boletoConversionRate = boletoOrders.length > 0 ? ((boletoApproved.length / boletoOrders.length) * 100).toFixed(0) : "0";
  const boletoGenerated = boletoOrders.length;

  const chargebackOrders = filtered.filter((o) => o.status === "chargeback");
  const chargebackRate = filtered.length > 0 ? ((chargebackOrders.length / filtered.length) * 100).toFixed(0) : "0";

  // Abandoned carts metrics
  const filteredCarts = useMemo(() => filterByPeriod(abandonedCarts), [abandonedCarts, period]);
  const totalAbandoned = filteredCarts.length;
  const recoveredCarts = filteredCarts.filter((c) => c.recovered);
  const recoveryRate = totalAbandoned > 0 ? ((recoveredCarts.length / totalAbandoned) * 100).toFixed(0) : "0";

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

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const metricCards = [
    {
      icon: DollarSign,
      label: "Valor líquido",
      value: fmt(totalLiquido),
      iconColor: "text-blue-500",
    },
    {
      icon: TrendingUp,
      label: "Vendas",
      value: String(totalVendas),
      iconColor: "text-primary",
    },
    {
      icon: CreditCard,
      label: "Aprovação cartão",
      value: `${cardApprovalRate} %`,
      iconColor: "text-muted-foreground",
    },
    {
      icon: Banknote,
      label: "Vendas PIX",
      value: fmt(pixApproved.reduce((s, o) => s + Number(o.amount), 0)),
      sub: `${pixConversionRate} %`,
      iconColor: "text-primary",
    },
    {
      icon: RefreshCcw,
      label: "Reembolso",
      value: `${refundRate} %`,
      iconColor: "text-orange-500",
    },
    {
      icon: FileText,
      label: "Conversão boleto",
      value: `${boletoConversionRate} %`,
      iconColor: "text-muted-foreground",
    },
    {
      icon: AlertOctagon,
      label: "Chargeback",
      value: `${chargebackRate} %`,
      iconColor: "text-destructive",
    },
    {
      icon: FileText,
      label: "Boletos gerados",
      value: String(boletoGenerated),
      iconColor: "text-muted-foreground",
    },
    {
      icon: ShoppingCart,
      label: "Carrinhos abandonados",
      value: String(totalAbandoned),
      sub: `${recoveryRate}% recuperados`,
      iconColor: "text-yellow-500",
      onClick: () => navigate("/admin/abandoned"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {periodLabels[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Todos os produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main grid: Chart left + Cards right */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-7 border border-border shadow-none">
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevKiwify" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-xs" />
                  <YAxis tick={{ fontSize: 11 }} className="text-xs" tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--foreground))"
                    fill="url(#colorRevKiwify)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
              <span>Hoje, 0,00</span>
              <span>Hoje, 23:59</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric cards grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          {metricCards.map((card, i) => (
            <Card
              key={i}
              className={`border border-border shadow-none ${card.onClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
              onClick={card.onClick}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <card.icon className={`w-5 h-5 mt-0.5 shrink-0 ${card.iconColor}`} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                  <p className="text-lg font-semibold text-foreground leading-tight mt-0.5">{card.value}</p>
                  {card.sub && (
                    <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
