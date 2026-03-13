import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, ShoppingCart, UserCheck, CreditCard, Zap, MousePointerClick, TrendingUp, Radio, Satellite } from "lucide-react";
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

const EVENT_CONFIG: Record<string, { label: string; color: string; glow: string; icon: any }> = {
  PageView: { label: "PageView", color: "#6366f1", glow: "shadow-indigo-500/30", icon: Eye },
  InitiateCheckout: { label: "InitiateCheckout", color: "#f59e0b", glow: "shadow-amber-500/30", icon: ShoppingCart },
  Lead: { label: "Lead", color: "#3b82f6", glow: "shadow-blue-500/30", icon: UserCheck },
  AddPaymentInfo: { label: "AddPaymentInfo", color: "#8b5cf6", glow: "shadow-violet-500/30", icon: CreditCard },
  AddToCart: { label: "AddToCart", color: "#ec4899", glow: "shadow-pink-500/30", icon: MousePointerClick },
  Purchase: { label: "Purchase", color: "#22c55e", glow: "shadow-emerald-500/30", icon: TrendingUp },
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

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    });
    return counts;
  }, [events]);

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

  const recentEvents = events.slice(0, 20);
  const orderedEventNames = ["PageView", "InitiateCheckout", "Lead", "AddPaymentInfo", "AddToCart", "Purchase"];
  const totalEvents = events.length;

  return (
    <div className="space-y-5">
      {/* ===== MISSION CONTROL HEADER ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-5">
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
        {/* Scanning line animation */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
          animate={{ y: [0, 200, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Satellite className="w-6 h-6 text-cyan-400" />
              <motion.div 
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Mission Control</h3>
              <p className="text-[11px] text-cyan-300/60 font-mono uppercase tracking-widest">Eventos em tempo real · {totalEvents} sinais capturados</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-[180px] bg-slate-800/80 border-slate-600/50 text-slate-200 text-xs h-8">
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
              <SelectTrigger className="w-[120px] bg-slate-800/80 border-slate-600/50 text-slate-200 text-xs h-8">
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
      </div>

      {/* ===== EVENT TELEMETRY CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {orderedEventNames.map((name, idx) => {
          const config = EVENT_CONFIG[name];
          const count = eventCounts[name] || 0;
          const Icon = config?.icon || Zap;
          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={`relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-700/40 p-4 shadow-lg ${config?.glow || ""}`}
            >
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: config?.color }} />
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-slate-800/80">
                  <Icon className="w-3.5 h-3.5" style={{ color: config?.color }} />
                </div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider truncate">{config?.label || name}</p>
              </div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{count}</p>
              {count > 0 && (
                <motion.div 
                  className="absolute bottom-2 right-3 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: config?.color }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ===== FUNNEL CONVERSION — "TRAJECTORY" ===== */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "PageView → Lead", value: funnel.pvToLead, color: "#3b82f6" },
          { label: "Lead → Purchase", value: funnel.leadToPurchase, color: "#8b5cf6" },
          { label: "Conversão Total", value: funnel.overall, color: "#22c55e" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-700/40 p-4 text-center"
          >
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: item.color }}>{item.value}%</p>
            {/* Bottom bar */}
            <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden">
              <motion.div 
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(parseFloat(item.value), 100)}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===== RADAR CHART + LIVE TERMINAL ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart — "Signal Analysis" */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-700/40 p-5">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-cyan-400" />
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Análise de sinais · {period === "7d" ? "diário" : "por hora"}</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#334155" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#e2e8f0",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.count > 0 ? "#22d3ee" : "#1e293b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Terminal */}
        <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-700/40">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-700/50">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">Feed ao vivo</p>
            <motion.div 
              className="ml-auto w-2 h-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>

          {/* Terminal body */}
          <div className="p-3 space-y-0.5 max-h-[230px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {recentEvents.length === 0 ? (
              <p className="text-[11px] text-slate-600 font-mono text-center py-8">
                {">"} aguardando sinais...
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {recentEvents.map((e, idx) => {
                  const config = EVENT_CONFIG[e.event_name];
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2 text-[11px] font-mono py-1 px-1 rounded hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="text-slate-600 w-[52px] shrink-0">
                        {format(new Date(e.created_at), "HH:mm:ss")}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: config?.color || "#475569", boxShadow: `0 0 6px ${config?.color || "#475569"}` }}
                      />
                      <span className="font-medium" style={{ color: config?.color || "#94a3b8" }}>
                        {e.event_name}
                      </span>
                      <span className="text-slate-600 text-[9px] border border-slate-700 rounded px-1 py-0">
                        {e.source}
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
