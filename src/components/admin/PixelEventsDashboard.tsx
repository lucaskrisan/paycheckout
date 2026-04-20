// @ts-nocheck
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Radio } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subHours, startOfHour, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import CustomerJourneyFeed from "./CustomerJourneyFeed";
import NinaTrackingHeader from "./tracking/NinaTrackingHeader";
import HeroKPIStrip from "./tracking/HeroKPIStrip";
import SmartAlertsPanel from "./tracking/SmartAlertsPanel";
import EventFeedCard from "./tracking/EventFeedCard";
import NinaWatermark from "./tracking/NinaWatermark";
import { ninaToast, ninaPurchaseToast } from "./tracking/NinaToast";
import { playNotificationSound } from "@/lib/notificationSounds";
import { useGeo } from "@/hooks/useGeo";
import ninaAvatar from "@/assets/nina-avatar.png";

interface PixelEvent {
  id: string;
  product_id: string;
  event_name: string;
  source: string;
  created_at: string;
  customer_name: string | null;
  visitor_id: string | null;
  event_id: string | null;
}

interface GroupedEvent {
  event_id: string;
  event_name: string;
  product_id: string;
  customer_name: string | null;
  created_at: string;
  sources: string[];
  ids: string[];
}

interface Props {
  products: { id: string; name: string }[];
  userId?: string;
}

const ORDERED_EVENT_NAMES = [
  "PageView", "ViewContent", "InitiateCheckout", "Lead", "AddPaymentInfo", "AddToCart", "Purchase",
];

const NINA_WELCOME_KEY = "nina-tracking-welcome-shown";

const PixelEventsDashboard = ({ products, userId }: Props) => {
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [filterProduct, setFilterProduct] = useState("all");
  const [period, setPeriod] = useState("24h");
  const [feedView, setFeedView] = useState<"feed" | "journeys">("feed");
  const [eventsLastHour, setEventsLastHour] = useState(0);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const welcomeShownRef = useRef(false);
  const geo = useGeo();

  const ownerProductIds = useMemo(() => products.map((p) => p.id), [products]);

  const getHoursBack = () =>
    period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;

  const loadEvents = async () => {
    const since = subHours(new Date(), getHoursBack()).toISOString();

    let feedQuery = supabase
      .from("pixel_events")
      .select("id, product_id, event_name, source, created_at, customer_name, visitor_id, event_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (userId) feedQuery = feedQuery.eq("user_id", userId);
    if (filterProduct !== "all") feedQuery = feedQuery.eq("product_id", filterProduct);
    const { data: feedData } = await feedQuery;
    const real = (feedData || []).filter((e) => !e.visitor_id?.startsWith("sim_"));
    setEvents(real as PixelEvent[]);

    const counts: Record<string, number> = {};
    await Promise.all(
      ORDERED_EVENT_NAMES.map(async (eventName) => {
        let q = supabase
          .from("pixel_events")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("event_name", eventName);
        if (userId) q = q.eq("user_id", userId);
        if (filterProduct !== "all") q = q.eq("product_id", filterProduct);
        const { count } = await q;
        counts[eventName] = count || 0;
      }),
    );
    setEventCounts(counts);

    // Last hour count for footer
    const lastHour = subHours(new Date(), 1).toISOString();
    let lhQ = supabase
      .from("pixel_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastHour);
    if (userId) lhQ = lhQ.eq("user_id", userId);
    if (filterProduct !== "all") lhQ = lhQ.eq("product_id", filterProduct);
    const { count: lhCount } = await lhQ;
    setEventsLastHour(lhCount || 0);
  };

  useEffect(() => {
    loadEvents();
  }, [filterProduct, period]);

  // Welcome toast (uma vez por dia)
  useEffect(() => {
    if (welcomeShownRef.current) return;
    if (!userId) return;
    const todayKey = `${NINA_WELCOME_KEY}-${userId}-${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(todayKey)) return;

    const showWelcome = async () => {
      const todayStart = startOfDay(new Date()).toISOString();
      let q = supabase
        .from("pixel_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart);
      if (userId) q = q.eq("user_id", userId);
      const { count } = await q;
      const n = count || 0;
      welcomeShownRef.current = true;
      sessionStorage.setItem(todayKey, "1");
      setTimeout(() => {
        ninaToast(
          n > 0
            ? `Bem-vindo de volta. Hoje já registrei ${n} eventos pra você.`
            : "Bem-vindo de volta. Estou monitorando seu tracking em tempo real.",
        );
      }, 800);
    };
    showWelcome();
  }, [userId]);

  // Realtime
  useEffect(() => {
    const since = subHours(new Date(), getHoursBack()).getTime();

    const channel = supabase
      .channel(`pixel-events-realtime-${filterProduct}-${period}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pixel_events" }, (payload) => {
        const ne = payload.new as any;
        if (userId && ne.user_id !== userId) return;
        if (filterProduct !== "all" && ne.product_id !== filterProduct) return;
        if (ne.visitor_id?.startsWith("sim_")) return;
        if (new Date(ne.created_at).getTime() < since) return;

        setEvents((prev) => [ne, ...prev].slice(0, 500));

        if (ne.event_name) {
          const dedupKey = ne.event_id || ne.id;
          if (!seenEventIdsRef.current.has(dedupKey)) {
            seenEventIdsRef.current.add(dedupKey);
            setEventCounts((prev) => ({ ...prev, [ne.event_name]: (prev[ne.event_name] || 0) + 1 }));
            setEventsLastHour((prev) => prev + 1);

            // Ka-ching + Nina toast no Purchase
            if (ne.event_name === "Purchase") {
              playNotificationSound("kaching");
              // Buscar valor da order vinculada (best-effort)
              supabase
                .from("orders")
                .select("amount")
                .eq("product_id", ne.product_id)
                .eq("status", "paid")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
                .then(({ data }) => {
                  if (data?.amount) ninaPurchaseToast(Number(data.amount));
                  else ninaToast("Detectei uma venda 🎉");
                });
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterProduct, period, userId]);

  const recentTimestamps = useMemo(
    () => events.map((e) => new Date(e.created_at).getTime()),
    [events],
  );

  const chartData = useMemo(() => {
    const hoursBack = period === "1h" ? 1 : period === "6h" ? 6 : period === "24h" ? 24 : 168;
    const buckets = period === "7d" ? 7 : Math.min(hoursBack, 24);
    const now = new Date();
    const data: { label: string; count: number }[] = [];
    if (period === "7d") {
      for (let i = buckets - 1; i >= 0; i--) {
        const ds = new Date(now);
        ds.setDate(ds.getDate() - i);
        ds.setHours(0, 0, 0, 0);
        const de = new Date(ds);
        de.setDate(de.getDate() + 1);
        data.push({
          label: format(ds, "dd/MM", { locale: ptBR }),
          count: events.filter((e) => {
            const d = new Date(e.created_at);
            return d >= ds && d < de;
          }).length,
        });
      }
    } else {
      for (let i = buckets - 1; i >= 0; i--) {
        const hs = startOfHour(subHours(now, i));
        const he = startOfHour(subHours(now, i - 1));
        data.push({
          label: format(hs, "HH:mm"),
          count: events.filter((e) => {
            const d = new Date(e.created_at);
            return d >= hs && d < he;
          }).length,
        });
      }
    }
    return data;
  }, [events, period]);

  const recentEvents = events.slice(0, 80);

  const groupedEvents = useMemo(() => {
    const map = new Map<string, GroupedEvent>();
    const ungrouped: GroupedEvent[] = [];
    recentEvents.forEach((e) => {
      if (e.event_id) {
        if (map.has(e.event_id)) {
          const g = map.get(e.event_id)!;
          if (!g.sources.includes(e.source)) g.sources.push(e.source);
          g.ids.push(e.id);
          if (e.customer_name && !g.customer_name) g.customer_name = e.customer_name;
        } else {
          map.set(e.event_id, {
            event_id: e.event_id,
            event_name: e.event_name,
            product_id: e.product_id,
            customer_name: e.customer_name,
            created_at: e.created_at,
            sources: [e.source],
            ids: [e.id],
          });
        }
      } else {
        ungrouped.push({
          event_id: e.id,
          event_name: e.event_name,
          product_id: e.product_id,
          customer_name: e.customer_name,
          created_at: e.created_at,
          sources: [e.source],
          ids: [e.id],
        });
      }
    });
    return [...map.values(), ...ungrouped]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
  }, [recentEvents]);

  return (
    <div className="space-y-5">
      {/* ── Nina Tracking™ Header ── */}
      <NinaTrackingHeader
        period={period}
        onPeriodChange={setPeriod}
        filterProduct={filterProduct}
        onProductChange={setFilterProduct}
        products={products}
      />

      {/* ── Hero KPI Strip ── */}
      <HeroKPIStrip
        userId={userId}
        filterProduct={filterProduct}
        ownerProductIds={ownerProductIds}
        recentEventsTimestamps={recentTimestamps}
      />

      {/* ── Smart Alerts ── */}
      <SmartAlertsPanel userId={userId} filterProduct={filterProduct} />

      {/* ── Event counters ── */}
      <div className="relative grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 rounded-xl bg-card/50 border border-border/30 p-3">
        {ORDERED_EVENT_NAMES.map((name) => {
          const count = eventCounts[name] || 0;
          return (
            <div key={name} className="rounded-lg bg-muted/40 border border-border/20 px-2.5 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground font-medium truncate">{name}</span>
              </div>
              <span className="text-base font-bold text-foreground font-mono tabular-nums">{count}</span>
            </div>
          );
        })}
        <NinaWatermark />
      </div>

      {/* ── Chart ── */}
      <div className="relative rounded-xl bg-muted/40 border border-border/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <p className="text-xs text-muted-foreground font-medium">
            Sinais · {period === "7d" ? "diário" : "por hora"}
          </p>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count > 0 ? "#22d3ee" : "hsl(var(--muted))"}
                    fillOpacity={entry.count > 0 ? 0.7 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <NinaWatermark />
      </div>

      {/* ── Feed ao Vivo ── */}
      <div className="rounded-xl bg-card border border-border/20 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute w-5 h-5 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative z-10" />
            </div>
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/40">
              <button
                onClick={() => setFeedView("feed")}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  feedView === "feed"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setFeedView("journeys")}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  feedView === "journeys"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Jornadas
              </button>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
              {groupedEvents.length} sinais
            </span>
          </div>
          {feedView === "feed" && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-cyan-500/60" /> Pixel
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-violet-500/60" /> CAPI
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> Ambos
              </span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[420px] min-h-[280px]">
          {feedView === "journeys" ? (
            <CustomerJourneyFeed events={events} products={products} />
          ) : groupedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Radio className="w-8 h-8 text-muted-foreground/50" />
              </motion.div>
              <p className="text-sm text-muted-foreground font-medium">
                Nina aguardando sinais...
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                Os eventos aparecerão aqui em tempo real
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {groupedEvents.map((g) => (
                <EventFeedCard
                  key={g.event_id}
                  group={g}
                  productName={products.find((p) => p.id === g.product_id)?.name}
                  geo={{ country: geo.country, city: geo.city }}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Nina Footer ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/40 border border-border/20">
        <div className="flex items-center gap-2.5">
          <img
            src={ninaAvatar}
            alt="Nina"
            width={20}
            height={20}
            loading="lazy"
            className="w-5 h-5 rounded-full ring-1 ring-[#D4AF37]/40"
          />
          <span className="text-[11px] text-muted-foreground">
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #14B8A6 0%, #D4AF37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Nina Tracking™
            </span>
            {" · Realtime ativo · "}
            <span className="font-mono tabular-nums text-foreground">{eventsLastHour}</span>
            {" eventos na última hora"}
          </span>
        </div>
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
    </div>
  );
};

export default PixelEventsDashboard;
