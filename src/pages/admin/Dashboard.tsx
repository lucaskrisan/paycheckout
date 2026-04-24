// @ts-nocheck
import { useEffect, useMemo, useCallback, useState, useRef } from "react";
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

interface CurrencyBreakdown {
  approved_count: number;
  approved_amount: number;
  fees_amount: number;
  net_amount: number;
  pending_count: number;
  pending_amount: number;
  refunded_count: number;
  refunded_amount: number;
  chargeback_count: number;
  chargeback_amount: number;
  ads_count: number;
  ads_revenue: number;
  organic_count: number;
  organic_revenue: number;
  total_count: number;
  avg_ticket: number;
}

interface DashboardMetrics {
  total_bruto: number;
  total_taxas: number;
  total_pendente: number;
  total_refunded: number;
  total_chargeback: number;
  count_approved: number;
  count_pending: number;
  count_refunded: number;
  count_chargedback: number;
  count_total: number;
  card_decided: number;
  card_approved: number;
  pix_decided: number;
  pix_approved: number;
  paid_sales_count: number;
  paid_revenue: number;
  organic_sales_count: number;
  organic_revenue: number;
  abandoned_total: number;
  abandoned_recovered: number;
  sales_by_state: Record<string, { count: number; revenue: number }>;
  chart_hourly: { hour: number; total: number }[];
  chart_daily: { date: string; total: number }[];
  by_currency: Record<string, CurrencyBreakdown>;
}

const emptyMetrics: DashboardMetrics = {
  total_bruto: 0, total_taxas: 0, total_pendente: 0, total_refunded: 0, total_chargeback: 0,
  count_approved: 0, count_pending: 0, count_refunded: 0, count_chargedback: 0, count_total: 0,
  card_decided: 0, card_approved: 0, pix_decided: 0, pix_approved: 0,
  paid_sales_count: 0, paid_revenue: 0, organic_sales_count: 0, organic_revenue: 0,
  abandoned_total: 0, abandoned_recovered: 0,
  sales_by_state: {}, chart_hourly: [], chart_daily: [],
  by_currency: {},
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");
  const [currency, setCurrency] = useState<Currency>("ALL");

  // For DashboardWeekdayChart we still need raw orders for weekday grouping
  const [weekdayOrders, setWeekdayOrders] = useState<any[]>([]);

  const ownerProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const liveVisitors = useCheckoutPresence("watch", undefined, ownerProductIds);

  const getDateRange = useCallback((p: Period): { from: string | null; to: string | null } => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (p) {
      case "today": return { from: startOfDay.toISOString(), to: null };
      case "yesterday": {
        const y = new Date(startOfDay);
        y.setDate(y.getDate() - 1);
        return { from: y.toISOString(), to: startOfDay.toISOString() };
      }
      case "7days": {
        const w = new Date(startOfDay);
        w.setDate(w.getDate() - 7);
        return { from: w.toISOString(), to: null };
      }
      case "month": return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: null };
      case "lastMonth": {
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
          to: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        };
      }
      case "total": return { from: null, to: null };
      default: return { from: null, to: null };
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    const { from, to } = getDateRange(period);
    const productId = selectedProductId === "all" ? null : selectedProductId;

    const { data, error } = await supabase.rpc("get_dashboard_metrics", {
      p_user_id: user.id,
      p_date_from: from,
      p_date_to: to,
      p_product_id: productId,
      p_is_super_admin: isSuperAdmin,
      p_currency: currency === "ALL" ? null : currency,
    });

    if (error) {
      console.error("[dashboard] RPC error:", error);
      return;
    }

    setMetrics(data || emptyMetrics);
  }, [user, period, selectedProductId, isSuperAdmin, getDateRange, currency]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("products").select("id, name").eq("user_id", user.id);
    setProducts(data || []);
  }, [user]);

  // Fetch minimal orders for weekday chart (only needs created_at, amount, status)
  const fetchWeekdayOrders = useCallback(async () => {
    if (!user) return;
    const { from, to } = getDateRange(period);
    let query = supabase
      .from("orders")
      .select("created_at, amount, status, payment_method")
      .order("created_at", { ascending: false });

    if (!isSuperAdmin) query = query.eq("user_id", user.id);
    if (selectedProductId !== "all") query = query.eq("product_id", selectedProductId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);
    query = query.limit(5000);

    const { data } = await query;
    setWeekdayOrders(data || []);
  }, [user, period, selectedProductId, isSuperAdmin, getDateRange]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    try {
      await Promise.all([fetchMetrics(), fetchProducts(), fetchWeekdayOrders()]);
    } catch (error) {
      console.error("[dashboard] loadData error:", error);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [fetchMetrics, fetchProducts, fetchWeekdayOrders, user]);

  // Reconcile on mount — depends only on user so timers are not recreated on period changes
  useEffect(() => {
    if (!user) return;
    const doSync = async () => {
      try {
        const { error } = await supabase.functions.invoke("reconcile-orders", { body: { hours_back: 24 * 30 } });
        if (!error) await loadDataRef.current(false);
      } catch {}
    };
    const timeout = setTimeout(doSync, 3000);
    const interval = setInterval(doSync, 15 * 60 * 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [user]);

  useEffect(() => { loadData(false); }, [loadData]);

  // Always keep ref in sync so reconcile/realtime closures use latest loadData
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  // Realtime refresh — depends only on user so the channel is not recreated on period changes
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadDataRef.current(false), 2000);
    };
    const channel = supabase
      .channel("dashboard-orders-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, debouncedRefresh)
      .subscribe();
    return () => { if (debounceTimer) clearTimeout(debounceTimer); supabase.removeChannel(channel); };
  }, [user]);

  // Derived values from metrics
  const m = metrics;
  const totalLiquido = m.total_bruto - m.total_taxas;
  const cardApprovalRate = m.card_decided > 0 ? (m.card_approved / m.card_decided) * 100 : 0;
  const pixApprovalRate = m.pix_decided > 0 ? (m.pix_approved / m.pix_decided) * 100 : 0;
  const avgTicket = m.count_approved > 0 ? m.total_bruto / m.count_approved : 0;
  const recoveryRate = m.abandoned_total > 0 ? ((m.abandoned_recovered / m.abandoned_total) * 100).toFixed(0) : "0";

  const isHourly = period === "today" || period === "yesterday";

  const chartData = useMemo(() => {
    if (isHourly) {
      return (m.chart_hourly || []).map((h) => ({
        name: `${String(h.hour).padStart(2, "0")}:00`,
        total: Number(h.total),
      }));
    }
    return (m.chart_daily || []).map((d) => {
      const dt = new Date(d.date);
      return {
        name: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        total: Number(d.total),
      };
    });
  }, [m.chart_hourly, m.chart_daily, isHourly]);

  const salesByState = m.sales_by_state || {};

  // Real currency formatter — never converts; respects whichever currency is selected.
  // When "ALL" is active, BRL is used as display default for aggregated totals,
  // and a per-currency breakdown card is shown separately.
  const fmt = useCallback(
    (v: number, forceCurrency?: "BRL" | "USD") => {
      const c = forceCurrency ?? (currency === "ALL" ? "BRL" : currency);
      const locale = c === "USD" ? "en-US" : "pt-BR";
      return new Intl.NumberFormat(locale, { style: "currency", currency: c }).format(v || 0);
    },
    [currency]
  );

  const breakdown = m.by_currency || {};
  const hasMultipleCurrencies = Object.keys(breakdown).length > 1;
  const showBreakdown = currency === "ALL" && hasMultipleCurrencies;

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

      {/* Multi-currency breakdown — only shows when "Todas" is active and there are sales in 2+ currencies */}
      {showBreakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["BRL", "USD"] as const).map((c) => {
            const data = breakdown[c];
            if (!data) return null;
            const symbol = c === "BRL" ? "R$" : "$";
            const flag = c === "BRL" ? "🇧🇷" : "🇺🇸";
            return (
              <div
                key={c}
                className="rounded-xl border border-white/[0.06] bg-card/70 backdrop-blur-sm p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{flag}</span>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Receita {c}
                    </p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {fmt(Number(data.approved_amount), c)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{data.approved_count} aprovados</p>
                  {data.pending_count > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--status-warning))" }}>
                      {data.pending_count} pendentes ({symbol}
                      {Number(data.pending_amount).toFixed(2)})
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ROW 1 — Hero revenue + compact stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardHeroCard
          label="Receita Líquida"
          value={totalLiquido}
          fmt={fmt}
          variant="revenue"
          sublabel={m.total_taxas > 0 ? `Bruto ${fmt(m.total_bruto)}` : undefined}
          tooltip="Receita aprovada menos taxas da plataforma"
        />
        <DashboardMetricCard
          label="Vendas Aprovadas"
          value={String(m.count_approved)}
          sub={m.count_total > 0 ? `${((m.count_approved / m.count_total) * 100).toFixed(0)}% aprovação` : undefined}
          accent
          tooltip="Total de vendas com pagamento confirmado"
        />
        <DashboardMetricCard
          label="Vendas Pendentes"
          value={fmt(m.total_pendente)}
          sub={`${m.count_pending} pedidos`}
          tooltip="Pedidos aguardando confirmação de pagamento"
        />
        <DashboardMetricCard
          label="Ticket Médio"
          value={fmt(avgTicket)}
          sub="Valor médio por venda"
          tooltip="Valor médio por venda aprovada"
        />
      </div>

      {/* ROW 2 — Chart + metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7">
          <DashboardChart data={chartData} fmt={fmt} title={isHourly ? "Vendas" : "Receita Diária"} subtitle={isHourly ? "Receita no período selecionado" : undefined} />
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <DashboardMetricCard
            label="Total de Pedidos"
            value={String(m.count_total)}
            sub={`${m.count_approved} aprovados · ${m.count_pending} pendentes`}
            tooltip="Número total de pedidos no período selecionado"
          />
          <DashboardMetricCard
            label="Vendas via Ads"
            value={String(m.paid_sales_count)}
            sub={fmt(m.paid_revenue)}
            tooltip="Vendas com UTM identificado (tráfego pago)"
          />
          <DashboardMetricCard
            label="Vendas Orgânicas"
            value={String(m.organic_sales_count)}
            sub={fmt(m.organic_revenue)}
            tooltip="Vendas sem UTM (tráfego orgânico/direto)"
          />
          <DashboardMetricCard
            label="Reembolsos"
            value={fmt(m.total_refunded)}
            sub={`${m.count_refunded} pedidos`}
            tooltip="Valor total de reembolsos processados"
            dimmed={m.total_refunded === 0}
          />
          <DashboardMetricCard
            label="Chargeback"
            value={fmt(m.total_chargeback)}
            sub={`${m.count_chargedback} pedidos`}
            tooltip="Valor total de chargebacks"
            dimmed={m.total_chargeback === 0}
          />
        </div>
      </div>

      {/* ROW 3 — Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <DashboardWeekdayChart orders={weekdayOrders} fmt={fmt} />
        <DashboardApprovalCard
          items={[
            { label: "Cartão", rate: cardApprovalRate },
            { label: "Pix", rate: pixApprovalRate },
          ]}
        />
        <DashboardMetricCard
          label="Carrinhos Abandonados"
          value={String(m.abandoned_total)}
          sub={`${recoveryRate}% recuperados`}
          onClick={() => navigate("/admin/abandoned")}
          tooltip="Total de checkouts iniciados sem finalização"
        />
      </div>
    </div>
  );
};

export default Dashboard;
