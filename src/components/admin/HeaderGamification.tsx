import { useMemo } from "react";
import { motion } from "framer-motion";

interface Props {
  /** Number of approved/paid orders — currency-agnostic */
  paidCount: number;
}

const salesMilestones = [
  { threshold: 10, label: "10" },
  { threshold: 50, label: "50" },
  { threshold: 100, label: "100" },
  { threshold: 250, label: "250" },
  { threshold: 500, label: "500" },
  { threshold: 1000, label: "1K" },
  { threshold: 2500, label: "2,5K" },
  { threshold: 5000, label: "5K" },
  { threshold: 10000, label: "10K" },
  { threshold: 25000, label: "25K" },
  { threshold: 50000, label: "50K" },
  { threshold: 100000, label: "100K" },
];

function formatCount(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")}K`;
  return String(v);
}

// Medal color based on number of approved sales
function getMedal(count: number): { emoji: string; color: string } {
  if (count >= 5000) return { emoji: "🏆", color: "text-yellow-400" };
  if (count >= 1000) return { emoji: "🥇", color: "text-yellow-400" };
  if (count >= 500) return { emoji: "🥈", color: "text-gray-300" };
  if (count >= 100) return { emoji: "🥉", color: "text-amber-600" };
  return { emoji: "🎖️", color: "text-amber-400" };
}

export default function HeaderGamification({ paidCount }: Props) {
  const nextMilestone = useMemo(() => {
    return salesMilestones.find((m) => m.threshold > paidCount) || salesMilestones[salesMilestones.length - 1];
  }, [paidCount]);

  const progress = useMemo(() => {
    if (!nextMilestone || paidCount >= nextMilestone.threshold) return 100;
    const prevIdx = salesMilestones.findIndex((m) => m.threshold === nextMilestone.threshold) - 1;
    const prev = prevIdx >= 0 ? salesMilestones[prevIdx].threshold : 0;
    const range = nextMilestone.threshold - prev;
    return Math.min(((paidCount - prev) / range) * 100, 100);
  }, [paidCount, nextMilestone]);

  const medal = getMedal(paidCount);

  return (
    <div className="flex items-center gap-2" title={`${paidCount} vendas aprovadas (todas as moedas)`}>
      <span className="text-lg">{medal.emoji}</span>
      <div className="flex items-center gap-2 min-w-[160px]">
        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {formatCount(paidCount)} / {nextMilestone?.label || "🏆"} vendas
        </span>
      </div>
    </div>
  );
}
