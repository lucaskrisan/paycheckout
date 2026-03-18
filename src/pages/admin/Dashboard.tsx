import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/notificationSounds";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  RefreshCcw,
  AlertOctagon,
  ShoppingCart,
  Globe,
  Clock,
  Megaphone,
  Leaf,
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
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";

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
  const liveVisitors = useCheckoutPresence("watch");
  const [orders, setOrders] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");
  const isSyncingOrdersRef = useRef(false);

  const syncOrdersWithGateway = useCallback(async (): Promise<boolean> => {
    if (isSyncingOrdersRef.current) return false;

    isSyncingOrdersRef.current = true;
    try {
      const { error } = await supabase.functions.invoke("reconcile-orders", {
        body: { hours_back: 24 * 30 },
      });

      if (error) {
        console.error("[dashboard] reconcile-orders error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("[dashboard] reconcile-orders unexpected error:", err);
      return false;
    } finally {
      isSyncingOrdersRef.current = false;
    }
  }, []);

  const fetchAllOrders = useCallback(async () => {
    const pageSize = 1000;
    let from = 0;
    const allOrders: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, status, amount, platform_fee_amount, payment_method, product_id, metadata")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const chunk = data || [];
      allOrders.push(...chunk);

      if (chunk.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return allOrders;
  }, []);

  const fetchAndSetData = useCallback(async () => {
    if (!user) return;

    const [allOrders, cartsRes, productsRes] = await Promise.all([
      fetchAllOrders(),
      supabase
        .from("abandoned_carts")
        .select("id, created_at, recovered")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("products").select("id, name").eq("user_id", user.id),
    ]);

    setOrders(allOrders);
    setAbandonedCarts(cartsRes.data || []);
    setProducts(productsRes.data || []);
  }, [fetchAllOrders, user]);

  const loadData = useCallback(async (isRefresh = false, shouldSync = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);

    try {
      await fetchAndSetData();
    } catch (error) {
      console.error("[dashboard] loadData error:", error);
    } finally {
      if (isRefresh) setRefreshing(false);
    }

    if (shouldSync) {
      void (async () => {
        const synced = await syncOrdersWithGateway();
        if (!synced) return;

        try {
          await fetchAndSetData();
        } catch (error) {
          console.error("[dashboard] post-sync loadData error:", error);
        }
      })();
    }
  }, [fetchAndSetData, syncOrdersWithGateway, user]);

  useEffect(() => {
    loadData(false, true);
  }, [loadData, user]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      loadData(false, true);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [loadData, user]);

  // Realtime: listen for new approved sales and play Ka-CHING
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dashboard-sales-sound")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (
            (newRow.status === "paid" || newRow.status === "approved") &&
            oldRow.status !== "paid" && oldRow.status !== "approved"
          ) {
            playNotificationSound("kaching");
            const amount = Number(newRow.amount || 0).toFixed(2).replace(".", ",");
            toast.success(`💰 Nova venda aprovada! R$ ${amount}`, {
              duration: 5000,
            });
            loadData(false, false);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow.status === "paid" || newRow.status === "approved") {
            playNotificationSound("kaching");
            const amount = Number(newRow.amount || 0).toFixed(2).replace(".", ",");
            toast.success(`💰 Nova venda aprovada! R$ ${amount}`, {
              duration: 5000,
            });
            loadData(false, false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadData]);

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
  const approved = useMemo(() => filtered.filter((o) => ["paid", "approved", "confirmed"].includes(o.status)), [filtered]);
  const pending = useMemo(() => filtered.filter((o) => o.status === "pending"), [filtered]);
  const refunded = useMemo(() => filtered.filter((o) => o.status === "refunded"), [filtered]);

  const totalBruto = approved.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalTaxas = approved.reduce((s, o) => s + Number(o.platform_fee_amount || 0), 0);
  const totalLiquido = totalBruto - totalTaxas;
  const totalVendas = approved.length;
  const totalPendente = pending.reduce((s, o) => s + Number(o.amount || 0), 0);


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

  // Organic vs Paid breakdown
  const paidSales = approved.filter((o) => {
    const meta = o.metadata as any;
    return meta?.utm_source;
  });
  const organicSales = approved.filter((o) => {
    const meta = o.metadata as any;
    return !meta?.utm_source;
  });
  const organicRevenue = organicSales.reduce((s, o) => s + Number(o.amount || 0), 0);
  const paidRevenue = paidSales.reduce((s, o) => s + Number(o.amount || 0), 0);

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

  // Kiwify-style metric cards — 2-column grid on right
  const metricCards = [
    {
      icon: DollarSign,
      label: totalTaxas > 0 ? "Valor líquido" : "Faturamento",
      value: totalTaxas > 0 ? fmt(totalLiquido) : fmt(totalBruto),
      sub: totalTaxas > 0 ? `Bruto: ${fmt(totalBruto)} (taxa: ${fmt(totalTaxas)})` : undefined,
    },
    {
      icon: TrendingUp,
      label: "Vendas",
      value: String(totalVendas),
    },
    {
      icon: CreditCard,
      label: "Aprovação cartão",
      value: `${cardApprovalRate} %`,
    },
    {
      icon: Globe,
      label: "Vendas PIX",
      value: fmt(pixApproved.reduce((s, o) => s + Number(o.amount), 0)),
      sub: `${pixConversionRate} %`,
    },
    {
      icon: RefreshCcw,
      label: "Reembolso",
      value: `${refundRate} %`,
    },
    {
      icon: FileText,
      label: "Conversão boleto",
      value: `${boletoConversionRate} %`,
    },
    {
      icon: AlertOctagon,
      label: "Chargeback",
      value: `${chargebackRate} %`,
    },
    {
      icon: FileText,
      label: "Boletos gerados",
      value: String(boletoGenerated),
    },
    {
      icon: Megaphone,
      label: "Vendas Pagas (Ads)",
      value: `${paidSales.length}`,
      sub: fmt(paidRevenue),
    },
    {
      icon: Leaf,
      label: "Vendas Orgânicas",
      value: `${organicSales.length}`,
      sub: fmt(organicRevenue),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header — matches Kiwify */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-background text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-foreground font-medium">{liveVisitors}</span>
            <span className="text-muted-foreground">visitantes ao vivo</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => loadData(true, true)}
            disabled={refreshing}
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[150px] h-9 text-sm bg-background border-border">
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
            <SelectTrigger className="w-[170px] h-9 text-sm bg-background border-border">
              <SelectValue placeholder="Todos os produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Kiwify layout: chart left + 2 tall metric cards right on first row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <Card className="border border-border bg-card shadow-none">
          <CardContent className="p-5">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
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
                    stroke="hsl(var(--primary))"
                    fill="url(#colorRev)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-2 px-1">
              <span>Hoje, 0:00</span>
              <span>Hoje, 23:59</span>
            </div>
          </CardContent>
        </Card>

        {/* First 2 metric cards stacked — Valor líquido + Vendas */}
        <div className="flex flex-col gap-4">
          {metricCards.slice(0, 2).map((card, i) => (
            <Card key={i} className="border border-border bg-card shadow-none flex-1">
              <CardContent className="p-5 flex items-center gap-4 h-full">
                <div className="p-2.5 rounded-full bg-muted">
                  <card.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                  {card.sub && <p className="text-xs text-muted-foreground">{card.sub}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Remaining cards — 2 columns like Kiwify */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metricCards.slice(2).map((card, i) => (
          <Card key={i} className="border border-border bg-card shadow-none">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-full bg-muted">
                <card.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold text-foreground">{card.value}</p>
                {card.sub && <p className="text-xs text-muted-foreground">{card.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Pending sales card */}
        <Card
          className="border border-border bg-card shadow-none cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate("/admin/orders")}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-full bg-muted">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas pendentes</p>
              <p className="text-xl font-bold text-foreground">{pending.length}</p>
              <p className="text-xs text-muted-foreground">{fmt(totalPendente)} aguardando</p>
            </div>
          </CardContent>
        </Card>

        {/* Abandoned carts card */}
        <Card
          className="border border-border bg-card shadow-none cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => navigate("/admin/abandoned")}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-full bg-muted">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carrinhos abandonados</p>
              <p className="text-xl font-bold text-foreground">{totalAbandoned}</p>
              <p className="text-xs text-muted-foreground">{recoveryRate}% recuperados</p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;
