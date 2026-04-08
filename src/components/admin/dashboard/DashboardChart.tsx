import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold text-foreground">{fmt(payload[0].value)}</p>
    </div>
  );
};

const DashboardChart = memo(function DashboardChart({ data, fmt, currencyPrefix = "R$" }: Props) {
  return (
    <Card className="border border-border bg-card shadow-none h-full">
      <CardContent className="p-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} opacity={0.5} />
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
                tickFormatter={(v) => `${currencyPrefix} ${v}`}
              />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fill="url(#colorRevGrad)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--background))",
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
