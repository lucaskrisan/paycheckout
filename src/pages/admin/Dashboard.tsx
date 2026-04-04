// @ts-nocheck
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCcw,
  ShoppingCart,
  Globe,
  Clock,
  Megaphone,
  Leaf,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import GatewayAlerts from "@/components/admin/GatewayAlerts";
import DashboardHeaderBar, { type Period } from "@/components/admin/dashboard/DashboardHeader";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import DashboardMetricCard from "@/components/admin/dashboard/DashboardMetricCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");

  const ownerProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const liveVisitors = useCheckoutPresence("watch", undefined, ownerProductIds);

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
      .select("id, created_at, status, amount, platform_fee_amount, payment_method, product_id, metadata")
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

  // Background sync
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

  // Realtime debounced refresh
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
    { icon: DollarSign, label: totalTaxas > 0 ? "Valor líquido" : "Faturamento", value: totalTaxas > 0 ? fmt(totalLiquido) : fmt(totalBruto), sub: totalTaxas > 0 ? `Bruto: ${fmt(totalBruto)} (taxa: ${fmt(totalTaxas)})` : undefined },
    { icon: TrendingUp, label: "Vendas", value: String(totalVendas) },
    { icon: CreditCard, label: "Aprovação cartão", value: `${cardApprovalRate} %` },
    { icon: Globe, label: "Vendas PIX", value: fmt(pixApproved.reduce((s, o) => s + Number(o.amount), 0)), sub: `${pixConversionRate} %` },
    { icon: RefreshCcw, label: "Reembolso", value: `${refundRate} %` },
    { icon: Megaphone, label: "Vendas Pagas (Ads)", value: `${paidSales.length}`, sub: fmt(paidRevenue) },
    { icon: Leaf, label: "Vendas Orgânicas", value: `${organicSales.length}`, sub: fmt(organicRevenue) },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeaderBar
        period={period}
        onPeriodChange={setPeriod}
        selectedProductId={selectedProductId}
        onProductChange={setSelectedProductId}
        products={products}
        liveVisitors={liveVisitors}
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
      />

      <GatewayAlerts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardChart data={chartData} fmt={fmt} />
        <div className="flex flex-col gap-4">
          {metricCards.slice(0, 2).map((card, i) => (
            <DashboardMetricCard key={i} {...card} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metricCards.slice(2).map((card, i) => (
          <DashboardMetricCard key={i} {...card} />
        ))}
        <DashboardMetricCard
          icon={Clock}
          label="Vendas pendentes"
          value={String(pending.length)}
          sub={`${fmt(totalPendente)} aguardando`}
          onClick={() => navigate("/admin/orders")}
        />
        <DashboardMetricCard
          icon={ShoppingCart}
          label="Carrinhos abandonados"
          value={String(totalAbandoned)}
          sub={`${recoveryRate}% recuperados`}
          onClick={() => navigate("/admin/abandoned")}
        />
      </div>
    </div>
  );
};

export default Dashboard;
