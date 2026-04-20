import { Link } from "react-router-dom";
import { Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

export default function ProductsWithoutPixel({ data }: { data: PixelFeedbackResponse }) {
  const list = data.products_without_pixel;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">Produtos sem pixel ({list.length})</h3>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todos os produtos ativos têm ao menos 1 pixel cadastrado ✅
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {list.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm truncate">{p.name}</span>
              <Button asChild size="sm" variant="ghost">
                <Link to={`/admin/products/${p.id}/edit`}>
                  Adicionar pixel <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
