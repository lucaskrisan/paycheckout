import { Scale } from "lucide-react";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

export default function PixelBalanceCard({ data }: { data: PixelFeedbackResponse }) {
  // Agrupa pixels por produto
  const groups = new Map<string, typeof data.pixels>();
  data.pixels.forEach((p) => {
    const arr = groups.get(p.product_id) || [];
    arr.push(p);
    groups.set(p.product_id, arr);
  });

  // Pega só produtos com 2+ pixels (cenário dual fire)
  const dualProducts = Array.from(groups.entries()).filter(([, list]) => list.length >= 2);

  if (dualProducts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Equilíbrio entre pixels</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Ainda não há produto com 2+ pixels (dual fire). Quando você adicionar o pixel novo no produto âncora, esse painel mostrará o equilíbrio em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Equilíbrio entre pixels (últimos 7 dias)</h3>
      </div>
      <div className="space-y-4">
        {dualProducts.map(([productId, pixels]) => {
          const totals = pixels.map((p) => ({
            pixel: p,
            total: p.events.reduce((s, e) => s + e.count, 0),
          }));
          const max = Math.max(...totals.map((t) => t.total), 1);
          return (
            <div key={productId}>
              <p className="text-sm font-medium mb-2">{pixels[0].product_name || "Produto"}</p>
              <div className="space-y-2">
                {totals.map(({ pixel, total }) => {
                  const pct = (total / max) * 100;
                  const status = pct >= 90 ? "ok" : pct >= 70 ? "warn" : "danger";
                  const barColor = {
                    ok: "bg-emerald-500",
                    warn: "bg-amber-500",
                    danger: "bg-destructive",
                  }[status];
                  return (
                    <div key={pixel.id} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate font-mono text-xs text-muted-foreground">
                        {pixel.pixel_id}
                      </span>
                      <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                        <div
                          className={`h-full ${barColor} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-right tabular-nums">{total}</span>
                      <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                        {pct.toFixed(0)}%
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
