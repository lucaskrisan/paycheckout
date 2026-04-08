// @ts-nocheck
import { memo, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá",
  BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

interface Props {
  salesByState: Record<string, { count: number; revenue: number }>;
  fmt: (v: number) => string;
}

const DashboardStateMap = memo(function DashboardStateMap({ salesByState, fmt }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return Object.entries(salesByState)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }, [salesByState]);

  const maxCount = sorted.length > 0 ? sorted[0][1].count : 1;

  if (sorted.length === 0) {
    return (
      <Card className="border border-border bg-card shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Vendas por Estado</h3>
          </div>
          <p className="text-xs text-muted-foreground text-center py-6">Sem dados de localização ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Estados</h3>
          <span className="text-xs text-muted-foreground ml-auto">{Object.keys(salesByState).length} estados</span>
        </div>
        <div className="space-y-2.5">
          {sorted.map(([uf, data]) => {
            const pct = (data.count / maxCount) * 100;
            const isSelected = selected === uf;
            return (
              <button
                key={uf}
                onClick={() => setSelected(prev => prev === uf ? null : uf)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground w-6">{uf}</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {STATE_NAMES[uf]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground">{data.count}</span>
                    {isSelected && (
                      <span className="text-[11px] text-primary font-medium animate-in fade-in slide-in-from-right-2 duration-200">
                        {fmt(data.revenue)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500 group-hover:from-primary group-hover:to-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardStateMap;
