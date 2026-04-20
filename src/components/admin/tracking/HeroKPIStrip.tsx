// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Users, DollarSign, Target, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, subHours } from "date-fns";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import NinaWatermark from "./NinaWatermark";

interface Props {
  userId?: string;
  filterProduct: string;
  ownerProductIds: string[];
  recentEventsTimestamps: number[];
}

// EMQ Ring SVG component
const EMQRing = ({ score }: { score: number | null }) => {
  const radius = 26;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.min(score / 10, 1);
  const color =
    score == null ? "#64748b" : score >= 8 ? "#34d399" : score >= 6 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative w-[64px] h-[64px] flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>
          {score != null ? score.toFixed(1) : "—"}
        </span>
      </div>
    </div>
  );
};

const deltaBadge = (delta: number | null, suffix = "") => {
  if (delta === null) {
    return (
      <div className="text-[10px] font-medium text-muted-foreground">
        sem comparativo
      </div>
    );
  }
  const positive = delta >= 0;
  return (
    <div
      className="text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1"
      style={{
        color: positive ? "#34d399" : "#f87171",
        backgroundColor: positive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
      }}
    >
      {positive ? "+" : ""}
      {delta}% {suffix}
    </div>
  );
};

const HeroKPIStrip = ({ userId, filterProduct, ownerProductIds, recentEventsTimestamps }: Props) => {
  const [emqScore, setEmqScore] = useState<number | null>(null);
  const [emqPrevWeek, setEmqPrevWeek] = useState<number | null>(null);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueYesterday, setRevenueYesterday] = useState(0);
  const [visitorsYesterdaySameHour, setVisitorsYesterdaySameHour] = useState<number | null>(null);
  const visitorsActive = useCheckoutPresence("watch", undefined, ownerProductIds);

  const eventsPerMin = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recent = recentEventsTimestamps.filter((t) => t >= oneHourAgo);
    return Math.round(recent.length / 60);
  }, [recentEventsTimestamps]);

  const trend = useMemo(() => {
    const now = Date.now();
    const last5 = recentEventsTimestamps.filter((t) => t >= now - 5 * 60 * 1000).length;
    const prev5 = recentEventsTimestamps.filter(
      (t) => t >= now - 10 * 60 * 1000 && t < now - 5 * 60 * 1000,
    ).length;
    if (prev5 === 0) return last5 > 0 ? "up" : "flat";
    return last5 > prev5 ? "up" : last5 < prev5 ? "down" : "flat";
  }, [recentEventsTimestamps]);

  useEffect(() => {
    const loadKpis = async () => {
      // EMQ últimos 7 dias
      let emqQuery = supabase
        .from("emq_snapshots")
        .select("emq_score, product_id")
        .gte("snapshot_date", subDays(new Date(), 7).toISOString().slice(0, 10));
      if (filterProduct !== "all") emqQuery = emqQuery.eq("product_id", filterProduct);
      const { data: emqData } = await emqQuery;
      if (emqData && emqData.length > 0) {
        const avg = emqData.reduce((s: number, r: any) => s + (Number(r.emq_score) || 0), 0) / emqData.length;
        setEmqScore(Number(avg.toFixed(1)));
      } else {
        setEmqScore(null);
      }

      // EMQ semana anterior (8-14 dias atrás)
      let emqPrevQ = supabase
        .from("emq_snapshots")
        .select("emq_score, product_id")
        .gte("snapshot_date", subDays(new Date(), 14).toISOString().slice(0, 10))
        .lt("snapshot_date", subDays(new Date(), 7).toISOString().slice(0, 10));
      if (filterProduct !== "all") emqPrevQ = emqPrevQ.eq("product_id", filterProduct);
      const { data: emqPrevData } = await emqPrevQ;
      if (emqPrevData && emqPrevData.length > 0) {
        const avg = emqPrevData.reduce((s: number, r: any) => s + (Number(r.emq_score) || 0), 0) / emqPrevData.length;
        setEmqPrevWeek(Number(avg.toFixed(1)));
      } else {
        setEmqPrevWeek(null);
      }

      // Receita hoje
      const todayStart = startOfDay(new Date()).toISOString();
      let todayQuery = supabase
        .from("orders")
        .select("amount")
        .eq("status", "paid")
        .gte("created_at", todayStart);
      if (userId) todayQuery = todayQuery.eq("user_id", userId);
      if (filterProduct !== "all") todayQuery = todayQuery.eq("product_id", filterProduct);
      const { data: todayData } = await todayQuery;
      setRevenueToday((todayData || []).reduce((s: number, o: any) => s + Number(o.amount || 0), 0));

      // Receita ontem
      const yStart = startOfDay(subDays(new Date(), 1)).toISOString();
      const yEnd = startOfDay(new Date()).toISOString();
      let yQuery = supabase
        .from("orders")
        .select("amount")
        .eq("status", "paid")
        .gte("created_at", yStart)
        .lt("created_at", yEnd);
      if (userId) yQuery = yQuery.eq("user_id", userId);
      if (filterProduct !== "all") yQuery = yQuery.eq("product_id", filterProduct);
      const { data: yData } = await yQuery;
      setRevenueYesterday((yData || []).reduce((s: number, o: any) => s + Number(o.amount || 0), 0));

      // Visitantes mesma hora ontem (PageView)
      const now = new Date();
      const yHourStart = subHours(subDays(now, 1), 0);
      yHourStart.setMinutes(0, 0, 0);
      const yHourEnd = new Date(yHourStart);
      yHourEnd.setHours(yHourEnd.getHours() + 1);
      let visQ = supabase
        .from("pixel_events")
        .select("visitor_id", { count: "exact", head: true })
        .eq("event_name", "PageView")
        .gte("created_at", yHourStart.toISOString())
        .lt("created_at", yHourEnd.toISOString());
      if (userId) visQ = visQ.eq("user_id", userId);
      if (filterProduct !== "all") visQ = visQ.eq("product_id", filterProduct);
      const { count: visCount } = await visQ;
      setVisitorsYesterdaySameHour(visCount || 0);
    };
    loadKpis();
    const interval = setInterval(loadKpis, 30000);
    return () => clearInterval(interval);
  }, [userId, filterProduct]);

  const revenueDelta = useMemo(() => {
    if (revenueYesterday === 0) return revenueToday > 0 ? 100 : 0;
    return Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100);
  }, [revenueToday, revenueYesterday]);

  const emqDelta = useMemo(() => {
    if (emqScore == null || emqPrevWeek == null || emqPrevWeek === 0) return null;
    return Math.round(((emqScore - emqPrevWeek) / emqPrevWeek) * 100);
  }, [emqScore, emqPrevWeek]);

  const visitorsDelta = useMemo(() => {
    if (visitorsYesterdaySameHour == null || visitorsYesterdaySameHour === 0) {
      return visitorsActive > 0 ? 100 : null;
    }
    return Math.round(((visitorsActive - visitorsYesterdaySameHour) / visitorsYesterdaySameHour) * 100);
  }, [visitorsActive, visitorsYesterdaySameHour]);

  const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
  const trendColor = trend === "up" ? "#34d399" : trend === "down" ? "#f87171" : "#64748b";

  const emqLabel =
    emqScore == null
      ? "Sem dados"
      : emqScore >= 8
        ? "Excelente"
        : emqScore >= 6
          ? "Bom"
          : "Atenção";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Eventos / min */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/40 p-4 hover:border-[#D4AF37]/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: "#22d3ee15" }}>
            <Activity className="w-3.5 h-3.5" style={{ color: "#22d3ee" }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
          Eventos / min
        </p>
        <p className="text-2xl font-bold text-foreground font-mono tabular-nums leading-none mb-2">
          {eventsPerMin}
        </p>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: trendColor }}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-medium">vs 5min</span>
        </div>
        <NinaWatermark />
      </motion.div>

      {/* EMQ Score com Ring */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/40 p-4 hover:border-[#D4AF37]/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: "#D4AF3715" }}>
            <Target className="w-3.5 h-3.5" style={{ color: "#D4AF37" }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
          EMQ Score
        </p>
        <div className="flex items-center gap-3 mb-1">
          <EMQRing score={emqScore} />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-foreground">{emqLabel}</span>
            {deltaBadge(emqDelta, "vs sem.")}
          </div>
        </div>
        <NinaWatermark />
      </motion.div>

      {/* Visitantes ativos */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/40 p-4 hover:border-[#D4AF37]/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: "#34d39915" }}>
            <Users className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
          Visitantes ativos
        </p>
        <p className="text-2xl font-bold text-foreground font-mono tabular-nums leading-none mb-2">
          {visitorsActive}
        </p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="font-medium">no checkout</span>
          </div>
          {deltaBadge(visitorsDelta, "vs ontem")}
        </div>
        <NinaWatermark />
      </motion.div>

      {/* Receita hoje */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/40 p-4 hover:border-[#D4AF37]/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: "#D4AF3715" }}>
            <DollarSign className="w-3.5 h-3.5" style={{ color: "#D4AF37" }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
          Receita hoje
        </p>
        <p className="text-2xl font-bold text-foreground font-mono tabular-nums leading-none mb-2">
          {formatBRL(revenueToday)}
        </p>
        {deltaBadge(revenueDelta, "vs ontem")}
        <NinaWatermark />
      </motion.div>
    </div>
  );
};

export default HeroKPIStrip;
