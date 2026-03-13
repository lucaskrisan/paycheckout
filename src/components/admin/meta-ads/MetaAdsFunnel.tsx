import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FunnelStage {
  label: string;
  count: number;
  percent: number;
}

export function MetaAdsFunnel() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFunnelData = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [{ data: events }, { data: orders }] = await Promise.all([
        supabase
          .from("pixel_events")
          .select("event_name")
          .gte("created_at", todayISO),
        supabase
          .from("orders")
          .select("status")
          .gte("created_at", todayISO),
      ]);

      const eventCounts: Record<string, number> = {};
      (events || []).forEach((e) => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });

      // Divide by 2 for browser+server dual events
      const cliques = Math.ceil((eventCounts["ViewContent"] || 0) / 2);
      const visPages = Math.ceil((eventCounts["PageView"] || 0) / 2);
      const ics = Math.ceil((eventCounts["InitiateCheckout"] || 0) / 2);
      const vendasInic = (orders || []).filter(
        (o) => ["pending", "waiting_payment", "paid", "approved", "confirmed"].includes(o.status)
      ).length;
      const vendasApr = (orders || []).filter(
        (o) => ["paid", "approved", "confirmed"].includes(o.status)
      ).length;

      const maxVal = Math.max(cliques, visPages, 1);

      setStages([
        { label: "Cliques", count: cliques, percent: 100 },
        { label: "Vis. Página", count: visPages, percent: maxVal > 0 ? (visPages / maxVal) * 100 : 0 },
        { label: "ICs", count: ics, percent: maxVal > 0 ? (ics / maxVal) * 100 : 0 },
        { label: "Vendas Inic.", count: vendasInic, percent: maxVal > 0 ? (vendasInic / maxVal) * 100 : 0 },
        { label: "Vendas Apr.", count: vendasApr, percent: maxVal > 0 ? (vendasApr / maxVal) * 100 : 0 },
      ]);
    } catch (err) {
      console.error("Funnel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunnelData();

    const pixelChannel = supabase
      .channel("meta-funnel-pixels")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pixel_events" }, () => fetchFunnelData())
      .subscribe();

    const ordersChannel = supabase
      .channel("meta-funnel-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchFunnelData())
      .subscribe();

    return () => {
      supabase.removeChannel(pixelChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchFunnelData]);

  // SVG funnel dimensions
  const svgWidth = 960;
  const svgHeight = 200;
  const stageCount = stages.length || 5;
  const stageW = svgWidth / stageCount;
  const centerY = svgHeight / 2;
  const maxBarH = 150;
  const minBarH = 3;

  // Compute heights with smooth tapering
  const heights = stages.map((s) => Math.max((s.percent / 100) * maxBarH, minBarH));

  // Build funnel path: smooth bezier curves connecting stages
  const buildFunnelPath = () => {
    if (heights.length === 0) return "";

    const points: Array<{ x: number; topY: number; botY: number }> = [];
    heights.forEach((h, i) => {
      const x = i * stageW + stageW / 2;
      points.push({ x, topY: centerY - h / 2, botY: centerY + h / 2 });
    });

    // Top line (left to right)
    let path = `M ${points[0].x - stageW / 2} ${points[0].topY}`;
    points.forEach((p, i) => {
      if (i === 0) {
        path += ` L ${p.x} ${p.topY}`;
      } else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        path += ` C ${cpx} ${prev.topY}, ${cpx} ${p.topY}, ${p.x} ${p.topY}`;
      }
    });
    // Extend to right edge
    const last = points[points.length - 1];
    path += ` L ${last.x + stageW / 2} ${last.topY}`;

    // Bottom line (right to left)
    path += ` L ${last.x + stageW / 2} ${last.botY}`;
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (i === points.length - 1) {
        path += ` L ${p.x} ${p.botY}`;
      } else {
        const next = points[i + 1];
        const cpx = (next.x + p.x) / 2;
        path += ` C ${cpx} ${next.botY}, ${cpx} ${p.botY}, ${p.x} ${p.botY}`;
      }
    }
    path += ` L ${points[0].x - stageW / 2} ${points[0].botY}`;
    path += " Z";
    return path;
  };

  return (
    <Card className="bg-[hsl(222,30%,14%)] border-border/50 overflow-hidden">
      <CardHeader className="pb-1 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Funil de Conversão (Meta Ads)
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                Dados em tempo real do funil de hoje. Atualiza automaticamente.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Carregando funil...
          </div>
        ) : (
          <div className="w-full">
            {/* Stage Labels */}
            <div className="flex w-full mb-1">
              {stages.map((stage) => (
                <div key={stage.label} className="flex-1 text-center">
                  <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>

            {/* SVG Funnel */}
            <div className="w-full">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="funnel-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(220, 85%, 55%)" stopOpacity="0.95" />
                    <stop offset="35%" stopColor="hsl(240, 70%, 50%)" stopOpacity="0.85" />
                    <stop offset="65%" stopColor="hsl(280, 60%, 45%)" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="hsl(330, 70%, 55%)" stopOpacity="0.55" />
                  </linearGradient>
                  <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="hsl(330, 80%, 60%)" />
                    <stop offset="100%" stopColor="hsl(330, 80%, 60%)" />
                  </linearGradient>
                </defs>

                {/* Main funnel shape */}
                <path
                  d={buildFunnelPath()}
                  fill="url(#funnel-grad)"
                  className="transition-all duration-700"
                />

                {/* Thin accent line at bottom of funnel for small values */}
                {stages.length > 2 && (() => {
                  const lastTwo = heights.slice(-2);
                  if (lastTwo.every((h) => h < 10)) {
                    const startX = (stages.length - 2) * stageW;
                    return (
                      <line
                        x1={startX}
                        y1={centerY}
                        x2={svgWidth}
                        y2={centerY}
                        stroke="url(#line-grad)"
                        strokeWidth="2"
                        opacity={0.8}
                      />
                    );
                  }
                  return null;
                })()}

                {/* Divider lines */}
                {stages.map((_, i) => {
                  if (i === 0) return null;
                  const x = i * stageW;
                  return (
                    <line
                      key={`div-${i}`}
                      x1={x} y1={10} x2={x} y2={svgHeight - 10}
                      stroke="hsl(220, 20%, 25%)"
                      strokeWidth="1"
                      strokeDasharray="3,5"
                      opacity={0.6}
                    />
                  );
                })}

                {/* Percentage labels */}
                {stages.map((stage, i) => {
                  const cx = i * stageW + stageW / 2;
                  return (
                    <text
                      key={`pct-${i}`}
                      x={cx}
                      y={centerY + 5}
                      textAnchor="middle"
                      fill="white"
                      fontWeight="700"
                      fontSize="18"
                      opacity={0.95}
                    >
                      {stage.percent >= 0.05 ? `${stage.percent.toFixed(1)}%` : "0%"}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Count labels */}
            <div className="flex w-full mt-0">
              {stages.map((stage) => (
                <div key={`c-${stage.label}`} className="flex-1 text-center">
                  <span className="text-base font-bold text-slate-200">
                    {stage.count.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>

            {/* Live dot */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] text-slate-500">Tempo real</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
