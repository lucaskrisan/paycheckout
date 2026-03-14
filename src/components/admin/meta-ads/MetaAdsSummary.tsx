import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Info, TrendingUp, Trophy, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatNumber } from "./MetaInsightsHelpers";

interface Props {
  spend: number;
  conversionValue: number;
  results: number;
  roas: number;
}


function extractPurchases(insights: any): number {
  if (!insights?.actions) return 0;
  const p = insights.actions.find((a: any) =>
    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
  );
  return p ? parseInt(p.value, 10) : 0;
}

function extractRevenue(insights: any): number {
  if (!insights?.action_values) return 0;
  const p = insights.action_values.find((a: any) =>
    a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase"
  );
  return p ? parseFloat(p.value) : 0;
}

export function MetaAdsSummary({ spend, conversionValue, results, roas }: Props) {
  const [orderMetrics, setOrderMetrics] = useState({
    pendingAmount: 0,
    chargebackAmount: 0,
    refundedAmount: 0,
  });
  const [lifetime, setLifetime] = useState<{
    spend: number; revenue: number; purchases: number; roas: number;
    spend7d: number; revenue7d: number; purchases7d: number; roas7d: number;
    campaigns: Array<{ name: string; account: string; purchases: number; revenue: number; spend: number; roas: number; dateRange: string }>;
  } | null>(null);
  const [loadingLifetime, setLoadingLifetime] = useState(false);

  const fetchOrderMetrics = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: orders } = await supabase
      .from("orders")
      .select("status, amount")
      .gte("created_at", today.toISOString());

    if (!orders) return;

    const pending = orders.filter((o) => o.status === "pending" || o.status === "waiting_payment").reduce((s, o) => s + Number(o.amount), 0);
    const chargeback = orders.filter((o) => o.status === "chargeback").reduce((s, o) => s + Number(o.amount), 0);
    const refunded = orders.filter((o) => o.status === "refunded").reduce((s, o) => s + Number(o.amount), 0);

    setOrderMetrics({ pendingAmount: pending, chargebackAmount: chargeback, refundedAmount: refunded });
  }, []);

  const fetchLifetime = useCallback(async () => {
    setLoadingLifetime(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-alerts", {
        body: { action: "full_report" },
      });
      if (error || !data?.campaigns) return;

      let totalSpend = 0, totalRevenue = 0, totalPurchases = 0;
      let totalSpend7d = 0, totalRevenue7d = 0, totalPurchases7d = 0;
      const campaignList: any[] = [];

      for (const c of data.campaigns) {
        const lt = c.insights_lifetime;
        const w = c.insights_7d;
        if (lt) {
          const s = parseFloat(lt.spend || "0");
          const r = extractRevenue(lt);
          const p = extractPurchases(lt);
          totalSpend += s;
          totalRevenue += r;
          totalPurchases += p;
          campaignList.push({
            name: c.name,
            account: c.account_name,
            purchases: p,
            revenue: r,
            spend: s,
            roas: s > 0 ? r / s : 0,
            dateRange: `${lt.date_start} → ${lt.date_stop}`,
          });
        }
        if (w) {
          totalSpend7d += parseFloat(w.spend || "0");
          totalRevenue7d += extractRevenue(w);
          totalPurchases7d += extractPurchases(w);
        }
      }

      setLifetime({
        spend: totalSpend,
        revenue: totalRevenue,
        purchases: totalPurchases,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        spend7d: totalSpend7d,
        revenue7d: totalRevenue7d,
        purchases7d: totalPurchases7d,
        roas7d: totalSpend7d > 0 ? totalRevenue7d / totalSpend7d : 0,
        campaigns: campaignList.sort((a, b) => b.purchases - a.purchases),
      });
    } catch (err) {
      console.error("Lifetime fetch error:", err);
    } finally {
      setLoadingLifetime(false);
    }
  }, []);

  useEffect(() => {
    fetchOrderMetrics();
    fetchLifetime();
    const ch = supabase
      .channel("summary-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrderMetrics())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOrderMetrics, fetchLifetime]);

  const lucro = conversionValue - spend;
  const roi = spend > 0 ? lucro / spend : 0;
  const margem = conversionValue > 0 ? (lucro / conversionValue) * 100 : 0;
  const arpu = results > 0 ? conversionValue / results : 0;

  const isNeg = (v: number) => v < 0;

  return (
    <div className="space-y-4">
      {/* Current period cards */}
      <div className="grid grid-cols-12 gap-3">
        <MetricCard label="Faturamento Líquido" value={formatCurrency(conversionValue)} className="col-span-6 md:col-span-3" />
        <MetricCard label="Gastos com anúncios" value={formatCurrency(spend)} className="col-span-6 md:col-span-3" />
        <MetricCard label="ROAS" value={roas > 0 ? roas.toFixed(2) : "0.00"} valueColor={roas >= 1 ? "text-emerald-400" : "text-red-400"} className="col-span-6 md:col-span-3" />
        <MetricCard label="Lucro" value={formatCurrency(lucro)} valueColor={isNeg(lucro) ? "text-red-400" : "text-emerald-400"} className="col-span-6 md:col-span-3" />

        <MetricCard label="ROI" value={roi !== 0 ? roi.toFixed(2) : "0.00"} valueColor={isNeg(roi) ? "text-red-400" : "text-emerald-400"} className="col-span-4 md:col-span-2" />
        <MetricCard label="ARPU" value={formatCurrency(arpu)} className="col-span-4 md:col-span-2" />
        <MetricCard label="Margem" value={`${margem.toFixed(1).replace(".", ",")}%`} valueColor={isNeg(margem) ? "text-red-400" : "text-emerald-400"} className="col-span-4 md:col-span-2" />
        <MetricCard label="Vendas Pendentes" value={formatCurrency(orderMetrics.pendingAmount)} className="col-span-4 md:col-span-2" />
        <MetricCard label="Vendas chargeback" value={formatCurrency(orderMetrics.chargebackAmount)} className="col-span-4 md:col-span-2" />
        <MetricCard label="Vendas Reembolsadas" value={formatCurrency(orderMetrics.refundedAmount)} className="col-span-4 md:col-span-2" />
      </div>

      {/* Lifetime Section */}
      {lifetime && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Dados Lifetime (Período Máximo)</h3>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <MetricCard
              label="Total de Vendas"
              value={formatNumber(lifetime.purchases)}
              valueColor="text-amber-400"
              className="col-span-6 md:col-span-3"
              icon={<Trophy className="w-3 h-3 text-amber-400" />}
            />
            <MetricCard
              label="Receita Total"
              value={formatCurrency(lifetime.revenue)}
              valueColor="text-emerald-400"
              className="col-span-6 md:col-span-3"
            />
            <MetricCard
              label="Gasto Total"
              value={formatCurrency(lifetime.spend)}
              className="col-span-6 md:col-span-3"
            />
            <MetricCard
              label="ROAS Lifetime"
              value={lifetime.roas > 0 ? lifetime.roas.toFixed(2) : "0.00"}
              valueColor={lifetime.roas >= 1 ? "text-emerald-400" : "text-red-400"}
              className="col-span-6 md:col-span-3"
            />

            <MetricCard
              label="Lucro Lifetime"
              value={formatCurrency(lifetime.revenue - lifetime.spend)}
              valueColor={lifetime.revenue - lifetime.spend >= 0 ? "text-emerald-400" : "text-red-400"}
              className="col-span-6 md:col-span-3"
            />
            <MetricCard
              label="CPA Médio"
              value={lifetime.purchases > 0 ? formatCurrency(lifetime.spend / lifetime.purchases) : "—"}
              className="col-span-6 md:col-span-3"
            />
            <MetricCard
              label="Ticket Médio"
              value={lifetime.purchases > 0 ? formatCurrency(lifetime.revenue / lifetime.purchases) : "—"}
              className="col-span-6 md:col-span-3"
            />
            <MetricCard
              label="Vendas 7d"
              value={formatNumber(lifetime.purchases7d)}
              subValue={`ROAS ${lifetime.roas7d.toFixed(2)}`}
              subColor={lifetime.roas7d >= 1 ? "text-emerald-400" : "text-red-400"}
              className="col-span-6 md:col-span-3"
            />
          </div>

          {/* Campaign breakdown */}
          {lifetime.campaigns.length > 0 && (
            <Card className="bg-[hsl(222,30%,14%)] border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Breakdown por Campanha</span>
                </div>
                <div className="space-y-2">
                  {lifetime.campaigns.map((c, i) => {
                    const lucroC = c.revenue - c.spend;
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(222,25%,12%)] border border-slate-700/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{c.account}</span>
                            <span className="text-[10px] text-slate-600">•</span>
                            <Calendar className="w-3 h-3 text-slate-600" />
                            <span className="text-[10px] text-slate-500">{c.dateRange}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">Vendas</p>
                            <p className="text-sm font-bold text-amber-400">{formatNumber(c.purchases)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">Receita</p>
                            <p className="text-sm font-semibold text-slate-200">{formatCurrency(c.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">Gasto</p>
                            <p className="text-sm text-slate-400">{formatCurrency(c.spend)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">Lucro</p>
                            <p className={`text-sm font-semibold ${lucroC >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {formatCurrency(lucroC)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">ROAS</p>
                            <p className={`text-sm font-bold ${c.roas >= 1 ? "text-emerald-400" : "text-red-400"}`}>
                              {c.roas.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {loadingLifetime && !lifetime && (
        <div className="text-center py-4 text-slate-500 text-sm">Carregando dados lifetime...</div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueColor,
  className = "",
  icon,
  subValue,
  subColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  className?: string;
  icon?: React.ReactNode;
  subValue?: string;
  subColor?: string;
}) {
  return (
    <Card className={`bg-[hsl(222,30%,14%)] border-slate-700/50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
          {icon || (
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-slate-600" />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{label}</p></TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className={`text-xl font-bold ${valueColor || "text-slate-100"}`}>{value}</p>
        {subValue && (
          <p className={`text-xs mt-0.5 ${subColor || "text-slate-500"}`}>{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}
