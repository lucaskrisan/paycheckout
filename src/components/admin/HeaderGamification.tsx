import { useMemo } from "react";
import { motion } from "framer-motion";

interface Props {
  totalRevenue: number;
}

const revenueMilestones = [
  { threshold: 1000, label: "R$ 1K" },
  { threshold: 5000, label: "R$ 5K" },
  { threshold: 10000, label: "R$ 10K" },
  { threshold: 50000, label: "R$ 50K" },
  { threshold: 100000, label: "R$ 100K" },
  { threshold: 500000, label: "R$ 500K" },
  { threshold: 1000000, label: "R$ 1M" },
];

function formatRevenue(v: number) {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}K`;
  return `R$ ${v.toFixed(0)}`;
}

// Medal color based on revenue
function getMedal(revenue: number): { emoji: string; color: string } {
  if (revenue >= 500000) return { emoji: "🏆", color: "text-yellow-400" };
  if (revenue >= 100000) return { emoji: "🥇", color: "text-yellow-400" };
  if (revenue >= 50000) return { emoji: "🥈", color: "text-gray-300" };
  if (revenue >= 10000) return { emoji: "🥉", color: "text-amber-600" };
  return { emoji: "🎖️", color: "text-amber-400" };
}

export default function HeaderGamification({ totalRevenue }: Props) {
  const nextRevMilestone = useMemo(() => {
    return revenueMilestones.find((m) => m.threshold > totalRevenue) || revenueMilestones[revenueMilestones.length - 1];
  }, [totalRevenue]);

  const revProgress = useMemo(() => {
    if (!nextRevMilestone || totalRevenue >= nextRevMilestone.threshold) return 100;
    const prevIdx = revenueMilestones.findIndex((m) => m.threshold === nextRevMilestone.threshold) - 1;
    const prev = prevIdx >= 0 ? revenueMilestones[prevIdx].threshold : 0;
    const range = nextRevMilestone.threshold - prev;
    return Math.min(((totalRevenue - prev) / range) * 100, 100);
  }, [totalRevenue, nextRevMilestone]);

  const medal = getMedal(totalRevenue);

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{medal.emoji}</span>
      <div className="flex items-center gap-2 min-w-[160px]">
        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${revProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {formatRevenue(totalRevenue)} / {nextRevMilestone?.label || "🏆"}
        </span>
      </div>
    </div>
  );
}
