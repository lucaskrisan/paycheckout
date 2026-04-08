import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  orders: { created_at: string; amount: number; status: string }[];
  fmt: (v: number) => string;
}

const CustomTooltip = ({ active, payload, label, fmt }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{payload[0].value} vendas</p>
    </div>
  );
};

const DashboardWeekdayChart = memo(function DashboardWeekdayChart({ orders, fmt }: Props) {
  const data = useMemo(() => {
    const counts = Array(7).fill(0);
    const approved = orders.filter(o => ["paid", "approved", "confirmed"].includes(o.status));
    approved.forEach(o => {
      const day = new Date(o.created_at).getDay();
      counts[day]++;
    });
    const max = Math.max(...counts, 1);
    return WEEKDAYS.map((name, i) => ({
      name,
      vendas: counts[i],
      pct: ((counts[i] / max) * 100).toFixed(1),
    }));
  }, [orders]);

  return (
    <Card className="border border-border bg-card shadow-none h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">Vendas por Dia da Semana</h3>
          <TooltipProvider delayDuration={200}>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                Distribuição de vendas aprovadas por dia da semana
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <Bar
                dataKey="vendas"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardWeekdayChart;
