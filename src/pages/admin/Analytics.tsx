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
  MousePointerClick,
  Activity,
  Settings,
  Save,
  Loader2,
  TrendingUp,
  Globe,
  Monitor,
  Smartphone,
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
  const [clarityId, setClarityId] = useState("");
  const [savedClarityId, setSavedClarityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [pixelEvents, setPixelEvents] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

        const [settingsRes, ordersRes, eventsRes, cartsRes] = await Promise.all([
          supabase.from("platform_settings").select("clarity_project_id").limit(1).single(),
          ordersQuery,
          eventsQuery,
          cartsQuery,
        ]);
        if (settingsRes.data?.clarity_project_id) {
          setClarityId(settingsRes.data.clarity_project_id);
          setSavedClarityId(settingsRes.data.clarity_project_id);
        }
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

  const saveClarityId = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ clarity_project_id: clarityId })
        .not("id", "is", null);
      if (error) throw error;
      setSavedClarityId(clarityId);
      toast.success("Clarity ID salvo!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sales by state
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

  // Top 5 states
  const topStates = useMemo(() =>
    Object.entries(salesByState).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5),
    [salesByState]
  );

  // Funnel from pixel_events + orders + abandoned carts
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    pixelEvents.forEach((e) => { counts[e.event_name] = (counts[e.event_name] || 0) + 1; });
    
    // Enrich with abandoned cart data (they represent InitiateCheckout without Purchase)
    const totalAbandoned = abandonedCarts.filter(c => !c.recovered).length;
    const totalRecovered = abandonedCarts.filter(c => c.recovered).length;
    
    return FUNNEL_STEPS.map((step, i) => {
      let count = counts[step.key] || 0;
      return { ...step, count };
    });
  }, [pixelEvents, abandonedCarts]);

  const funnelMax = Math.max(...funnelData.map((f) => f.count), 1);

  // Abandoned vs recovered metrics
  const cartMetrics = useMemo(() => {
    const total = abandonedCarts.length;
    const recovered = abandonedCarts.filter(c => c.recovered).length;
    const abandoned = total - recovered;
    const recoveryRate = total > 0 ? ((recovered / total) * 100).toFixed(1) : "0";
    const lostRevenue = abandonedCarts.filter(c => !c.recovered).reduce((s, c) => s + Number(c.product_price || 0), 0);
    const recoveredRevenue = abandonedCarts.filter(c => c.recovered).reduce((s, c) => s + Number(c.product_price || 0), 0);
    return { total, recovered, abandoned, recoveryRate, lostRevenue, recoveredRevenue };
  }, [abandonedCarts]);

  // Payment method distribution
  const paidOrders = useMemo(() => orders.filter(o => ["paid", "approved", "confirmed"].includes(o.status)), [orders]);
  const paymentDist = useMemo(() => {
    const pix = paidOrders.filter((o) => o.payment_method === "pix").length;
    const card = paidOrders.filter((o) => o.payment_method === "credit_card").length;
    const boleto = paidOrders.filter((o) => o.payment_method === "boleto").length;
    const other = paidOrders.length - pix - card - boleto;
    return [
      { name: "PIX", value: pix },
      { name: "Cartão", value: card },
      { name: "Boleto", value: boleto },
      { name: "Outros", value: other },
    ].filter((d) => d.value > 0);
  }, [paidOrders]);

  // Revenue by day chart
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

  // Device breakdown from pixel_events
  const deviceData = useMemo(() => {
    const uniqueVisitors = new Set(pixelEvents.filter((e) => e.visitor_id).map((e) => e.visitor_id));
    const browserEvents = pixelEvents.filter((e) => e.source === "browser").length;
    const serverEvents = pixelEvents.filter((e) => e.source === "server").length;
    return { uniqueVisitors: uniqueVisitors.size, browserEvents, serverEvents, totalEvents: pixelEvents.length };
  }, [pixelEvents]);

  // UTM source distribution from orders
  const utmSources = useMemo(() => {
    const sources: Record<string, number> = {};
    paidOrders.forEach((o) => {
      const src = (o.metadata as any)?.utm_source || "Orgânico";
      sources[src] = (sources[src] || 0) + 1;
    });
    return Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [paidOrders]);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending");
  const totalPending = pendingOrders.reduce((s, o) => s + Number(o.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Panttera Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão completa de comportamento e conversões
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-secondary/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
              <SelectItem value="90days">90 dias</SelectItem>
              <SelectItem value="total">Total</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faturamento</p>
              <p className="text-lg font-bold text-foreground">{fmt(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <ShoppingCart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendas Aprovadas</p>
              <p className="text-lg font-bold text-foreground">{paidOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Visitantes</p>
              <p className="text-lg font-bold text-foreground">{deviceData.uniqueVisitors}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversão</p>
              <p className="text-lg font-bold text-foreground">
                {deviceData.uniqueVisitors > 0
                  ? ((paidOrders.length / deviceData.uniqueVisitors) * 100).toFixed(1)
                  : "0"}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abandonment KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Abandonos</p>
              <p className="text-lg font-bold text-foreground">{cartMetrics.abandoned}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recuperados</p>
              <p className="text-lg font-bold text-foreground">{cartMetrics.recovered}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa Recuperação</p>
              <p className="text-lg font-bold text-foreground">{cartMetrics.recoveryRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-lg font-bold text-foreground">{pendingOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">{fmt(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart + Full Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Faturamento por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [fmt(value), "Receita"]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Full Conversion Funnel */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-primary" />
              Funil Completo: Visitante → Aprovado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((step, i) => {
                const Icon = step.icon;
                const prevCount = i > 0 ? funnelData[i - 1].count : step.count;
                const dropRate = prevCount > 0 && i > 0 ? ((1 - step.count / prevCount) * 100).toFixed(0) : null;
                const convFromFirst = funnelData[0].count > 0 ? ((step.count / funnelData[0].count) * 100).toFixed(1) : "0";
                return (
                  <div key={step.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: step.color }} />
                        <span className="text-sm text-foreground font-medium">{step.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{step.count}</span>
                        {i > 0 && (
                          <span className="text-[10px] text-muted-foreground">({convFromFirst}%)</span>
                        )}
                        {dropRate && Number(dropRate) > 0 && (
                          <span className="text-xs text-red-400">-{dropRate}%</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(step.count / funnelMax) * 100}%`,
                          backgroundColor: step.color,
                        }}
                      />
                    </div>
                    {/* Show abandonment between checkout and payment */}
                    {step.key === "InitiateCheckout" && cartMetrics.abandoned > 0 && (
                      <div className="flex items-center gap-2 pl-6 pt-1">
                        <XCircle className="w-3 h-3 text-red-400" />
                        <span className="text-[11px] text-red-400">
                          {cartMetrics.abandoned} abandonaram · {cartMetrics.recovered} recuperados ({cartMetrics.recoveryRate}%)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Overall conversion summary */}
            {funnelData[0].count > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Conversão total (Visitante → Aprovado)</span>
                <span className="text-sm font-bold text-primary">
                  {((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brazil Map */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Vendas por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalWithState === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Map className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma venda com estado registrado.</p>
                <p className="text-xs text-muted-foreground mt-1">O estado será capturado automaticamente via DDD do telefone nas próximas vendas.</p>
              </div>
            ) : (
              <BrazilMap salesByState={salesByState} />
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Top States */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Top 5 Estados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topStates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem dados geográficos</p>
              ) : (
                <div className="space-y-3">
                  {topStates.map(([uf, data], i) => (
                    <div key={uf} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{uf}</span>
                          <span className="text-xs text-muted-foreground">{data.count} · {fmt(data.revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(data.revenue / (topStates[0]?.[1]?.revenue || 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Distribution */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Métodos de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentDist.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-[120px] h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentDist} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                          {paymentDist.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {paymentDist.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-foreground">{d.name}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* UTM Sources */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Fontes de Tráfego
              </CardTitle>
            </CardHeader>
            <CardContent>
              {utmSources.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {utmSources.map(([src, count]) => (
                    <div key={src} className="flex items-center justify-between">
                      <span className="text-xs text-foreground truncate max-w-[150px]">{src}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clarity Config (Optional) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Microsoft Clarity — Heatmaps & Gravações (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Para heatmaps e gravações de sessão, configure o Clarity. O dashboard acima funciona 100% sem ele.
          </p>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Clarity Project ID (ex: abc123xyz)"
              value={clarityId}
              onChange={(e) => setClarityId(e.target.value)}
              className="max-w-md bg-secondary/50 border-border"
            />
            <Button onClick={saveClarityId} disabled={saving || clarityId === savedClarityId} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </div>
          {savedClarityId && (
            <>
              <p className="text-xs text-muted-foreground">✅ Ativo — ID: <code className="text-primary">{savedClarityId}</code></p>
              <div className="relative">
                <pre className="bg-secondary/60 rounded-lg p-3 text-xs text-foreground overflow-x-auto border border-border">
{`<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${savedClarityId}");</script>`}
                </pre>
                <Button
                  variant="outline" size="sm" className="absolute top-2 right-2 text-xs gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(`<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/${savedClarityId}";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${savedClarityId}");</script>`);
                    toast.success("Copiado!");
                  }}
                >
                  <Copy className="w-3 h-3" /> Copiar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;