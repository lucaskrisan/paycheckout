import { Lightbulb } from "lucide-react";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

export default function PixelSuggestions({ data }: { data: PixelFeedbackResponse }) {
  const suggestions: string[] = [];

  // Pixels sem token
  const noToken = data.pixels.filter((p) => !p.has_token);
  if (noToken.length > 0) {
    suggestions.push(
      `${noToken.length} ${noToken.length === 1 ? "pixel sem token CAPI" : "pixels sem token CAPI"} — sem CAPI o EMQ máximo é ~6.0`
    );
  }

  // Produtos sem pixel
  if (data.products_without_pixel.length > 0) {
    suggestions.push(
      `${data.products_without_pixel.length} ${data.products_without_pixel.length === 1 ? "produto ativo sem pixel" : "produtos ativos sem pixel"} — você está perdendo dados`
    );
  }

  // Learning phase em andamento
  data.pixels.forEach((p) => {
    const purchases = p.events
      .filter((e) => e.event_name === "Purchase")
      .reduce((s, e) => s + e.count, 0);
    if (purchases > 0 && purchases < 50) {
      suggestions.push(
        `Pixel ${p.pixel_id.slice(0, 8)}… em learning phase: ${purchases}/50 Purchases — mantenha o orçamento`
      );
    }
  });

  // EMQ baixo
  data.pixels.forEach((p) => {
    p.emq_by_event.forEach((e) => {
      if (e.avg_emq > 0 && e.avg_emq < 6.5) {
        suggestions.push(
          `EMQ ${e.event_name} baixo (${e.avg_emq.toFixed(1)}) no pixel ${p.pixel_id.slice(0, 8)}… — verifique parâmetros do cliente`
        );
      }
    });
  });

  if (suggestions.length === 0) {
    suggestions.push("Tudo no verde — nenhuma ação recomendada agora ✨");
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">Sugestões inteligentes</h3>
      </div>
      <ul className="space-y-2">
        {suggestions.slice(0, 6).map((s, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
