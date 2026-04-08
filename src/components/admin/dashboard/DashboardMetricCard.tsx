import { memo } from "react";
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
  value: string;
  sub?: string;
  onClick?: () => void;
  accent?: boolean;
  tooltip?: string;
  icon?: any; // kept for backwards compat but not rendered
}

const DashboardMetricCard = memo(function DashboardMetricCard({ label, value, sub, onClick, accent, tooltip }: Props) {
  return (
    <Card
      className={`border border-border bg-card shadow-none h-full transition-colors ${onClick ? "cursor-pointer hover:bg-muted/40" : ""}`}
      onClick={onClick}
    >
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
        <p className={`text-xl font-bold tracking-tight ${accent ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
});

export default DashboardMetricCard;
