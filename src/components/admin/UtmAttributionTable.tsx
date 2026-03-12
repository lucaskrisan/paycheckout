import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
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
      if (existing) {
        existing.count += 1;
        existing.revenue += Number(o.amount) || 0;
      } else {
        map.set(key, { source, campaign, medium, count: 1, revenue: Number(o.amount) || 0 });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-semibold text-foreground text-sm">Atribuição de Vendas por UTM</h2>
          <p className="text-xs text-muted-foreground">
            {totalOrders} vendas aprovadas · R$ {totalRevenue.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma venda com UTM registrada ainda. Os dados aparecerão aqui quando as primeiras vendas com parâmetros UTM forem processadas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fonte</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Campanha</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Conjunto</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receita</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">% Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => {
                const pct = totalRevenue > 0 ? ((r.revenue / totalRevenue) * 100).toFixed(1) : "0";
                return (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {r.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs max-w-[200px] truncate">
                      {r.campaign}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[150px] truncate">
                      {r.medium}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{r.count}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      R$ {r.revenue.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
