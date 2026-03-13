import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, ShoppingCart, UserCheck, CreditCard, Zap, MousePointerClick, TrendingUp, Radio } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subHours, startOfHour } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

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
  PageView: { label: "PageView", color: "#818cf8", icon: Eye },
  InitiateCheckout: { label: "Checkout", color: "#fbbf24", icon: ShoppingCart },
  Lead: { label: "Lead", color: "#60a5fa", icon: UserCheck },
  AddPaymentInfo: { label: "Payment", color: "#a78bfa", icon: CreditCard },
  AddToCart: { label: "Add Cart", color: "#f472b6", icon: MousePointerClick },
  Purchase: { label: "Purchase", color: "#34d399", icon: TrendingUp },
};

const PixelEventsDashboard = ({ products }: Props) => {
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [filterProduct, setFilterProduct] = useState("all");
  const [period, setPeriod] = useState("24h");

  // --- Data loading (unchanged logic) ---
  const loadEvents = async () => {
    const hoursBack = period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;
    const since = subHours(new Date(), hoursBack).toISOString();
    let query = supabase
      .from("pixel_events" as any)
      .select("id, product_id, event_name, source, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (filterProduct !== "all") query = query.eq("product_id", filterProduct);
    const { data } = await query;
    setEvents((data as any) || []);
  };

  useEffect(() => { loadEvents(); }, [filterProduct, period]);

  useEffect(() => {
    const channel = supabase
      .channel("pixel-events-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pixel_events" }, (payload) => {
        const ne = payload.new as PixelEvent;
        if (filterProduct !== "all" && ne.product_id !== filterProduct) return;
        setEvents((prev) => [ne, ...prev].slice(0, 1000));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterProduct]);

  // --- Computed data (unchanged logic) ---
  const eventCounts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach((e) => { c[e.event_name] = (c[e.event_name] || 0) + 1; });
    return c;
  }, [events]);

  const chartData = useMemo(() => {
    const hoursBack = period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;
    const buckets = period === "7d" ? 7 : Math.min(hoursBack, 24);
    const now = new Date();
    const data: { label: string; count: number }[] = [];
    if (period === "7d") {
      for (let i = buckets - 1; i >= 0; i--) {
        const ds = new Date(now); ds.setDate(ds.getDate() - i); ds.setHours(0, 0, 0, 0);
        const de = new Date(ds); de.setDate(de.getDate() + 1);
        data.push({ label: format(ds, "dd/MM", { locale: ptBR }), count: events.filter((e) => { const d = new Date(e.created_at); return d >= ds && d < de; }).length });
      }
    } else {
      for (let i = buckets - 1; i >= 0; i--) {
        const hs = startOfHour(subHours(now, i));
        const he = startOfHour(subHours(now, i - 1));
        data.push({ label: format(hs, "HH:mm"), count: events.filter((e) => { const d = new Date(e.created_at); return d >= hs && d < he; }).length });
      }
    }
    return data;
  }, [events, period]);

  const funnel = useMemo(() => {
    const pv = eventCounts["PageView"] || 0;
    const lead = eventCounts["Lead"] || 0;
    const purchase = eventCounts["Purchase"] || 0;
    return {
      pvToLead: pv > 0 ? ((lead / pv) * 100).toFixed(1) : "0.0",
      leadToPurchase: lead > 0 ? ((purchase / lead) * 100).toFixed(1) : "0.0",
      overall: pv > 0 ? ((purchase / pv) * 100).toFixed(1) : "0.0",
    };
  }, [eventCounts]);

  const recentEvents = events.slice(0, 50);
  const orderedEventNames = ["PageView", "InitiateCheckout", "Lead", "AddPaymentInfo", "AddToCart", "Purchase"];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="w-[18px] h-[18px] text-emerald-400" />
            <motion.div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Eventos em Tempo Real</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="w-[170px] bg-slate-800/60 border-slate-700/50 text-slate-300 text-xs h-8">
              <SelectValue placeholder="Todos os produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[110px] bg-slate-800/60 border-slate-700/50 text-slate-300 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hora</SelectItem>
              <SelectItem value="6h">6 horas</SelectItem>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Event counters ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {orderedEventNames.map((name) => {
          const cfg = EVENT_CONFIG[name];
          const count = eventCounts[name] || 0;
          const Icon = cfg?.icon || Zap;
          return (
            <div key={name} className="rounded-lg bg-slate-800/50 border border-slate-700/30 px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3 h-3" style={{ color: cfg?.color }} />
                <span className="text-[10px] text-slate-500 font-medium truncate">{cfg?.label}</span>
              </div>
              <span className="text-lg font-bold text-slate-100 font-mono tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>

      {/* ── Funnel ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "PV → Lead", value: funnel.pvToLead, color: "#60a5fa" },
          { label: "Lead → Purchase", value: funnel.leadToPurchase, color: "#a78bfa" },
          { label: "Conversão geral", value: funnel.overall, color: "#34d399" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-800/50 border border-slate-700/30 px-3 py-3 text-center">
            <p className="text-[10px] text-slate-500 font-medium mb-1">{item.label}</p>
            <p className="text-lg font-bold font-mono tabular-nums" style={{ color: item.color }}>{item.value}%</p>
            <div className="mt-2 h-[3px] rounded-full bg-slate-700/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(parseFloat(item.value), 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Chart */}
        <div className="lg:col-span-3 rounded-lg bg-slate-800/50 border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <p className="text-[11px] text-slate-500 font-medium">Sinais · {period === "7d" ? "diário" : "por hora"}</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#475569' }} stroke="#334155" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#475569' }} stroke="#334155" tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }}
                  labelStyle={{ color: "#94a3b8", fontSize: 10 }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.count > 0 ? "#22d3ee" : "#1e293b"} fillOpacity={entry.count > 0 ? 0.7 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-2 rounded-lg bg-slate-900/80 border border-slate-700/30 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/30">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">FEED AO VIVO</p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[240px] px-1 py-1">
            {recentEvents.length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-10 font-mono">aguardando sinais...</p>
            ) : (
              <AnimatePresence mode="popLayout">
                {recentEvents.map((e) => {
                  const cfg = EVENT_CONFIG[e.event_name];
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 text-[11px] font-mono py-[5px] px-2 rounded hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="text-slate-600 w-[48px] shrink-0 tabular-nums">
                        {format(new Date(e.created_at), "HH:mm:ss")}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: cfg?.color || "#475569" }}
                      />
                      <span className="font-medium truncate" style={{ color: cfg?.color || "#94a3b8" }}>
                        {e.event_name}
                      </span>
                      <span className="text-[9px] text-slate-600 ml-auto shrink-0">
                        {e.source === "server" ? "☁" : "🖥" }
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelEventsDashboard;
