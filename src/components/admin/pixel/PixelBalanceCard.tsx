import { Scale, AlertTriangle } from "lucide-react";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

export default function PixelBalanceCard({ data }: { data: PixelFeedbackResponse }) {
  // Agrupa pixels por produto
  const groups = new Map<string, typeof data.pixels>();
  data.pixels.forEach((p) => {
    const arr = groups.get(p.product_id) || [];
    arr.push(p);
    groups.set(p.product_id, arr);
  });

  // Produtos com 2+ pixels (cenário dual fire ou duplicação)
  const dualProducts = Array.from(groups.entries()).filter(([, list]) => list.length >= 2);

  if (dualProducts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Equilíbrio entre pixels</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum produto com 2+ pixels no momento. Esse painel mostra o equilíbrio quando você ativa dual fire.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Pixels duplicados no mesmo produto</h3>
      </div>

      <div className="space-y-4">
        {dualProducts.map(([productId, pixels]) => {
          // Agora a RPC já separa eventos por pixel_id, então podemos
          // mostrar o equilíbrio real entre eles.
          const totals = pixels.map((p) => ({
            pixel: p,
            total: p.events.reduce((s, e) => s + e.count, 0),
          }));
          const max = Math.max(...totals.map((t) => t.total), 1);
          const allZero = totals.every((t) => t.total === 0);

          return (
            <div key={productId} className="space-y-2">
              <p className="text-sm font-medium">{pixels[0].product_name || "Produto"}</p>

              {/* Aviso amarelo: Meta recomenda 1 pixel por produto/funil */}
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Esse produto tem <strong>{pixels.length} pixels</strong> cadastrados. O Facebook recomenda
                  <strong> 1 pixel por produto/funil</strong> para evitar conflito de aprendizado e diluição
                  do EMQ. Considere remover o pixel órfão.
                </span>
              </div>

              {!allZero && (
                <div className="space-y-1.5 pt-1">
                  {totals.map(({ pixel, total }) => {
                    const pct = (total / max) * 100;
                    return (
                      <div key={pixel.id} className="flex items-center gap-3 text-sm">
                        <span className="w-40 truncate font-mono text-xs text-muted-foreground">
                          {pixel.pixel_id}
                        </span>
                        <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="w-16 text-right tabular-nums text-xs">{total}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
