import { memo, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  label: string;
  value: number;
  previousValue?: number;
  fmt: (v: number) => string;
  sublabel?: string;
}

function useAnimatedNumber(target: number, duration = 800) {
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

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, previousValue, fmt, sublabel }: Props) {
  const animatedValue = useAnimatedNumber(value);

  const changePercent = previousValue && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const isPositive = changePercent !== null && changePercent > 0;
  const isNegative = changePercent !== null && changePercent < 0;

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent shadow-lg shadow-primary/5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/3 rounded-full translate-y-1/2 -translate-x-1/2" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {fmt(animatedValue)}
            </p>
            {sublabel && (
              <p className="text-xs text-muted-foreground">{sublabel}</p>
            )}
          </div>
          {changePercent !== null && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPositive ? "bg-emerald-500/15 text-emerald-500" :
              isNegative ? "bg-red-500/15 text-red-500" :
              "bg-muted text-muted-foreground"
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
