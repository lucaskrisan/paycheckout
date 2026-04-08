// @ts-nocheck
import { memo, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Simplified Brazil state paths (approximate SVG paths for each state)
const STATES: Record<string, { name: string; path: string; cx: number; cy: number }> = {
  AC: { name: "Acre", path: "M95,280 L115,275 L120,290 L105,295Z", cx: 107, cy: 285 },
  AL: { name: "Alagoas", path: "M480,270 L495,265 L500,275 L485,280Z", cx: 490, cy: 272 },
  AP: { name: "Amapá", path: "M290,120 L310,105 L320,125 L300,135Z", cx: 305, cy: 120 },
  AM: { name: "Amazonas", path: "M120,180 L230,160 L250,200 L240,240 L180,250 L120,230Z", cx: 185, cy: 205 },
  BA: { name: "Bahia", path: "M400,260 L470,240 L490,290 L470,340 L420,350 L395,310Z", cx: 440, cy: 295 },
  CE: { name: "Ceará", path: "M450,200 L480,195 L490,220 L465,230Z", cx: 470, cy: 215 },
  DF: { name: "Distrito Federal", path: "M370,310 L380,305 L385,315 L375,318Z", cx: 377, cy: 312 },
  ES: { name: "Espírito Santo", path: "M450,340 L470,335 L475,355 L455,360Z", cx: 462, cy: 348 },
  GO: { name: "Goiás", path: "M340,290 L385,280 L395,320 L370,340 L335,330Z", cx: 365, cy: 310 },
  MA: { name: "Maranhão", path: "M360,180 L420,170 L430,210 L390,220 L360,210Z", cx: 395, cy: 195 },
  MT: { name: "Mato Grosso", path: "M230,250 L320,240 L340,300 L310,340 L240,340 L220,300Z", cx: 280, cy: 290 },
  MS: { name: "Mato Grosso do Sul", path: "M280,340 L340,330 L350,380 L320,400 L280,390Z", cx: 315, cy: 365 },
  MG: { name: "Minas Gerais", path: "M370,300 L440,290 L460,340 L440,370 L380,370 L365,340Z", cx: 415, cy: 335 },
  PA: { name: "Pará", path: "M230,140 L350,130 L370,180 L350,220 L280,230 L230,200Z", cx: 300, cy: 180 },
  PB: { name: "Paraíba", path: "M470,235 L500,230 L505,245 L475,250Z", cx: 487, cy: 240 },
  PR: { name: "Paraná", path: "M320,390 L380,380 L395,410 L360,430 L320,420Z", cx: 355, cy: 405 },
  PE: { name: "Pernambuco", path: "M450,240 L500,235 L505,255 L460,260Z", cx: 478, cy: 248 },
  PI: { name: "Piauí", path: "M410,210 L445,200 L455,240 L430,260 L405,250Z", cx: 430, cy: 230 },
  RJ: { name: "Rio de Janeiro", path: "M420,370 L450,365 L460,380 L435,390Z", cx: 440, cy: 377 },
  RN: { name: "Rio Grande do Norte", path: "M475,215 L505,210 L508,228 L480,232Z", cx: 492, cy: 220 },
  RS: { name: "Rio Grande do Sul", path: "M310,430 L365,425 L370,470 L340,490 L305,475Z", cx: 340, cy: 455 },
  RO: { name: "Rondônia", path: "M180,260 L230,250 L240,290 L210,305 L180,295Z", cx: 210, cy: 278 },
  RR: { name: "Roraima", path: "M180,110 L220,100 L230,140 L200,150 L180,140Z", cx: 205, cy: 125 },
  SC: { name: "Santa Catarina", path: "M340,430 L385,425 L390,450 L350,458Z", cx: 365, cy: 440 },
  SP: { name: "São Paulo", path: "M350,360 L420,350 L430,385 L395,400 L350,395Z", cx: 390, cy: 378 },
  SE: { name: "Sergipe", path: "M475,265 L492,260 L495,275 L478,278Z", cx: 485, cy: 268 },
  TO: { name: "Tocantins", path: "M350,220 L395,210 L410,260 L390,280 L355,270Z", cx: 378, cy: 248 },
};

interface Props {
  salesByState: Record<string, { count: number; revenue: number }>;
}

const BrazilMap = memo(function BrazilMap({ salesByState }: Props) {
  const maxCount = useMemo(() => {
    const counts = Object.values(salesByState).map((s) => s.count);
    return Math.max(...counts, 1);
  }, [salesByState]);

  const getColor = (count: number) => {
    if (count === 0) return "hsl(var(--secondary))";
    const intensity = Math.min(count / maxCount, 1);
    // from muted green to vivid primary
    const lightness = 45 - intensity * 20;
    const saturation = 40 + intensity * 60;
    return `hsl(151, ${saturation}%, ${lightness}%)`;
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="w-full aspect-[1.2] relative">
      <svg viewBox="60 80 480 440" className="w-full h-full">
        {Object.entries(STATES).map(([uf, state]) => {
          const data = salesByState[uf] || { count: 0, revenue: 0 };
          return (
            <Tooltip key={uf}>
              <TooltipTrigger asChild>
                <g className="cursor-pointer transition-all duration-200 hover:brightness-125">
                  <path
                    d={state.path}
                    fill={getColor(data.count)}
                    stroke="hsl(var(--background))"
                    strokeWidth="1.5"
                    className="transition-colors duration-300"
                  />
                  <text
                    x={state.cx}
                    y={state.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-foreground text-[8px] font-bold pointer-events-none select-none"
                    style={{ fontSize: 8 }}
                  >
                    {uf}
                  </text>
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border">
                <div className="text-sm">
                  <p className="font-bold text-foreground">{state.name}</p>
                  <p className="text-muted-foreground">
                    {data.count} venda{data.count !== 1 ? "s" : ""} · {fmt(data.revenue)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </svg>
    </div>
  );
});

export default BrazilMap;
