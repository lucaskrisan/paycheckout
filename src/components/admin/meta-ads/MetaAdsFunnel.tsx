import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FunnelStage {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export function MetaAdsFunnel() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFunnelData = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch pixel_events for today
      const { data: events } = await supabase
        .from("pixel_events")
        .select("event_name")
        .gte("created_at", todayISO);

      // Fetch orders for today
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .gte("created_at", todayISO);

      const eventCounts: Record<string, number> = {};
      (events || []).forEach((e) => {
        // Deduplicate by counting unique event names
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });

      // Divide by 2 to account for browser+server dual events
      const pageViews = Math.ceil((eventCounts["PageView"] || 0) / 2);
      const viewContent = Math.ceil((eventCounts["ViewContent"] || 0) / 2);
      const initiateCheckout = Math.ceil((eventCounts["InitiateCheckout"] || 0) / 2);
      const leads = Math.ceil((eventCounts["Lead"] || 0) / 2);
      const purchases = Math.ceil((eventCounts["Purchase"] || 0) / 2);

      const pendingOrders = (orders || []).filter(
        (o) => o.status === "pending" || o.status === "waiting_payment"
      ).length;
      const approvedOrders = (orders || []).filter(
        (o) => o.status === "paid" || o.status === "approved" || o.status === "confirmed"
      ).length;

      const maxVal = Math.max(pageViews, 1);

      const funnelStages: FunnelStage[] = [
        {
          label: "Vis. Página",
          count: pageViews,
          percent: 100,
          color: "hsl(var(--primary))",
        },
        {
          label: "ViewContent",
          count: viewContent,
          percent: maxVal > 0 ? (viewContent / maxVal) * 100 : 0,
          color: "hsl(220, 80%, 60%)",
        },
        {
          label: "ICs",
          count: initiateCheckout,
          percent: maxVal > 0 ? (initiateCheckout / maxVal) * 100 : 0,
          color: "hsl(260, 70%, 55%)",
        },
        {
          label: "Leads",
          count: leads,
          percent: maxVal > 0 ? (leads / maxVal) * 100 : 0,
          color: "hsl(280, 60%, 50%)",
        },
        {
          label: "Vendas Inic.",
          count: pendingOrders + approvedOrders,
          percent: maxVal > 0 ? ((pendingOrders + approvedOrders) / maxVal) * 100 : 0,
          color: "hsl(320, 70%, 55%)",
        },
        {
          label: "Vendas Apr.",
          count: approvedOrders,
          percent: maxVal > 0 ? (approvedOrders / maxVal) * 100 : 0,
          color: "hsl(340, 80%, 60%)",
        },
      ];

      setStages(funnelStages);
    } catch (err) {
      console.error("Funnel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunnelData();

    // Real-time: pixel_events
    const pixelChannel = supabase
      .channel("meta-funnel-pixels")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pixel_events" },
        () => fetchFunnelData()
      )
      .subscribe();

    // Real-time: orders
    const ordersChannel = supabase
      .channel("meta-funnel-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchFunnelData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pixelChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchFunnelData]);

  // Build SVG funnel
  const totalWidth = 900;
  const stageWidth = totalWidth / stages.length;
  const maxHeight = 160;
  const minHeight = 4;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Funil de Conversão (Meta Ads)
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                Dados em tempo real do funil de hoje. Atualiza automaticamente a cada novo evento.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Carregando funil...
          </div>
        ) : (
          <div className="w-full">
            {/* Stage Labels */}
            <div className="flex w-full mb-2">
              {stages.map((stage) => (
                <div key={stage.label} className="flex-1 text-center">
                  <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                </div>
              ))}
            </div>

            {/* SVG Funnel */}
            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${totalWidth} ${maxHeight + 20}`}
                className="w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="funnel-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                    <stop offset="30%" stopColor="hsl(260, 70%, 55%)" stopOpacity="0.85" />
                    <stop offset="60%" stopColor="hsl(300, 60%, 50%)" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="hsl(340, 80%, 60%)" stopOpacity="0.6" />
                  </linearGradient>
                </defs>

                {/* Funnel shape */}
                {stages.map((stage, i) => {
                  const nextStage = stages[i + 1];
                  const currentH = Math.max(
                    (stage.percent / 100) * maxHeight,
                    minHeight
                  );
                  const nextH = nextStage
                    ? Math.max((nextStage.percent / 100) * maxHeight, minHeight)
                    : currentH * 0.8;

                  const x1 = i * stageWidth;
                  const x2 = (i + 1) * stageWidth;
                  const centerY = (maxHeight + 20) / 2;

                  const topLeft = centerY - currentH / 2;
                  const bottomLeft = centerY + currentH / 2;
                  const topRight = centerY - nextH / 2;
                  const bottomRight = centerY + nextH / 2;

                  return (
                    <polygon
                      key={stage.label}
                      points={`${x1},${topLeft} ${x2},${topRight} ${x2},${bottomRight} ${x1},${bottomLeft}`}
                      fill="url(#funnel-gradient)"
                      opacity={1 - i * 0.1}
                      className="transition-all duration-500"
                    />
                  );
                })}

                {/* Divider lines */}
                {stages.map((_, i) => {
                  if (i === 0) return null;
                  const x = i * stageWidth;
                  return (
                    <line
                      key={`div-${i}`}
                      x1={x}
                      y1={4}
                      x2={x}
                      y2={maxHeight + 16}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      opacity={0.5}
                    />
                  );
                })}

                {/* Percentage labels inside funnel */}
                {stages.map((stage, i) => {
                  const cx = i * stageWidth + stageWidth / 2;
                  const cy = (maxHeight + 20) / 2;
                  return (
                    <text
                      key={`pct-${stage.label}`}
                      x={cx}
                      y={cy + 5}
                      textAnchor="middle"
                      className="fill-primary-foreground font-bold"
                      fontSize="16"
                    >
                      {stage.percent >= 0.1 ? `${stage.percent.toFixed(1)}%` : "0%"}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Count labels below */}
            <div className="flex w-full mt-2">
              {stages.map((stage) => (
                <div key={`count-${stage.label}`} className="flex-1 text-center">
                  <span className="text-sm font-bold text-foreground">{stage.count.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs text-muted-foreground">Atualização em tempo real</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
