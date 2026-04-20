import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Tv, Download, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import PixelHealthBanner from "@/components/admin/pixel/PixelHealthBanner";
import PixelSuggestions from "@/components/admin/pixel/PixelSuggestions";
import PixelBalanceCard from "@/components/admin/pixel/PixelBalanceCard";
import PixelComparisonCard from "@/components/admin/pixel/PixelComparisonCard";
import PixelComparisonChart from "@/components/admin/pixel/PixelComparisonChart";
import ProductsWithoutPixel from "@/components/admin/pixel/ProductsWithoutPixel";
import PixelEventsFeed from "@/components/admin/pixel/PixelEventsFeed";

export interface PixelMetric {
  id: string;
  pixel_id: string;
  product_id: string;
  product_name: string | null;
  platform: string;
  domain: string | null;
  has_token: boolean;
  token_status: "healthy" | "invalid" | "unknown";
  last_health_check_at: string | null;
  last_event_at: string | null;
  created_at: string;
  events: Array<{ event_name: string; source: string; count: number }>;
  emq_by_event: Array<{
    event_name: string;
    avg_emq: number;
    avg_dedup: number;
    avg_vid: number;
    browser: number;
    server: number;
    dual: number;
  }>;
}

export interface PixelFeedbackResponse {
  generated_at: string;
  window_days: number;
  pixels: PixelMetric[];
  products_without_pixel: Array<{ id: string; name: string }>;
  total_events: number;
  total_purchase_events: number;
}

export default function Pixel() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PixelFeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tvMode, setTvMode] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rpcData, error } = await supabase.rpc(
      "get_pixel_feedback_metrics" as any,
      { p_days: 7 } as any
    );
    if (error) {
      toast.error("Erro ao carregar métricas: " + error.message);
    } else {
      setData(rpcData as unknown as PixelFeedbackResponse);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin, load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "pixel-export-report",
        { body: { format: "csv" } }
      );
      if (error) throw error;
      const blob = new Blob([result as string], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixel-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório exportado");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={tvMode ? "fixed inset-0 z-50 bg-background overflow-auto p-8" : "space-y-6"}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className={`font-bold ${tvMode ? "text-3xl" : "text-2xl"}`}>
              Pixel — Saúde e Retroalimentação
            </h1>
            <p className="text-sm text-muted-foreground">
              Painel exclusivo Super Admin · janela {data.window_days} dias
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button
            variant={tvMode ? "default" : "outline"}
            size="sm"
            onClick={() => setTvMode(!tvMode)}
          >
            <Tv className="w-4 h-4 mr-2" />
            {tvMode ? "Sair TV" : "Modo TV"}
          </Button>
        </div>
      </div>

      {/* Semáforo */}
      <PixelHealthBanner data={data} />

      {/* Sugestões */}
      <PixelSuggestions data={data} />

      {/* Equilíbrio */}
      <PixelBalanceCard data={data} />

      {/* Cards comparativos */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pixels cadastrados ({data.pixels.length})</h2>
        {data.pixels.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Nenhum pixel cadastrado ainda. Adicione um pelo painel do produto.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.pixels.map((p) => (
              <PixelComparisonCard key={p.id} pixel={p} onUpdated={load} />
            ))}
          </div>
        )}
      </div>

      {/* Comparação visual */}
      {data.pixels.length >= 2 && <PixelComparisonChart data={data} />}

      {/* Produtos sem pixel */}
      <ProductsWithoutPixel data={data} />

      {/* Feed ao vivo */}
      <PixelEventsFeed />
    </div>
  );
}
