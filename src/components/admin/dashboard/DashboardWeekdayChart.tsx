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
  Cell,
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
    <div className="bg-popover/95 backdrop-blur-xl border border-border/60 rounded-lg px-3 py-2 shadow-2xl shadow-black/40">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-foreground font-display">{payload[0].value} vendas</p>
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
      pct: counts[i] / max,
    }));
  }, [orders]);

  return (
    <Card className="border border-border/60 bg-card shadow-none h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Vendas por Dia</h3>
          <TooltipProvider delayDuration={200}>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground/40 cursor-help" />
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
              <defs>
                <linearGradient id="barGradPantera" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270 85% 60%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(270 85% 60%)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(250 8% 55%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(250 8% 55%)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <Bar
                dataKey="vendas"
                fill="url(#barGradPantera)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fillOpacity={0.4 + entry.pct * 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardWeekdayChart;
