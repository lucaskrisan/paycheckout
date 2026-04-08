import { memo, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingBag, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  label: string;
  value: number;
  previousValue?: number;
  fmt: (v: number) => string;
  sublabel?: string;
  variant?: "revenue" | "sales";
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

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, previousValue, fmt, sublabel, variant = "revenue" }: Props) {
  const animatedValue = useAnimatedNumber(value);

  const changePercent = previousValue && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;
  const isPositive = changePercent !== null && changePercent > 0;
  const isNegative = changePercent !== null && changePercent < 0;

  const Icon = variant === "revenue" ? DollarSign : ShoppingBag;

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg group">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-primary/3" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-primary/10" />
      
      {/* Glow orbs */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/15 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-700" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/25 backdrop-blur-sm border border-primary/20 shadow-sm shadow-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground/70">{label}</p>
            </div>
            <p className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">
              {fmt(animatedValue)}
            </p>
            {sublabel && (
              <p className="text-xs text-foreground/50">{sublabel}</p>
            )}
          </div>
          {changePercent !== null && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm border ${
              isPositive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" :
              isNegative ? "bg-red-500/15 text-red-400 border-red-500/20" :
              "bg-muted/50 text-muted-foreground border-border"
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> :
               isNegative ? <TrendingDown className="w-3 h-3" /> :
               <Minus className="w-3 h-3" />}
              {Math.abs(changePercent).toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardHeroCard;
