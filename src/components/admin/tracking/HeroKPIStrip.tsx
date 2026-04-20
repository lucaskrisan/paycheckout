// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Users, DollarSign, Target, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay } from "date-fns";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import NinaWatermark from "./NinaWatermark";

interface Props {
  userId?: string;
  filterProduct: string;
  ownerProductIds: string[];
  recentEventsTimestamps: number[]; // timestamps (ms) das últimas inserções
}

const HeroKPIStrip = ({ userId, filterProduct, ownerProductIds, recentEventsTimestamps }: Props) => {
  const [emqScore, setEmqScore] = useState<number | null>(null);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueYesterday, setRevenueYesterday] = useState(0);
  const visitorsActive = useCheckoutPresence("watch", undefined, ownerProductIds);

  // Eventos / minuto (derivado dos timestamps recentes — última hora)
  const eventsPerMin = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recent = recentEventsTimestamps.filter((t) => t >= oneHourAgo);
    return Math.round(recent.length / 60);
  }, [recentEventsTimestamps]);

  // Tendência: comparar últimos 5min com 5min anteriores
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
      // EMQ médio dos últimos snapshots
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

      // Receita hoje (orders pagas)
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

      // Receita ontem (mesmo intervalo)
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
    };
    loadKpis();
    const interval = setInterval(loadKpis, 30000);
    return () => clearInterval(interval);
  }, [userId, filterProduct]);

  const revenueDelta = useMemo(() => {
    if (revenueYesterday === 0) return revenueToday > 0 ? 100 : 0;
    return Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100);
  }, [revenueToday, revenueYesterday]);

  const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  const emqColor = emqScore == null ? "#64748b" : emqScore >= 8 ? "#34d399" : emqScore >= 6 ? "#fbbf24" : "#f87171";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
  const trendColor = trend === "up" ? "#34d399" : trend === "down" ? "#f87171" : "#64748b";

  const cards = [
    {
      key: "events",
      label: "Eventos / min",
      value: eventsPerMin.toString(),
      icon: Activity,
      iconColor: "#22d3ee",
      extra: (
        <div className="flex items-center gap-1 text-[10px]" style={{ color: trendColor }}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-medium">vs 5min</span>
        </div>
      ),
    },
    {
      key: "emq",
      label: "EMQ Score",
      value: emqScore != null ? emqScore.toFixed(1) : "—",
      icon: Target,
      iconColor: emqColor,
      extra: (
        <div className="text-[10px] text-muted-foreground">
          {emqScore != null && emqScore >= 8 ? "Excelente" : emqScore != null && emqScore >= 6 ? "Bom" : emqScore != null ? "Atenção" : "Sem dados"}
        </div>
      ),
    },
    {
      key: "visitors",
      label: "Visitantes ativos",
      value: visitorsActive.toString(),
      icon: Users,
      iconColor: "#34d399",
      extra: (
        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="font-medium">no checkout</span>
        </div>
      ),
    },
    {
      key: "revenue",
      label: "Receita hoje",
      value: formatBRL(revenueToday),
      icon: DollarSign,
      iconColor: "#D4AF37",
      extra: (
        <div
          className="text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1"
          style={{
            color: revenueDelta >= 0 ? "#34d399" : "#f87171",
            backgroundColor: revenueDelta >= 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          }}
        >
          {revenueDelta >= 0 ? "+" : ""}
          {revenueDelta}% vs ontem
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/40 p-4 hover:border-[#D4AF37]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${card.iconColor}15` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: card.iconColor }} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-foreground font-mono tabular-nums leading-none mb-2">
              {card.value}
            </p>
            {card.extra}
            <NinaWatermark />
          </motion.div>
        );
      })}
    </div>
  );
};

export default HeroKPIStrip;
