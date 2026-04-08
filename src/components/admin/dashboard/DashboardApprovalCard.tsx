import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RateItem {
  label: string;
  rate: number;
  color?: string;
}

interface Props {
  items: RateItem[];
}

const DashboardApprovalCard = memo(function DashboardApprovalCard({ items }: Props) {
  return (
    <Card className="border border-border/60 bg-card shadow-none h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Taxa de Aprovação</h3>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/40 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                Percentual de aprovação por método de pagamento
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-5">
          {items.map((item, i) => {
            const strokeColor = i === 0 ? "hsl(270 85% 60%)" : "hsl(185 90% 48%)";
            const bgColor = i === 0 ? "text-purple-300" : "text-cyan-300";
            return (
              <div key={item.label} className="flex items-center justify-between">
                <span className={`text-sm ${bgColor} font-medium`}>{item.label}</span>
                <div className="flex items-center gap-3">
                  <svg width="32" height="32" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none"
                      stroke="hsl(260 10% 14%)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="3"
                      strokeDasharray={`${item.rate * 0.88} ${88 - item.rate * 0.88}`}
                      strokeDashoffset="22"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_4px_rgba(168,85,247,0.4)]"
                    />
                  </svg>
                  <span className="text-sm font-bold text-foreground font-display">{item.rate.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardApprovalCard;
