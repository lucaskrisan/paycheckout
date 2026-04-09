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
  variant?: "revenue" | "sales" | "ticket" | "visitors" | "neutral";
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

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, fmt, sublabel, variant = "neutral", tooltip, sparklineData }: Props) {
  const animatedValue = useAnimatedNumber(value);
  const Icon = variantIcons[variant] || Zap;
  const isRevenue = variant === "revenue";

  const containerClass = isRevenue
    ? "relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-5 h-full min-h-[120px] flex flex-col justify-between shadow-[0_4px_24px_-4px_rgba(16,185,129,0.3)]"
    : "relative overflow-hidden rounded-xl border border-white/[0.06] bg-card/70 backdrop-blur-md p-5 h-full min-h-[120px] flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_2px_20px_-4px_rgba(0,0,0,0.5)]";

  return (
    <div className={containerClass}>
      {isRevenue && (
        <>
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-white/[0.06]" />
        </>
      )}
      {!isRevenue && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      )}

      <div className="absolute right-4 top-4">
        <div className={isRevenue ? "bg-white/20 backdrop-blur-sm rounded-full p-2.5" : "bg-white/[0.04] border border-white/[0.06] rounded-lg p-2"}>
          <Icon className={`w-4 h-4 ${isRevenue ? "text-white" : "text-muted-foreground"}`} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-medium ${isRevenue ? "text-white/80" : "text-muted-foreground"}`}>{label}</p>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`cursor-help text-xs ${isRevenue ? "text-white/40" : "text-muted-foreground/50"}`}>ⓘ</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className={`text-3xl font-bold tracking-tight mt-1.5 ${isRevenue ? "text-white" : "text-primary"}`}>
          {fmt(animatedValue)}
        </p>
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-2"><MiniSparkline data={sparklineData} /></div>
      )}

      {sublabel && (
        <p className={`text-[11px] mt-2 ${isRevenue ? "text-white/60" : "text-muted-foreground/70"}`}>{sublabel}</p>
      )}
    </div>
  );
});

export default DashboardHeroCard;
