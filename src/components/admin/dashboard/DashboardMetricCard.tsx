import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  accent?: boolean;
}

const DashboardMetricCard = memo(function DashboardMetricCard({ icon: Icon, label, value, sub, onClick, accent }: Props) {
  return (
    <Card
      className={`border transition-all duration-200 group ${
        accent
          ? "border-primary/25 bg-gradient-to-br from-primary/8 to-primary/3 hover:from-primary/12 hover:to-primary/5 shadow-sm shadow-primary/5"
          : "border-border bg-card hover:bg-muted/40 shadow-none"
      }${onClick ? " cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={`p-2 rounded-lg transition-colors ${
          accent 
            ? "bg-primary/20 group-hover:bg-primary/25" 
            : "bg-muted group-hover:bg-muted/80"
        }`}>
          <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className={`text-lg font-bold leading-tight ${accent ? "text-foreground" : "text-foreground"}`}>{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardMetricCard;
