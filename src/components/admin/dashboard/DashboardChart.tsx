import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { name: string; total: number }[];
  fmt: (v: number) => string;
  currencyPrefix?: string;
}

const CustomTooltip = ({ active, payload, label, fmt }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-xl border border-border/60 rounded-lg px-4 py-2.5 shadow-2xl shadow-black/40">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold text-foreground font-display">{fmt(payload[0].value)}</p>
    </div>
  );
};

const DashboardChart = memo(function DashboardChart({ data, fmt, currencyPrefix = "R$" }: Props) {
  const hasData = data.some(d => d.total > 0);

  return (
    <Card className="border border-border/60 bg-card shadow-none h-full overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Receita diária</h3>
        </div>
        <div className="h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270 85% 60%)" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="hsl(270 85% 60%)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(270 85% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(270 85% 60%)" />
                  <stop offset="100%" stopColor="hsl(185 90% 48%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 8% 14%)" vertical={false} opacity={0.5} />
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
                tickFormatter={(v) => `${currencyPrefix} ${v}`}
                width={65}
              />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="url(#strokeGrad)"
                fill="url(#colorRevGrad)"
                strokeWidth={2}
                dot={hasData ? { r: 3, fill: "hsl(270 85% 60%)", stroke: "hsl(260 15% 3%)", strokeWidth: 2 } : false}
                activeDot={{
                  r: 5,
                  fill: "hsl(185 90% 48%)",
                  stroke: "hsl(260 15% 3%)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardChart;
