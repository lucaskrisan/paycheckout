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
      className={`border shadow-none transition-all duration-200 ${
        accent
          ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-muted/30"
      }${onClick ? " cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md ${accent ? "bg-primary/15" : "bg-muted"}`}>
          <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-base font-bold text-foreground leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardMetricCard;
