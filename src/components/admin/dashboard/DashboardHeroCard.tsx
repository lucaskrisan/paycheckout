import { memo, useEffect, useRef, useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Zap, Eye } from "lucide-react";
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
  sublabel2?: string;
  variant?: "revenue" | "sales" | "ticket" | "pending" | "visitors" | "neutral";
  tooltip?: string;
  sparklineData?: number[];
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

/* Mini sparkline SVG */
function MiniSparkline({ data, color = "hsl(160 84% 39%)" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glow dot on last point */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) / (data.length - 1) * w}
          cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}
          r="3"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

const variantIcons = {
  revenue: DollarSign,
  sales: ShoppingCart,
  ticket: TrendingUp,
  visitors: Eye,
  neutral: Zap,
};

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, fmt, sublabel, sublabel2, variant = "neutral", tooltip, sparklineData }: Props) {
  const animatedValue = useAnimatedNumber(value);
  const Icon = variantIcons[variant] || Zap;

  const getGradient = () => {
    switch (variant) {
      case "revenue": return "from-violet-950 via-purple-900/80 to-violet-800/60";
      case "sales": return "from-indigo-950 via-blue-900/80 to-indigo-800/60";
      case "ticket": return "from-slate-900 via-zinc-900 to-stone-900";
      default: return "from-purple-950 via-violet-900 to-indigo-950";
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getGradient()} p-5 h-full min-h-[120px] flex flex-col justify-between shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] border border-white/5`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none grainy-texture" />
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute right-4 top-4">
        <div className="bg-white/5 backdrop-blur-md rounded-full p-2.5 border border-white/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/50">{label}</p>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-xs text-white/20">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs bg-card border-border">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-3xl font-display font-black tracking-tight mt-1 text-white tabular-nums drop-shadow-sm">
          {fmt(animatedValue)}
        </p>
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-4"><MiniSparkline data={sparklineData} color="rgba(255,255,255,0.4)" /></div>
      )}

      {(sublabel || sublabel2) && (
        <div className="mt-3 space-y-0.5 border-t border-white/5 pt-2">
          {sublabel && <p className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">{sublabel}</p>}
          {sublabel2 && <p className="text-[10px] font-mono text-white/30 tabular-nums">{sublabel2}</p>}
        </div>
      )}
    </div>
  );
});

export default DashboardHeroCard;
