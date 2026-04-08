import { memo, useEffect, useRef, useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
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
    gradient: "from-emerald-600 via-emerald-500 to-teal-400",
    iconBg: "bg-white/20",
    Icon: DollarSign,
  },
  sales: {
    gradient: "from-emerald-700 via-emerald-600 to-emerald-400",
    iconBg: "bg-white/20",
    Icon: ShoppingCart,
  },
  ticket: {
    gradient: "from-amber-600 via-amber-500 to-yellow-400",
    iconBg: "bg-white/20",
    Icon: TrendingUp,
  },
  neutral: {
    gradient: "from-emerald-600 via-emerald-500 to-teal-400",
    iconBg: "bg-white/20",
    Icon: DollarSign,
  },
  accent: {
    gradient: "from-emerald-600 via-emerald-500 to-teal-400",
    iconBg: "bg-white/20",
    Icon: DollarSign,
  },
};

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, fmt, sublabel, variant = "neutral", tooltip }: Props) {
  const animatedValue = useAnimatedNumber(value);
  const config = variantConfig[variant] || variantConfig.neutral;
  const { Icon } = config;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${config.gradient} p-5 h-full min-h-[120px] flex flex-col justify-between shadow-lg`}>
      {/* Decorative circles */}
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -top-2 w-20 h-20 rounded-full bg-white/5" />

      {/* Icon */}
      <div className="absolute right-4 top-4">
        <div className={`${config.iconBg} backdrop-blur-sm rounded-full p-2.5`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-white/80">{label}</p>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-white/40 cursor-help text-xs">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-3xl font-bold text-white tracking-tight mt-1">
          {fmt(animatedValue)}
        </p>
      </div>

      {sublabel && (
        <p className="text-xs text-white/70 mt-2">{sublabel}</p>
      )}
    </div>
  );
});

export default DashboardHeroCard;
