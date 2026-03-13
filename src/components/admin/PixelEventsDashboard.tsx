import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, ShoppingCart, UserCheck, CreditCard, Zap, MousePointerClick, TrendingUp, Radio, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subHours, startOfHour } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import CustomerJourneyFeed from "./CustomerJourneyFeed";

interface PixelEvent {
  id: string;
  product_id: string;
  event_name: string;
  source: string;
  created_at: string;
  customer_name: string | null;
  visitor_id: string | null;
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
  const [feedView, setFeedView] = useState<"feed" | "journeys">("feed");

  // --- Data loading (unchanged logic) ---
  const loadEvents = async () => {
    const hoursBack = period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;
    const since = subHours(new Date(), hoursBack).toISOString();
    let query = supabase
      .from("pixel_events" as any)
      .select("id, product_id, event_name, source, created_at, customer_name, visitor_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (filterProduct !== "all") query = query.eq("product_id", filterProduct);
    const { data } = await query;
    // Filter out simulated test events
    const real = ((data as any) || []).filter((e: PixelEvent) => !e.visitor_id?.startsWith("sim_"));
    setEvents(real);
  };

  useEffect(() => { loadEvents(); }, [filterProduct, period]);

  useEffect(() => {
    const channel = supabase
      .channel("pixel-events-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pixel_events" }, (payload) => {
        const ne = payload.new as PixelEvent;
        if (filterProduct !== "all" && ne.product_id !== filterProduct) return;
        if (ne.visitor_id?.startsWith("sim_")) return; // Ignore test events
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

      {/* ── Chart ── */}
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <p className="text-xs text-slate-400 font-medium">Sinais · {period === "7d" ? "diário" : "por hora"}</p>
        </div>
        <div className="h-[220px]">
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

      {/* ── Feed ao Vivo — Full Width ── */}
      <div className="rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/20 flex flex-col overflow-hidden">
        {/* Feed Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/20 bg-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute w-5 h-5 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative z-10" />
            </div>
            {/* View Toggle */}
            <div className="flex items-center bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/40">
              <button
                onClick={() => setFeedView("feed")}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  feedView === "feed"
                    ? "bg-slate-700/80 text-slate-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-400"
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setFeedView("journeys")}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  feedView === "journeys"
                    ? "bg-slate-700/80 text-slate-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-400"
                }`}
              >
                Jornadas
              </button>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
              {recentEvents.length} eventos
            </span>
          </div>
          {feedView === "feed" && (
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-cyan-500/60" /> Browser
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-violet-500/60" /> Server
              </span>
            </div>
          )}
        </div>

        {/* Feed Body */}
        <div className="overflow-y-auto max-h-[420px] min-h-[280px]">
          {feedView === "journeys" ? (
            <CustomerJourneyFeed events={events} products={products} />
          ) : recentEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Radio className="w-8 h-8 text-slate-700" />
              </motion.div>
              <p className="text-sm text-slate-600 font-medium">Aguardando sinais...</p>
              <p className="text-[11px] text-slate-700">Os eventos aparecerão aqui em tempo real</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {recentEvents.map((e, index) => {
                const cfg = EVENT_CONFIG[e.event_name];
                const Icon = cfg?.icon || Zap;
                const isServer = e.source === "server";
                const productName = products.find(p => p.id === e.product_id)?.name;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`
                      group flex items-center gap-3 px-5 py-3 
                      border-b border-slate-800/40 last:border-b-0
                      hover:bg-slate-800/30 transition-all duration-200
                      ${index === 0 ? "bg-slate-800/20" : ""}
                    `}
                  >
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums w-[58px] shrink-0">
                      {format(new Date(e.created_at), "HH:mm:ss")}
                    </span>
                    <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                      <div
                        className="absolute inset-0 rounded-lg opacity-20 group-hover:opacity-30 transition-opacity"
                        style={{ backgroundColor: cfg?.color || "#475569" }}
                      />
                      <Icon className="w-3.5 h-3.5 relative z-10" style={{ color: cfg?.color || "#94a3b8" }} />
                    </div>
                    <span
                      className="text-[13px] font-semibold min-w-[120px] shrink-0"
                      style={{ color: cfg?.color || "#94a3b8" }}
                    >
                      {cfg?.label || e.event_name}
                    </span>
                    {e.customer_name && (
                      <span className="text-[12px] text-slate-300 font-medium truncate max-w-[180px]">
                        {e.customer_name.split(' ')[0]}
                      </span>
                    )}
                    {productName && (
                      <span className="text-[11px] text-slate-500 truncate max-w-[160px] hidden sm:inline">
                        {productName}
                      </span>
                    )}
                    <span className="flex-1" />
                    <span
                      className={`
                        text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0
                        ${isServer
                          ? "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                          : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                        }
                      `}
                    >
                      {isServer ? "CAPI" : "PIXEL"}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default PixelEventsDashboard;
