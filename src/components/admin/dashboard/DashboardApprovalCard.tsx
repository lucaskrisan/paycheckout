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
  rate: number; // 0-100
  color?: string;
}

interface Props {
  items: RateItem[];
}

const DashboardApprovalCard = memo(function DashboardApprovalCard({ items }: Props) {
  return (
    <Card className="border border-border bg-card shadow-none h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-foreground">Taxa de Aprovação</h3>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                Percentual de aprovação por método de pagamento
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${item.rate * 0.88} ${88 - item.rate * 0.88}`}
                    strokeDashoffset="22"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-sm font-bold text-foreground">{item.rate.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardApprovalCard;
