// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart3,
  Map,
  Eye,
  Activity,
  Settings,
  Save,
  Loader2,
  TrendingUp,
  Globe,
  ShoppingCart,
  CreditCard,
  ArrowDown,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import BrazilMap from "@/components/admin/analytics/BrazilMap";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const FUNNEL_STEPS = [
  { key: "PageView", label: "Visitante", icon: Eye, color: "hsl(220, 80%, 60%)" },
  { key: "ViewContent", label: "Viu Produto", icon: Globe, color: "hsl(200, 70%, 50%)" },
  { key: "InitiateCheckout", label: "Checkout", icon: ShoppingCart, color: "hsl(151, 70%, 45%)" },
  { key: "AddPaymentInfo", label: "Pagamento", icon: CreditCard, color: "hsl(40, 90%, 50%)" },
  { key: "Purchase", label: "Aprovado", icon: CheckCircle, color: "hsl(151, 100%, 35%)" },
];

const PIE_COLORS = ["hsl(151,100%,45%)", "hsl(220,80%,55%)", "hsl(280,60%,55%)", "hsl(40,90%,55%)"];

const Analytics = () => {
  const { user, isSuperAdmin } = useAuth();
  // Clarity ID removed per user request
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [pixelEvents, setPixelEvents] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [period, setPeriod] = useState("30days");

  const getDateFrom = (p: string) => {
    const now = new Date();
    if (p === "today") { return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(); }
    if (p === "7days") { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
    if (p === "30days") { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString(); }
    if (p === "90days") { const d = new Date(now); d.setDate(d.getDate() - 90); return d.toISOString(); }
    if (p === "total") { return null; }
    return null;
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const dateFrom = getDateFrom(period);
        const ordersQuery = supabase
          .from("orders")
          .select("id, status, amount, customer_state, payment_method, created_at, metadata")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (!isSuperAdmin) ordersQuery.eq("user_id", user.id);
        if (dateFrom) ordersQuery.gte("created_at", dateFrom);

        const eventsQuery = supabase
          .from("pixel_events")
          .select("id, event_name, source, created_at, visitor_id")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (!isSuperAdmin) eventsQuery.eq("user_id", user.id);
        if (dateFrom) eventsQuery.gte("created_at", dateFrom);

        const cartsQuery = supabase
          .from("abandoned_carts")
          .select("id, recovered, created_at, product_price")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (!isSuperAdmin) cartsQuery.eq("user_id", user.id);
        if (dateFrom) cartsQuery.gte("created_at", dateFrom);

        const [ordersRes, eventsRes, cartsRes] = await Promise.all([
          ordersQuery,
          eventsQuery,
          cartsQuery,
        ]);
        setOrders(ordersRes.data || []);
        setPixelEvents(eventsRes.data || []);
        setAbandonedCarts(cartsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, period]);

  // saveClarityId removed per user request

  const salesByState = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.filter(o => ["paid", "approved", "confirmed"].includes(o.status)).forEach((o) => {
      const state = o.customer_state?.toUpperCase();
      if (!state) return;
      if (!map[state]) map[state] = { count: 0, revenue: 0 };
      map[state].count += 1;
      map[state].revenue += Number(o.amount || 0);
    });
    return map;
  }, [orders]);

  const totalWithState = useMemo(() => orders.filter((o) => o.customer_state && ["paid", "approved", "confirmed"].includes(o.status)).length, [orders]);
  const topStates = useMemo(() => Object.entries(salesByState).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5), [salesByState]);

  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    pixelEvents.forEach((e) => { counts[e.event_name] = (counts[e.event_name] || 0) + 1; });
    return FUNNEL_STEPS.map((step) => ({ ...step, count: counts[step.key] || 0 }));
  }, [pixelEvents]);

  const funnelMax = Math.max(...funnelData.map((f) => f.count), 1);

  const cartMetrics = useMemo(() => {
    const total = abandonedCarts.length;
    const recovered = abandonedCarts.filter(c => c.recovered).length;
    const abandoned = total - recovered;
    const recoveryRate = total > 0 ? ((recovered / total) * 100).toFixed(1) : "0";
    return { total, recovered, abandoned, recoveryRate };
  }, [abandonedCarts]);

  const paidOrders = useMemo(() => orders.filter(o => ["paid", "approved", "confirmed"].includes(o.status)), [orders]);
  const paymentDist = useMemo(() => {
    const pix = paidOrders.filter((o) => o.payment_method === "pix").length;
    const card = paidOrders.filter((o) => o.payment_method === "credit_card").length;
    const boleto = paidOrders.filter((o) => o.payment_method === "boleto").length;
    const other = paidOrders.length - pix - card - boleto;
    return [{ name: "PIX", value: pix }, { name: "Cartão", value: card }, { name: "Boleto", value: boleto }, { name: "Outros", value: other }].filter((d) => d.value > 0);
  }, [paidOrders]);

  const revenueByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const numDays = period === "7days" ? 7 : period === "30days" ? 30 : period === "today" ? 1 : 90;
    const now = new Date();
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })] = 0;
    }
    paidOrders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (days[key] !== undefined) days[key] += Number(o.amount || 0);
    });
    return Object.entries(days).map(([name, total]) => ({ name, total }));
  }, [paidOrders, period]);

  const deviceData = useMemo(() => {
    const uniqueVisitors = new Set(pixelEvents.filter((e) => e.visitor_id).map((e) => e.visitor_id));
    return { uniqueVisitors: uniqueVisitors.size };
  }, [pixelEvents]);

  const utmSources = useMemo(() => {
    const sources: Record<string, number> = {};
    paidOrders.forEach((o) => { const src = (o.metadata as any)?.utm_source || "Orgânico"; sources[src] = (sources[src] || 0) + 1; });
    return Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [paidOrders]);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending");

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panttera Analytics</h1>
          <p className="text-muted-foreground">Visão inteligente de performance</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">7 dias</SelectItem>
            <SelectItem value="30days">30 dias</SelectItem>
            <SelectItem value="90days">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Faturamento", value: fmt(totalRevenue), icon: TrendingUp },
          { label: "Vendas", value: paidOrders.length, icon: ShoppingCart },
          { label: "Visitantes", value: deviceData.uniqueVisitors, icon: Eye },
          { label: "Conversão", value: deviceData.uniqueVisitors > 0 ? `${((paidOrders.length / deviceData.uniqueVisitors) * 100).toFixed(1)}%` : "0%", icon: Activity },
        ].map((kpi, i) => (
          <Card key={i} className="bg-gradient-to-br from-card to-card/50 shadow-sm border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><kpi.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-card/50 shadow-sm border-border/50">
          <CardHeader><CardTitle>Faturamento diário</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <ReTooltip formatter={(v: number) => [fmt(v), ""]} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 shadow-sm border-border/50">
          <CardHeader><CardTitle>Funil de Conversão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {funnelData.map((step) => (
              <div key={step.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 font-medium"><step.icon className="w-4 h-4" style={{ color: step.color }}/> {step.label}</span>
                  <span className="font-bold">{step.count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${funnelMax > 0 ? (step.count/funnelMax)*100 : 0}%`, backgroundColor: step.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      {/* Microsoft Clarity section removed per user request */}
    </div>
  );
};

export default Analytics;