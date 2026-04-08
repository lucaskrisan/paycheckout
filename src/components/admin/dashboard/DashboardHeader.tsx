import { memo } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Period = "today" | "yesterday" | "7days" | "month" | "lastMonth" | "total";

export const periodLabels: Record<Period, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7days": "Últimos 7 dias",
  month: "Mês atual",
  lastMonth: "Mês passado",
  total: "Total",
};

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  selectedProductId: string;
  onProductChange: (id: string) => void;
  products: { id: string; name: string }[];
  liveVisitors: number;
  refreshing: boolean;
  onRefresh: () => void;
  extraActions?: React.ReactNode;
}

const DashboardHeaderBar = memo(function DashboardHeaderBar({
  period,
  onPeriodChange,
  selectedProductId,
  onProductChange,
  products,
  liveVisitors,
  refreshing,
  onRefresh,
  extraActions,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-background text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-foreground font-medium">{liveVisitors}</span>
          <span className="text-muted-foreground">visitantes ao vivo</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        {extraActions}
        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger className="w-[150px] h-9 text-sm bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>
                {periodLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedProductId} onValueChange={onProductChange}>
          <SelectTrigger className="w-[170px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder="Todos os produtos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

export default DashboardHeaderBar;
