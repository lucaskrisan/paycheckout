import { memo, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
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
  variant?: "revenue" | "sales" | "neutral" | "accent";
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

const DashboardHeroCard = memo(function DashboardHeroCard({ label, value, fmt, sublabel, variant = "neutral", tooltip }: Props) {
  const animatedValue = useAnimatedNumber(value);

  const valueColor = variant === "accent" ? "text-primary" : "text-foreground";

  return (
    <Card className="border border-border bg-card shadow-none h-full">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className={`text-2xl font-bold tracking-tight ${valueColor}`}>
          {fmt(animatedValue)}
        </p>
        {sublabel && (
          <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
});

export default DashboardHeroCard;
