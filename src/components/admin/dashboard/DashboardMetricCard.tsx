import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
}

const DashboardMetricCard = memo(function DashboardMetricCard({ icon: Icon, label, value, sub, onClick }: Props) {
  return (
    <Card
      className={`border border-border bg-card shadow-none${onClick ? " cursor-pointer hover:bg-muted/40 transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-full bg-muted">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardMetricCard;
