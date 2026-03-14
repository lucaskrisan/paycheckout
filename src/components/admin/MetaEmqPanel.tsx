import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Activity, CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, Eye, ShieldCheck, Zap, RefreshCw, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  products: { id: string; name: string }[];
}

interface EventEmq {
  event_name: string;
  browser_count: number;
  server_count: number;
  dual_count: number;
  vid_coverage: number;
  dedup_rate: number;
}

interface PixelResult {
  pixel_id: string;
  pixel_name: string | null;
  events: { event_name: string; event_count: number; emq_score: number | null }[];
  settings?: { data_use_setting: string; event_bridge_setting: string; first_party_cookie_status: string };
  error: string | null;
}

interface EmqData {
  results: PixelResult[];
  internal_metrics: {
    events: EventEmq[];
    overall: { total_events: number; vid_coverage: number };
  };
}

const EVENT_LABELS: Record<string, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  InitiateCheckout: "InitiateCheckout",
  Lead: "Lead",
  AddToCart: "AddToCart",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "Purchase",
};

const FUNNEL_ORDER = ["PageView", "ViewContent", "InitiateCheckout", "Lead", "AddToCart", "AddPaymentInfo", "Purchase"];

function emqColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function emqBg(score: number | null): string {
  if (score === null) return "bg-slate-700/30";
  if (score >= 8) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 6) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function dedupIcon(rate: number) {
  if (rate >= 90) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
  if (rate >= 60) return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  return <XCircle className="w-3 h-3 text-red-400" />;
}

export default function MetaEmqPanel({ products }: Props) {
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EmqData | null>(null);

  const fetchEmq = async () => {
    if (!selectedProduct) { toast.error("Selecione um produto"); return; }
    setLoading(true);
    setData(null);

    try {
      const { data: result, error } = await supabase.functions.invoke("meta-emq", {
        body: { product_id: selectedProduct },
      });

      if (error) throw new Error(typeof error === 'object' && error.message ? error.message : 'Erro na conexão');
      if (result?.error) throw new Error(result.error);

      setData(result);
      toast.success("Dados de EMQ carregados!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar EMQ");
    } finally {
      setLoading(false);
    }
  };

  // Sort internal events by funnel order
  const sortedInternalEvents = data?.internal_metrics?.events
    ?.sort((a, b) => {
      const aIdx = FUNNEL_ORDER.indexOf(a.event_name);
      const bIdx = FUNNEL_ORDER.indexOf(b.event_name);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    }) || [];

  // Calculate overall internal score
  const overallDedup = sortedInternalEvents.length > 0
    ? Math.round(sortedInternalEvents.reduce((sum, e) => sum + e.dedup_rate, 0) / sortedInternalEvents.length)
    : 0;

  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2.5">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-200">Event Match Quality (EMQ)</h2>
          <p className="text-[10px] text-slate-500">Score de qualidade do Meta + métricas internas (7 dias)</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {products.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum produto com pixel configurado.</p>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-400">Produto</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="bg-slate-800/60 border-slate-700/50 text-slate-300 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchEmq} disabled={loading} size="sm" className="gap-1.5 text-xs">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : data ? <RefreshCw className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                {loading ? "Carregando..." : data ? "Atualizar" : "Consultar EMQ"}
              </Button>
            </div>

            {data && (
              <>
                {/* ── Overview Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-md bg-slate-900/50 border border-slate-700/20 p-3 text-center">
                    <Eye className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-100 font-mono">{data.internal_metrics?.overall?.total_events || 0}</p>
                    <p className="text-[9px] text-slate-500">Eventos (7d)</p>
                  </div>
                  <div className="rounded-md bg-slate-900/50 border border-slate-700/20 p-3 text-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-100 font-mono">{data.internal_metrics?.overall?.vid_coverage || 0}%</p>
                    <p className="text-[9px] text-slate-500">Cobertura VID</p>
                  </div>
                  <div className="rounded-md bg-slate-900/50 border border-slate-700/20 p-3 text-center">
                    <Zap className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                    <p className={`text-lg font-bold font-mono ${overallDedup >= 90 ? 'text-emerald-400' : overallDedup >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{overallDedup}%</p>
                    <p className="text-[9px] text-slate-500">Dedup Média</p>
                  </div>
                  <div className="rounded-md bg-slate-900/50 border border-slate-700/20 p-3 text-center">
                    <Activity className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-100 font-mono">{data.results?.length || 0}</p>
                    <p className="text-[9px] text-slate-500">Pixels CAPI</p>
                  </div>
                </div>

                {/* ── Meta EMQ Scores (from Graph API) ── */}
                {data.results?.map((pixel) => (
                  <div key={pixel.pixel_id} className="rounded-md bg-slate-900/50 border border-slate-700/20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-700/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-mono text-xs font-medium text-slate-300">{pixel.pixel_id}</span>
                        {pixel.pixel_name && <span className="text-[10px] text-slate-500">({pixel.pixel_name})</span>}
                      </div>
                      {pixel.error && (
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                          API Error
                        </Badge>
                      )}
                    </div>

                    {pixel.error ? (
                      <div className="px-3 py-3">
                        <p className="text-[11px] text-red-400">{pixel.error}</p>
                      </div>
                    ) : (
                      <>
                        {/* Pixel settings */}
                        {pixel.settings && (
                          <div className="px-3 py-2 border-b border-slate-700/10 flex flex-wrap gap-2">
                            {Object.entries(pixel.settings).map(([key, val]) => (
                              <Badge key={key} variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700/30">
                                {key.replace(/_/g, ' ')}: {val}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* EMQ scores per event */}
                        {pixel.events.length > 0 ? (
                          <div className="divide-y divide-slate-700/15">
                            {pixel.events
                              .sort((a, b) => {
                                const aIdx = FUNNEL_ORDER.indexOf(a.event_name);
                                const bIdx = FUNNEL_ORDER.indexOf(b.event_name);
                                return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
                              })
                              .map((ev) => (
                                <div key={ev.event_name} className="px-3 py-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-300">
                                      {EVENT_LABELS[ev.event_name] || ev.event_name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {ev.event_count?.toLocaleString() || 0} eventos
                                    </span>
                                  </div>
                                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${emqBg(ev.emq_score)}`}>
                                    <span className={`text-sm font-bold font-mono ${emqColor(ev.emq_score)}`}>
                                      {ev.emq_score !== null ? ev.emq_score.toFixed(1) : '—'}
                                    </span>
                                    <span className="text-[9px] text-slate-500">EMQ</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="px-3 py-3">
                            <p className="text-[11px] text-slate-500">Nenhum evento com score EMQ disponível na API do Meta. Os scores podem levar até 48h para aparecer.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* ── Internal Dedup Metrics ── */}
                {sortedInternalEvents.length > 0 && (
                  <div className="rounded-md bg-slate-900/50 border border-slate-700/20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-700/20 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-slate-300">Métricas Internas de Deduplicação (7 dias)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-700/20">
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">Evento</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-medium">Browser</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-medium">Server</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-medium">DUAL ✓</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-medium">Dedup</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-medium">VID %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/10">
                          {sortedInternalEvents.map((ev) => (
                            <tr key={ev.event_name}>
                              <td className="px-3 py-2 text-slate-300 font-medium">{EVENT_LABELS[ev.event_name] || ev.event_name}</td>
                              <td className="px-3 py-2 text-center text-slate-400 font-mono">{ev.browser_count}</td>
                              <td className="px-3 py-2 text-center text-slate-400 font-mono">{ev.server_count}</td>
                              <td className="px-3 py-2 text-center text-emerald-400 font-mono font-bold">{ev.dual_count}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center gap-1">
                                  {dedupIcon(ev.dedup_rate)}
                                  <span className={`font-mono font-bold ${ev.dedup_rate >= 90 ? 'text-emerald-400' : ev.dedup_rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {ev.dedup_rate}%
                                  </span>
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`font-mono ${ev.vid_coverage >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {ev.vid_coverage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
