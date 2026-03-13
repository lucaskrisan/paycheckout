import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Loader2 } from "lucide-react";

interface UtmRow {
  source: string;
  campaign: string;
  medium: string;
  count: number;
  revenue: number;
}

export default function UtmAttributionTable() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("amount, status, metadata")
        .eq("user_id", user.id)
        .in("status", ["paid", "approved", "confirmed"]);
      setOrders(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const rows = useMemo(() => {
    const map = new Map<string, UtmRow>();
    orders.forEach((o) => {
      const meta = (o.metadata || {}) as Record<string, any>;
      const source = meta.utm_source || "(direto)";
      const campaign = meta.utm_campaign || "(sem campanha)";
      const medium = meta.utm_medium || "(sem medium)";
      const key = `${source}|||${campaign}|||${medium}`;
      const existing = map.get(key);
      if (existing) { existing.count += 1; existing.revenue += Number(o.amount) || 0; }
      else { map.set(key, { source, campaign, medium, count: 1, revenue: Number(o.amount) || 0 }); }
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2.5">
        <BarChart3 className="w-4 h-4 text-indigo-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Atribuição de Vendas por UTM</h2>
          <p className="text-[10px] text-slate-500">
            {totalOrders} vendas aprovadas · R$ {totalRevenue.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-xs text-slate-500">
            Nenhuma venda com UTM registrada ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Fonte</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Campanha</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Conjunto</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Vendas</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Receita</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/20">
              {rows.map((r, i) => {
                const pct = totalRevenue > 0 ? ((r.revenue / totalRevenue) * 100).toFixed(1) : "0";
                return (
                  <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {r.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 font-mono text-[10px] max-w-[200px] truncate">{r.campaign}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-[10px] max-w-[150px] truncate">{r.medium}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-300 tabular-nums">{r.count}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-400 tabular-nums">
                      R$ {r.revenue.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
