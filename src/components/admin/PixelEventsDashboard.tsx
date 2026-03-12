import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Eye, ShoppingCart, UserCheck, CreditCard, Zap, MousePointerClick, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subHours, startOfHour } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PixelEvent {
  id: string;
  product_id: string;
  event_name: string;
  source: string;
  created_at: string;
}

interface Props {
  products: { id: string; name: string }[];
}

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PageView: { label: "PageView", color: "#6366f1", icon: Eye },
  InitiateCheckout: { label: "InitiateCheckout", color: "#f59e0b", icon: ShoppingCart },
  Lead: { label: "Lead", color: "#3b82f6", icon: UserCheck },
  AddPaymentInfo: { label: "AddPaymentInfo", color: "#8b5cf6", icon: CreditCard },
  AddToCart: { label: "AddToCart", color: "#ec4899", icon: MousePointerClick },
  Purchase: { label: "Purchase", color: "#22c55e", icon: TrendingUp },
};

const PixelEventsDashboard = ({ products }: Props) => {
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [filterProduct, setFilterProduct] = useState("all");
  const [period, setPeriod] = useState("24h");

  const loadEvents = async () => {
    const hoursBack = period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;
    const since = subHours(new Date(), hoursBack).toISOString();

    let query = supabase
      .from("pixel_events" as any)
      .select("id, product_id, event_name, source, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (filterProduct !== "all") {
      query = query.eq("product_id", filterProduct);
    }

    const { data } = await query;
    setEvents((data as any) || []);
  };

  useEffect(() => {
    loadEvents();
  }, [filterProduct, period]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("pixel-events-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pixel_events" },
        (payload) => {
          const newEvent = payload.new as PixelEvent;
          if (filterProduct !== "all" && newEvent.product_id !== filterProduct) return;
          setEvents((prev) => [newEvent, ...prev].slice(0, 1000));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filterProduct]);

  // Aggregate counts by event name
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Hourly chart data
  const chartData = useMemo(() => {
    const hoursBack = period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;
    const buckets = period === "7d" ? 7 : Math.min(hoursBack, 24);
    const now = new Date();
    const data: { label: string; count: number }[] = [];

    if (period === "7d") {
      for (let i = buckets - 1; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const count = events.filter((e) => {
          const d = new Date(e.created_at);
          return d >= dayStart && d < dayEnd;
        }).length;
        data.push({ label: format(dayStart, "dd/MM", { locale: ptBR }), count });
      }
    } else {
      for (let i = buckets - 1; i >= 0; i--) {
        const hourStart = startOfHour(subHours(now, i));
        const hourEnd = startOfHour(subHours(now, i - 1));
        const count = events.filter((e) => {
          const d = new Date(e.created_at);
          return d >= hourStart && d < hourEnd;
        }).length;
        data.push({ label: format(hourStart, "HH:mm"), count });
      }
    }
    return data;
  }, [events, period]);

  // Funnel conversion rates
  const funnel = useMemo(() => {
    const pv = eventCounts["PageView"] || 0;
    const ic = eventCounts["InitiateCheckout"] || 0;
    const lead = eventCounts["Lead"] || 0;
    const purchase = eventCounts["Purchase"] || 0;
    return {
      pvToLead: pv > 0 ? ((lead / pv) * 100).toFixed(1) : "0",
      leadToPurchase: lead > 0 ? ((purchase / lead) * 100).toFixed(1) : "0",
      overall: pv > 0 ? ((purchase / pv) * 100).toFixed(1) : "0",
    };
  }, [eventCounts]);

  // Recent events for live feed
  const recentEvents = events.slice(0, 15);

  const orderedEventNames = ["PageView", "InitiateCheckout", "Lead", "AddPaymentInfo", "AddToCart", "Purchase"];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Eventos em Tempo Real</h3>
        </div>
        <div className="flex-1" />
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="Todos os produtos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Última hora</SelectItem>
            <SelectItem value="6h">6 horas</SelectItem>
            <SelectItem value="24h">24 horas</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event count cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {orderedEventNames.map((name) => {
          const config = EVENT_CONFIG[name];
          const count = eventCounts[name] || 0;
          const Icon = config?.icon || Zap;
          return (
            <Card key={name} className="border border-border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color: config?.color }} />
                  <p className="text-[11px] text-muted-foreground font-medium truncate">{config?.label || name}</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Funnel conversion */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">PageView → Lead</p>
            <p className="text-xl font-bold text-foreground">{funnel.pvToLead}%</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Lead → Purchase</p>
            <p className="text-xl font-bold text-foreground">{funnel.leadToPurchase}%</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Conversão Total</p>
            <p className="text-xl font-bold text-primary">{funnel.overall}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Live Feed side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Eventos por {period === "7d" ? "dia" : "hora"}</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Live feed */}
        <Card className="border border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Feed ao vivo</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum evento registrado ainda</p>
              ) : (
                recentEvents.map((e) => {
                  const config = EVENT_CONFIG[e.event_name];
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config?.color || "#888" }} />
                      <span className="font-medium text-foreground">{e.event_name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {e.source}
                      </Badge>
                      <span className="text-muted-foreground ml-auto whitespace-nowrap">
                        {format(new Date(e.created_at), "HH:mm:ss")}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PixelEventsDashboard;
