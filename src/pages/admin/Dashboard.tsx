// @ts-nocheck
import { useEffect, useMemo, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  RefreshCcw,
  ShoppingCart,
  Globe,
  Clock,
  Megaphone,
  Leaf,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import GatewayAlerts from "@/components/admin/GatewayAlerts";
import DashboardHeaderBar, { type Period } from "@/components/admin/dashboard/DashboardHeader";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import DashboardMetricCard from "@/components/admin/dashboard/DashboardMetricCard";
import DashboardHeroCard from "@/components/admin/dashboard/DashboardHeroCard";
import DashboardStateMap from "@/components/admin/dashboard/DashboardStateMap";
import DashboardCustomizer, { type MetricConfig } from "@/components/admin/dashboard/DashboardCustomizer";
import { toast } from "sonner";

const ALL_METRICS: MetricConfig[] = [
  { key: "card_approval", label: "Aprovação cartão", icon: CreditCard },
  { key: "pix_sales", label: "Vendas PIX", icon: Globe },
  { key: "refund", label: "Reembolso", icon: RefreshCcw },
  { key: "paid_ads", label: "Vendas Pagas (Ads)", icon: Megaphone },
  { key: "organic", label: "Vendas Orgânicas", icon: Leaf },
  { key: "pending", label: "Vendas pendentes", icon: Clock },
  { key: "abandoned", label: "Carrinhos abandonados", icon: ShoppingCart },
  { key: "avg_ticket", label: "Ticket médio", icon: TrendingUp },
];

const DEFAULT_KEYS = ALL_METRICS.map((m) => m.key);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");

  // Dashboard customization
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(DEFAULT_KEYS);
  const [metricsOrder, setMetricsOrder] = useState<string[]>(DEFAULT_KEYS);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);

  const ownerProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const liveVisitors = useCheckoutPresence("watch", undefined, ownerProductIds);

  // Load dashboard preferences
  useEffect(() => {
    if (!user) return;
    supabase
      .from("dashboard_preferences")
      .select("visible_metrics, metrics_order")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (Array.isArray(data.visible_metrics)) setVisibleMetrics(data.visible_metrics);
          if (Array.isArray(data.metrics_order)) setMetricsOrder(data.metrics_order);
        }
      });
  }, [user]);

  const savePreferences = useCallback(async (visible: string[], order: string[]) => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const { error } = await supabase
        .from("dashboard_preferences")
        .upsert({
          user_id: user.id,
          visible_metrics: visible,
          metrics_order: order,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
      setVisibleMetrics(visible);
      setMetricsOrder(order);
      toast.success("Dashboard personalizado salvo!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar preferências");
    } finally {
      setSavingPrefs(false);
    }
  }, [user]);

  const getDateFilter = useCallback((p: Period): string | null => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (p) {
      case "today": return startOfDay.toISOString();
      case "yesterday": { const y = new Date(startOfDay); y.setDate(y.getDate() - 1); return y.toISOString(); }
      case "7days": { const w = new Date(startOfDay); w.setDate(w.getDate() - 7); return w.toISOString(); }
      case "month": return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case "lastMonth": return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      case "total": return null;
      default: return null;
    }
  }, []);

  const fetchOrders = useCallback(async (p: Period) => {
    let query = supabase
      .from("orders")
      .select("id, created_at, status, amount, platform_fee_amount, payment_method, product_id, metadata, customer_state")
      .order("created_at", { ascending: false });

    const dateFrom = getDateFilter(p);
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
      if (p === "yesterday") {
        const now = new Date();
        query = query.lt("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
      }
      if (p === "lastMonth") {
        const now = new Date();
        query = query.lte("created_at", new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString());
      }
    }
    query = query.limit(1000);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [getDateFilter]);

  const fetchAndSetData = useCallback(async () => {
    if (!user) return;
    const [periodOrders, cartsRes, productsRes] = await Promise.all([
      fetchOrders(period),
      supabase.from("abandoned_carts").select("id, created_at, recovered").order("created_at", { ascending: false }).limit(500),
      supabase.from("products").select("id, name").eq("user_id", user.id),
    ]);
    setOrders(periodOrders);
    setAbandonedCarts(cartsRes.data || []);
    setProducts(productsRes.data || []);
  }, [fetchOrders, user, period]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    try { await fetchAndSetData(); }
    catch (error) { console.error("[dashboard] loadData error:", error); }
    finally { if (isRefresh) setRefreshing(false); }
  }, [fetchAndSetData, user]);

  useEffect(() => {
    if (!user) return;
    const doSync = async () => {
      try {
        const { error } = await supabase.functions.invoke("reconcile-orders", { body: { hours_back: 24 * 30 } });
        if (!error) await fetchAndSetData();
      } catch {}
    };
    const timeout = setTimeout(doSync, 3000);
    const interval = setInterval(doSync, 15 * 60 * 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [user, fetchAndSetData]);

  useEffect(() => { loadData(false); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadData(false), 2000);
    };
    const channel = supabase
      .channel("dashboard-orders-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, debouncedRefresh)
      .subscribe();
    return () => { if (debounceTimer) clearTimeout(debounceTimer); supabase.removeChannel(channel); };
  }, [user, loadData]);

  // Computed metrics
  const productFiltered = useMemo(() => {
    if (selectedProductId === "all") return orders;
    return orders.filter((o) => o.product_id === selectedProductId);
  }, [orders, selectedProductId]);

  const filtered = productFiltered;
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

  const paidSales = approved.filter((o) => (o.metadata as any)?.utm_source);
  const organicSales = approved.filter((o) => !(o.metadata as any)?.utm_source);
  const organicRevenue = organicSales.reduce((s, o) => s + Number(o.amount || 0), 0);
  const paidRevenue = paidSales.reduce((s, o) => s + Number(o.amount || 0), 0);

  const totalAbandoned = abandonedCarts.length;
  const recoveredCarts = abandonedCarts.filter((c) => c.recovered);
  const recoveryRate = totalAbandoned > 0 ? ((recoveredCarts.length / totalAbandoned) * 100).toFixed(0) : "0";

  // Sales by state
  const salesByState = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    approved.forEach((o) => {
      const st = o.customer_state?.toUpperCase()?.trim();
      if (st && st.length === 2) {
        if (!map[st]) map[st] = { count: 0, revenue: 0 };
        map[st].count++;
        map[st].revenue += Number(o.amount || 0);
      }
    });
    return map;
  }, [approved]);

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

  const heroLabel = totalTaxas > 0 ? "Valor líquido" : "Faturamento";
  const heroValue = totalTaxas > 0 ? totalLiquido : totalBruto;
  const heroSub = totalTaxas > 0 ? `Bruto: ${fmt(totalBruto)} · Taxa: ${fmt(totalTaxas)}` : undefined;

  // Metric cards map
  const metricCards: Record<string, JSX.Element> = {
    card_approval: <DashboardMetricCard key="card_approval" icon={CreditCard} label="Aprovação cartão" value={`${cardApprovalRate}%`} accent />,
    pix_sales: <DashboardMetricCard key="pix_sales" icon={Globe} label="Vendas PIX" value={fmt(pixApproved.reduce((s, o) => s + Number(o.amount), 0))} sub={`${pixConversionRate}% conversão`} accent />,
    refund: <DashboardMetricCard key="refund" icon={RefreshCcw} label="Reembolso" value={`${refundRate}%`} />,
    paid_ads: <DashboardMetricCard key="paid_ads" icon={Megaphone} label="Vendas Pagas (Ads)" value={String(paidSales.length)} sub={fmt(paidRevenue)} />,
    organic: <DashboardMetricCard key="organic" icon={Leaf} label="Vendas Orgânicas" value={String(organicSales.length)} sub={fmt(organicRevenue)} />,
    pending: <DashboardMetricCard key="pending" icon={Clock} label="Vendas pendentes" value={String(pending.length)} sub={`${fmt(totalPendente)} aguardando`} onClick={() => navigate("/admin/orders")} />,
    abandoned: <DashboardMetricCard key="abandoned" icon={ShoppingCart} label="Carrinhos abandonados" value={String(totalAbandoned)} sub={`${recoveryRate}% recuperados`} onClick={() => navigate("/admin/abandoned")} />,
    avg_ticket: <DashboardMetricCard key="avg_ticket" icon={TrendingUp} label="Ticket médio" value={totalVendas > 0 ? fmt(totalBruto / totalVendas) : fmt(0)} />,
  };

  // Ordered + filtered metrics
  const renderedMetrics = metricsOrder
    .filter((key) => visibleMetrics.includes(key))
    .map((key) => metricCards[key])
    .filter(Boolean);

  return (
    <div className="flex gap-4">
      {/* Sidebar de edição — estilo UTMify */}
      {editingLayout && (
        <DashboardCustomizer
          allMetrics={ALL_METRICS}
          visibleMetrics={visibleMetrics}
          metricsOrder={metricsOrder}
          onSave={savePreferences}
          saving={savingPrefs}
          editing={editingLayout}
          onEditingChange={setEditingLayout}
        />
      )}

      {/* Main dashboard content */}
      <div className="flex-1 min-w-0 space-y-3">
        <DashboardHeaderBar
          period={period}
          onPeriodChange={setPeriod}
          selectedProductId={selectedProductId}
          onProductChange={setSelectedProductId}
          products={products}
          liveVisitors={liveVisitors}
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          extraActions={
            !editingLayout ? (
              <DashboardCustomizer
                allMetrics={ALL_METRICS}
                visibleMetrics={visibleMetrics}
                metricsOrder={metricsOrder}
                onSave={savePreferences}
                saving={savingPrefs}
                editing={editingLayout}
                onEditingChange={setEditingLayout}
              />
            ) : null
          }
        />

        <GatewayAlerts />

        {/* Hero Row */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="sm:col-span-3">
            <DashboardHeroCard
              label={heroLabel}
              value={heroValue}
              fmt={fmt}
              sublabel={heroSub}
              variant="revenue"
            />
          </div>
          <div className="sm:col-span-2">
            <DashboardHeroCard
              label="Vendas aprovadas"
              value={totalVendas}
              fmt={(v) => String(Math.round(v))}
              sublabel={`${approved.length} de ${filtered.length} pedidos`}
              variant="sales"
            />
          </div>
        </div>

        {/* Chart + State Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <DashboardChart data={chartData} fmt={fmt} />
          </div>
          <DashboardStateMap salesByState={salesByState} fmt={fmt} />
        </div>

        {/* Metric cards grid */}
        {renderedMetrics.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {renderedMetrics}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
