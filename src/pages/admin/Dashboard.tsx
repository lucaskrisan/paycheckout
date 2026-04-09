// @ts-nocheck
import { useEffect, useMemo, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import GatewayAlerts from "@/components/admin/GatewayAlerts";
import DashboardHeaderBar, { type Period, type Currency } from "@/components/admin/dashboard/DashboardHeader";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import DashboardHeroCard from "@/components/admin/dashboard/DashboardHeroCard";
import DashboardMetricCard from "@/components/admin/dashboard/DashboardMetricCard";
import DashboardStateMap from "@/components/admin/dashboard/DashboardStateMap";
import DashboardApprovalCard from "@/components/admin/dashboard/DashboardApprovalCard";
import DashboardWeekdayChart from "@/components/admin/dashboard/DashboardWeekdayChart";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");
  const [currency, setCurrency] = useState<Currency>("BRL");

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
  const chargedback = useMemo(() => filtered.filter((o) => o.status === "chargedback"), [filtered]);

  const totalBruto = approved.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalTaxas = approved.reduce((s, o) => s + Number(o.platform_fee_amount || 0), 0);
  const totalLiquido = totalBruto - totalTaxas;
  const totalVendas = approved.length;
  const totalPendente = pending.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalRefunded = refunded.reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalChargeback = chargedback.reduce((s, o) => s + Number(o.amount || 0), 0);

  const cardDecided = filtered.filter((o) => o.payment_method === "credit_card" && o.status !== "pending");
  const cardApproved = cardDecided.filter((o) => o.status === "paid" || o.status === "approved");
  const cardApprovalRate = cardDecided.length > 0 ? (cardApproved.length / cardDecided.length) * 100 : 0;

  const pixDecided = filtered.filter((o) => o.payment_method === "pix" && o.status !== "pending");
  const pixApproved = pixDecided.filter((o) => o.status === "paid" || o.status === "approved");
  const pixApprovalRate = pixDecided.length > 0 ? (pixApproved.length / pixDecided.length) * 100 : 0;

  const paidSales = approved.filter((o) => (o.metadata as any)?.utm_source);
  const organicSales = approved.filter((o) => !(o.metadata as any)?.utm_source);
  const organicRevenue = organicSales.reduce((s, o) => s + Number(o.amount || 0), 0);
  const paidRevenue = paidSales.reduce((s, o) => s + Number(o.amount || 0), 0);

  const abandonedFiltered = useMemo(() => {
    const dateFrom = getDateFilter(period);
    if (!dateFrom) return abandonedCarts;
    return abandonedCarts.filter((c) => c.created_at >= dateFrom);
  }, [abandonedCarts, period, getDateFilter]);
  const totalAbandoned = abandonedFiltered.length;
  const recoveredCarts = abandonedFiltered.filter((c) => c.recovered);
  const recoveryRate = totalAbandoned > 0 ? ((recoveredCarts.length / totalAbandoned) * 100).toFixed(0) : "0";

  const avgTicket = totalVendas > 0 ? totalBruto / totalVendas : 0;

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

  // Sparkline data for visitors (simulated recent activity)
  const visitorSparkline = useMemo(() => {
    // Generate last 12 data points based on recent order frequency
    const points: number[] = [];
    for (let i = 0; i < 12; i++) {
      points.push(Math.max(0, liveVisitors + Math.floor(Math.random() * 3) - 1));
    }
    points[points.length - 1] = liveVisitors;
    return points;
  }, [liveVisitors]);

  const exchangeRates: Record<Currency, number> = { BRL: 1, USD: 0.18, EUR: 0.16 };
  const currencySymbols: Record<Currency, string> = { BRL: "R$", USD: "$", EUR: "€" };

  const fmt = (v: number) => {
    const converted = v * exchangeRates[currency];
    if (currency === "BRL") return `R$ ${converted.toFixed(2).replace(".", ",")}`;
    return `${currencySymbols[currency]} ${converted.toFixed(2)}`;
  };

  return (
    <div className="space-y-3">
      <DashboardHeaderBar
        period={period}
        onPeriodChange={setPeriod}
        selectedProductId={selectedProductId}
        onProductChange={setSelectedProductId}
        products={products}
        liveVisitors={liveVisitors}
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      <GatewayAlerts />

      {/* ROW 1 — 3 hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DashboardHeroCard
          label="Receita Líquida"
          value={totalLiquido}
          fmt={fmt}
          variant="revenue"
          sublabel={totalTaxas > 0 ? `+ ${fmt(totalBruto)}` : undefined}
          tooltip="Receita aprovada menos taxas da plataforma"
        />
        <DashboardHeroCard
          label="Vendas Aprovadas"
          value={totalVendas}
          fmt={(v) => String(Math.round(v))}
          variant="sales"
          sublabel={filtered.length > 0 ? `${((approved.length / filtered.length) * 100).toFixed(0)}% de aprovação` : undefined}
          tooltip="Total de vendas com pagamento confirmado"
        />
        <DashboardHeroCard
          label="Vendas Pendentes"
          value={totalPendente}
          fmt={fmt}
          variant="ticket"
          sublabel={`${pending.length} pedidos`}
          tooltip="Pedidos aguardando confirmação de pagamento"
        />
      </div>

      {/* ROW 2 — Chart + metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7">
          <DashboardChart data={chartData} fmt={fmt} />
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <DashboardMetricCard
            label="Vendas via Ads"
            value={String(paidSales.length)}
            sub={fmt(paidRevenue)}
            tooltip="Vendas com UTM identificado (tráfego pago)"
          />
          <DashboardMetricCard
            label="Vendas Orgânicas"
            value={String(organicSales.length)}
            sub={fmt(organicRevenue)}
            tooltip="Vendas sem UTM (tráfego orgânico/direto)"
          />
          <DashboardMetricCard
            label="Total de Pedidos"
            value={String(filtered.length)}
            sub={`${approved.length} aprovados · ${pending.length} pendentes`}
            tooltip="Número total de pedidos no período selecionado"
          />
          <DashboardMetricCard
            label="Ticket Médio"
            value={fmt(avgTicket)}
            sub="Valor médio por venda"
            tooltip="Valor médio por venda aprovada"
          />
          <DashboardMetricCard
            label="Reembolsos"
            value={fmt(totalRefunded)}
            sub={`${refunded.length} pedidos`}
            tooltip="Valor total de reembolsos processados"
          />
          <DashboardMetricCard
            label="Carrinhos Abandonados"
            value={String(totalAbandoned)}
            sub={`${recoveryRate}% recuperados`}
            onClick={() => navigate("/admin/abandoned")}
            tooltip="Total de checkouts iniciados sem finalização"
          />
        </div>
      </div>

      {/* ROW 3 — Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <DashboardWeekdayChart orders={filtered} fmt={fmt} />
        <DashboardStateMap salesByState={salesByState} fmt={fmt} />
        <DashboardApprovalCard
          chargebackValue={fmt(totalChargeback)}
          chargebackCount={chargedback.length}
          items={[
            { label: "Cartão", rate: cardApprovalRate },
            { label: "Pix", rate: pixApprovalRate },
          ]}
        />
      </div>
    </div>
  );
};

export default Dashboard;
