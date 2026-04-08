import { memo, useEffect, useRef, useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  label: string;
  value: number;
  previousValue?: number;
  fmt: (v: number) => string;
  sublabel?: string;
  variant?: "revenue" | "sales" | "ticket" | "neutral" | "accent";
  tooltip?: string;
}

function useAnimatedNumber(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    startRef.current = display;
    startTimeRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startRef.current + (target - startRef.current) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return display;
}

const variantConfig = {
  revenue: {
    gradient: "from-violet-950 via-purple-900/80 to-violet-800/60",
    border: "border-purple-500/20",
    glow: "shadow-[inset_0_1px_0_0_rgba(168,85,247,0.15),0_4px_24px_-4px_rgba(139,92,246,0.25)]",
    Icon: DollarSign,
    iconColor: "text-purple-300",
  },
  sales: {
    gradient: "from-slate-950 via-indigo-950/60 to-violet-950/40",
    border: "border-indigo-500/15",
    glow: "shadow-[inset_0_1px_0_0_rgba(99,102,241,0.12),0_4px_24px_-4px_rgba(99,102,241,0.2)]",
    Icon: ShoppingCart,
    iconColor: "text-indigo-300",
  },
  ticket: {
    gradient: "from-slate-950 via-cyan-950/40 to-teal-950/30",
    border: "border-cyan-500/15",
    glow: "shadow-[inset_0_1px_0_0_rgba(6,182,212,0.12),0_4px_24px_-4px_rgba(6,182,212,0.2)]",
    Icon: TrendingUp,
    iconColor: "text-cyan-300",
  },
  neutral: {
    gradient: "from-violet-950 via-purple-900/80 to-violet-800/60",
    border: "border-purple-500/20",
    glow: "shadow-[inset_0_1px_0_0_rgba(168,85,247,0.15),0_4px_24px_-4px_rgba(139,92,246,0.25)]",
    Icon: Zap,
    iconColor: "text-purple-300",
  },
  accent: {
    gradient: "from-slate-950 via-cyan-950/40 to-teal-950/30",
    border: "border-cyan-500/15",
    glow: "shadow-[inset_0_1px_0_0_rgba(6,182,212,0.12),0_4px_24px_-4px_rgba(6,182,212,0.2)]",
    Icon: Zap,
    iconColor: "text-cyan-300",
  },
};

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, fmt, sublabel, variant = "neutral", tooltip }: Props) {
  const animatedValue = useAnimatedNumber(value);
  const config = variantConfig[variant] || variantConfig.neutral;
  const { Icon } = config;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${config.gradient} border ${config.border} ${config.glow} p-5 h-full min-h-[120px] flex flex-col justify-between`}>
      {/* Texture noise overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPgo8cmVjdCB3aWR0aD0nNCcgaGVpZ2h0PSc0JyBmaWxsPScjZmZmJy8+CjxyZWN0IHdpZHRoPScxJyBoZWlnaHQ9JzEnIGZpbGw9JyMwMDAnLz4KPC9zdmc+')] pointer-events-none" />

      {/* Subtle gradient orb */}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/[0.03] blur-2xl" />

      {/* Icon */}
      <div className="absolute right-4 top-4">
        <div className="bg-white/[0.06] backdrop-blur-sm rounded-lg p-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</p>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-white/25 cursor-help text-xs">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-2xl font-bold text-white tracking-tight mt-1.5 font-display">
          {fmt(animatedValue)}
        </p>
      </div>

      {sublabel && (
        <p className="text-[11px] text-white/35 mt-2 font-mono">{sublabel}</p>
      )}
    </div>
  );
});

export default DashboardHeroCard;
