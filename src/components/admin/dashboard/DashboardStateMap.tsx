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
      .slice(0, 8);
  }, [salesByState]);

  const maxCount = sorted.length > 0 ? sorted[0][1].count : 1;

  if (sorted.length === 0) {
    return (
      <Card className="border border-border bg-card shadow-none h-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Vendas por Estado</h3>
          </div>
          <p className="text-[11px] text-muted-foreground text-center py-4">Sem dados de localização ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-none h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Top Estados</h3>
          <span className="text-[11px] text-muted-foreground ml-auto">{Object.keys(salesByState).length} UFs</span>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {sorted.map(([uf, data]) => {
            const pct = (data.count / maxCount) * 100;
            const isSelected = selected === uf;
            return (
              <button
                key={uf}
                onClick={() => setSelected(prev => prev === uf ? null : uf)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-foreground w-5">{uf}</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[80px]">
                      {STATE_NAMES[uf]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">{data.count}</span>
                    {isSelected && (
                      <span className="text-[10px] text-primary font-medium animate-in fade-in slide-in-from-right-2 duration-200">
                        {fmt(data.revenue)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
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
