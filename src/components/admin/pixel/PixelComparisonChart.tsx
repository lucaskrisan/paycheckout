import { BarChart3 } from "lucide-react";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

const KEY_EVENTS = ["PageView", "ViewContent", "InitiateCheckout", "AddPaymentInfo", "Purchase"];

export default function PixelComparisonChart({ data }: { data: PixelFeedbackResponse }) {
  // Filtra apenas pixels em produtos DISTINTOS (sem duplicação).
  // Comparar pixels duplicados no mesmo produto não faz sentido — já há aviso no card de balanço.
  const duplicatedSet = new Set(data.duplicated_product_ids ?? []);
  const pixels = data.pixels.filter((p) => !duplicatedSet.has(p.product_id));

  if (pixels.length < 2) {
    return null;
  }

  // Calcula contagens por evento por pixel
  const matrix = pixels.map((p) => {
    const counts: Record<string, number> = {};
    KEY_EVENTS.forEach((ev) => {
      counts[ev] = p.events.filter((e) => e.event_name === ev).reduce((s, e) => s + e.count, 0);
    });
    return { pixel_id: p.pixel_id, product_name: p.product_name, counts };
  });

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Comparação visual entre pixels (janela {data.window_days}d)</h3>
      </div>
      <div className="space-y-4">
        {KEY_EVENTS.map((ev) => {
          const max = Math.max(...matrix.map((m) => m.counts[ev]), 1);
          return (
            <div key={ev}>
              <p className="text-sm font-medium mb-2">{ev}</p>
              <div className="space-y-1.5">
                {matrix.map((m) => {
                  const pct = (m.counts[ev] / max) * 100;
                  return (
                    <div key={`${m.pixel_id}-${ev}`} className="flex items-center gap-2 text-xs">
                      <span className="w-44 truncate text-muted-foreground" title={`${m.pixel_id} · ${m.product_name ?? ""}`}>
                        <span className="font-mono">{m.pixel_id.slice(0, 10)}…</span>{" "}
                        <span className="opacity-70">{m.product_name}</span>
                      </span>
                      <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right tabular-nums font-mono">
                        {m.counts[ev].toLocaleString("pt-BR")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
