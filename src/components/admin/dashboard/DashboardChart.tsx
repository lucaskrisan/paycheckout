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
}

const DashboardChart = memo(function DashboardChart({ data, fmt }: Props) {
  return (
    <Card className="border border-border bg-card shadow-none">
      <CardContent className="p-5">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-xs" />
              <YAxis tick={{ fontSize: 11 }} className="text-xs" tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fill="url(#colorRev)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground mt-2 px-1">
          <span>Hoje, 0:00</span>
          <span>Hoje, 23:59</span>
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardChart;
