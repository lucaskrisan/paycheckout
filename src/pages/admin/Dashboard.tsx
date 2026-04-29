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
import { Skeleton } from "@/components/ui/skeleton";

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

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
const SAO_PAULO_UTC_OFFSET_HOURS = 3;

type SaoPauloDateParts = { year: number; month: number; day: number };

const getSaoPauloDateParts = (date = new Date()): SaoPauloDateParts => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
};

const fromUtcDate = (date: Date): SaoPauloDateParts => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

const addDays = (date: SaoPauloDateParts, days: number): SaoPauloDateParts =>
  fromUtcDate(new Date(Date.UTC(date.year, date.month - 1, date.day + days)));

const firstDayOfMonth = (date: SaoPauloDateParts, monthOffset = 0): SaoPauloDateParts =>
  fromUtcDate(new Date(Date.UTC(date.year, date.month - 1 + monthOffset, 1)));

const startOfSaoPauloDayIso = (date: SaoPauloDateParts): string =>
  new Date(Date.UTC(date.year, date.month - 1, date.day, SAO_PAULO_UTC_OFFSET_HOURS, 0, 0, 0)).toISOString();

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const loadingRequestRef = useRef<number>(0);
  const [initialLoading, setInitialLoading] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("all");
  const [currency, setCurrency] = useState<Currency>("ALL");
  /** When currency=ALL, the chart still needs ONE currency to display.
   *  Defaults to dominant currency, user can toggle. */
  const [chartCurrency, setChartCurrency] = useState<"BRL" | "USD">("BRL");
  /** Holds chart data for the chartCurrency when in ALL mode (separate fetch). */
  const [chartOverride, setChartOverride] = useState<{ chart_hourly: any[]; chart_daily: any[] } | null>(null);

  // For DashboardWeekdayChart we still need raw orders for weekday grouping
  const [weekdayOrders, setWeekdayOrders] = useState<any[]>([]);

  const ownerProductIds = useMemo(() => products.map((p) => p.id), [products]);
  const liveVisitors = useCheckoutPresence("watch", undefined, ownerProductIds);

  const getDateRange = useCallback((p: Period): { from: string | null; to: string | null } => {
    const today = getSaoPauloDateParts();
    const tomorrow = addDays(today, 1);

    switch (p) {
      case "today": return { from: startOfSaoPauloDayIso(today), to: startOfSaoPauloDayIso(tomorrow) };
      case "yesterday": {
        const yesterday = addDays(today, -1);
        return { from: startOfSaoPauloDayIso(yesterday), to: startOfSaoPauloDayIso(today) };
      }
      case "7days": return { from: startOfSaoPauloDayIso(addDays(today, -7)), to: null };
      case "month": return { from: startOfSaoPauloDayIso(firstDayOfMonth(today)), to: null };
      case "lastMonth": {
        return {
          from: startOfSaoPauloDayIso(firstDayOfMonth(today, -1)),
          to: startOfSaoPauloDayIso(firstDayOfMonth(today)),
        };
      }
      case "total": return { from: null, to: null };
      default: return { from: null, to: null };
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;

    try {
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

      if (error) throw error;
      setMetrics(data || emptyMetrics);
    } catch (error) {
      console.error("[dashboard] RPC error:", error);
    }
  }, [user, period, selectedProductId, isSuperAdmin, getDateRange, currency]);

  /** When in ALL mode, fetch a chart-only snapshot for the chosen chartCurrency
   *  so the area chart never mixes currencies on the same axis. */
  const fetchChartOverride = useCallback(async () => {
    if (currency !== "ALL" || !user) {
      setChartOverride(null);
      return;
    }
    const { from, to } = getDateRange(period);
    const productId = selectedProductId === "all" ? null : selectedProductId;
    const { data, error } = await supabase.rpc("get_dashboard_metrics", {
      p_user_id: user.id,
      p_date_from: from,
      p_date_to: to,
      p_product_id: productId,
      p_is_super_admin: isSuperAdmin,
      p_currency: chartCurrency,
    });
    if (!error && data) {
      setChartOverride({
        chart_hourly: data.chart_hourly || [],
        chart_daily: data.chart_daily || [],
      });
    }
  }, [user, period, selectedProductId, isSuperAdmin, getDateRange, currency, chartCurrency]);

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
    // Filter by currency to avoid mixing BRL+USD amounts in the same chart axis
    if (currency !== "ALL") {
      query = (query as any).eq("products.currency", currency);
    }
    query = query.limit(5000);

    const { data } = await query;
    setWeekdayOrders(data || []);
  }, [user, period, selectedProductId, isSuperAdmin, getDateRange, currency]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    
    const requestId = ++loadingRequestRef.current;
    if (isRefresh) setRefreshing(true);

    try {
      // Fetch in parallel but don't block everything on a single failure
      const results = await Promise.allSettled([
        fetchMetrics(), 
        fetchProducts(), 
        fetchWeekdayOrders(), 
        fetchChartOverride()
      ]);
      
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn("[dashboard] Some data failed to load:", failed);
      }
    } catch (error) {
      console.error("[dashboard] loadData critical error:", error);
    } finally {
      if (requestId === loadingRequestRef.current) {
        if (isRefresh) setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, [fetchMetrics, fetchProducts, fetchWeekdayOrders, fetchChartOverride, user]);

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

  // Auto-refresh every 30s as a safety net in case realtime misses an event
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadDataRef.current(false), 30 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Realtime refresh — aggressive: 500ms debounce so new pending PIX appear almost instantly
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadDataRef.current(false), 500);
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
    // In ALL mode, use the override fetch (already filtered by chartCurrency)
    // so the chart shows ONLY one currency at a time — never mixed.
    const source = currency === "ALL" && chartOverride ? chartOverride : m;
    if (isHourly) {
      return (source.chart_hourly || []).map((h: any) => ({
        name: `${String(h.hour).padStart(2, "0")}:00`,
        total: Number(h.total),
      }));
    }
    return (source.chart_daily || []).map((d: any) => {
      const dt = new Date(d.date);
      return {
        name: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        total: Number(d.total),
      };
    });
  }, [m.chart_hourly, m.chart_daily, isHourly, currency, chartOverride]);

  const salesByState = m.sales_by_state || {};

  // Real currency formatter — never converts; respects whichever currency is selected.
  // When "ALL" is active, BRL is used as display default for the main number,
  // and the secondary currency is shown as a discreet sub-line on each card.
  const fmt = useCallback(
    (v: number, forceCurrency?: "BRL" | "USD") => {
      const c = forceCurrency ?? (currency === "ALL" ? "BRL" : currency);
      const locale = c === "USD" ? "en-US" : "pt-BR";
      return new Intl.NumberFormat(locale, { style: "currency", currency: c }).format(v || 0);
    },
    [currency]
  );

  const breakdown = m.by_currency || {};
  const brl = breakdown.BRL;
  const usd = breakdown.USD;
  const hasMultipleCurrencies = !!(brl?.approved_count && usd?.approved_count);
  const showAllMode = currency === "ALL" && hasMultipleCurrencies;

  // Detect dominant currency by approved order count (currency-agnostic, no exchange rate needed).
  const dominantCurrency: "BRL" | "USD" = useMemo(() => {
    if (!hasMultipleCurrencies || !brl || !usd) return "BRL";
    return Number(usd.approved_count || 0) > Number(brl.approved_count || 0) ? "USD" : "BRL";
  }, [hasMultipleCurrencies, brl?.approved_count, usd?.approved_count]);

  const secondaryCurrency: "BRL" | "USD" = dominantCurrency === "BRL" ? "USD" : "BRL";
  const primaryBreakdown = dominantCurrency === "BRL" ? brl : usd;
  const secondaryBreakdown = dominantCurrency === "BRL" ? usd : brl;

  // Helper: returns a discreet secondary line in the OTHER currency when in "ALL" mode.
  // Adds a leading colored dot (•) so users notice cross-currency activity at a glance.
  const subFor = useCallback(
    (field: keyof CurrencyBreakdown, prefix?: string) => {
      if (!showAllMode || !secondaryBreakdown) return undefined;
      const val = Number(secondaryBreakdown[field] || 0);
      if (!val) return undefined;
      const locale = secondaryCurrency === "USD" ? "en-US" : "pt-BR";
      const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: secondaryCurrency,
      }).format(val);
      return prefix ? `• ${prefix} ${formatted}` : `• + ${formatted}`;
    },
    [showAllMode, secondaryBreakdown, secondaryCurrency]
  );

  // Get primary KPI value: in ALL mode use the dominant-currency breakdown
  // so cards never mix currencies; in single-currency mode falls back to total.
  const pri = useCallback(
    (field: keyof CurrencyBreakdown, fallback: number) => {
      if (showAllMode && primaryBreakdown) return Number(primaryBreakdown[field] || 0);
      return fallback;
    },
    [showAllMode, primaryBreakdown]
  );

  // Format using the dominant currency in ALL mode, otherwise the selected one.
  const fmtPrimary = useCallback(
    (v: number) => {
      const c: "BRL" | "USD" = showAllMode ? dominantCurrency : (currency === "ALL" ? "BRL" : (currency as "BRL" | "USD"));
      const locale = c === "USD" ? "en-US" : "pt-BR";
      return new Intl.NumberFormat(locale, { style: "currency", currency: c }).format(v || 0);
    },
    [currency, showAllMode, dominantCurrency]
  );

  // Auto-pick chartCurrency to match dominant currency (user can still override).
  useEffect(() => {
    if (!showAllMode) return;
    setChartCurrency((prev) => (prev === dominantCurrency ? prev : dominantCurrency));
  }, [showAllMode, dominantCurrency]);

  // Dedicated formatter for the chart — respects the chartCurrency in ALL mode
  // and the global currency otherwise.
  const chartFmt = useCallback(
    (v: number) => {
      const c: "BRL" | "USD" = currency === "ALL" ? chartCurrency : (currency as "BRL" | "USD");
      const locale = c === "USD" ? "en-US" : "pt-BR";
      return new Intl.NumberFormat(locale, { style: "currency", currency: c }).format(v || 0);
    },
    [currency, chartCurrency]
  );
  const chartPrefix = (currency === "ALL" ? chartCurrency : currency) === "USD" ? "$" : "R$";

  if (initialLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`hero-${i}`} className="h-[120px] rounded-xl bg-card/70" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl bg-card/70" />
      </div>
    );
  }

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

      {/* ROW 1 — Hero revenue + compact stats. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardHeroCard
          label="Faturamento Total"
          value={pri("approved_amount", m.total_bruto)}
          fmt={fmtPrimary}
          sublabel={subFor("approved_amount", "Líquido")}
          variant="revenue"
          sparklineData={chartData.map((d) => d.total)}
        />
        <DashboardHeroCard
          label="Vendas Aprovadas"
          value={pri("approved_count", m.count_approved)}
          fmt={(v) => Math.floor(v).toString()}
          sublabel={subFor("approved_count", "Vendas")}
          variant="sales"
        />
        <DashboardHeroCard
          label="Ticket Médio"
          value={pri("avg_ticket", avgTicket)}
          fmt={fmtPrimary}
          sublabel={subFor("avg_ticket")}
          variant="ticket"
        />
        <DashboardHeroCard
          label="Visitas ao vivo"
          value={liveVisitors}
          fmt={(v) => Math.floor(v).toString()}
          variant="visitors"
          tooltip="Pessoas visualizando seus checkouts agora."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Main Chart */}
        <div className="lg:col-span-8">
          <DashboardChart
            data={chartData}
            period={period}
            currencyPrefix={chartPrefix}
            onRefresh={() => loadData(true)}
            isRefreshing={refreshing}
            allCurrenciesMode={currency === "ALL"}
            activeChartCurrency={chartCurrency}
            onToggleChartCurrency={() => setChartCurrency((c) => (c === "BRL" ? "USD" : "BRL"))}
            fmt={chartFmt}
          />
        </div>

        {/* Side Metrics */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <DashboardMetricCard
            label="Conversão de Cartão"
            value={`${cardApprovalRate.toFixed(1)}%`}
            sub={`${m.card_approved} de ${m.card_decided} tentativas`}
            accent
            tooltip="Taxa de aprovação real considerando apenas tentativas processadas pelo gateway."
          />
          <DashboardMetricCard
            label="Conversão de PIX"
            value={`${pixApprovalRate.toFixed(1)}%`}
            sub={`${m.pix_approved} de ${m.pix_decided} gerados`}
            tooltip="Relação entre PIX pagos e PIX gerados."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <DashboardMetricCard
          label="Pendente (PIX/Boleto)"
          value={fmtPrimary(pri("pending_amount", m.total_pendente))}
          sub={`${pri("pending_count", m.count_pending)} pedidos aguardando`}
          sub2={subFor("pending_amount")}
          dimmed={m.count_pending === 0}
        />
        <DashboardMetricCard
          label="Recuperação de Carrinho"
          value={`${recoveryRate}%`}
          sub={`${m.abandoned_recovered} recuperados de ${m.abandoned_total}`}
          tooltip="Percentual de checkouts abandonados que foram convertidos via automação."
        />
        <DashboardApprovalCard
          cardRate={cardApprovalRate}
          pixRate={pixApprovalRate}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4">
          <DashboardStateMap salesByState={salesByState} />
        </div>
        <div className="lg:col-span-8">
          <DashboardWeekdayChart orders={weekdayOrders} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
