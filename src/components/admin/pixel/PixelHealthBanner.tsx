import { CheckCircle2, AlertTriangle, XCircle, Lightbulb } from "lucide-react";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

/**
 * Diagnóstico de saúde geral consolidado.
 * Substitui o antigo banner + o card de "Sugestões inteligentes".
 */
export default function PixelHealthBanner({ data }: { data: PixelFeedbackResponse }) {
  const total = data.pixels.length;
  const invalidTokens = data.pixels.filter((p) => p.token_status === "invalid").length;
  const noToken = data.pixels.filter((p) => !p.has_token).length;
  const duplicatedCount = data.duplicated_product_ids?.length ?? 0;

  // Pixels sem evento recente (>1h) — usa last_event_at calculado em tempo real
  const stale = data.pixels.filter((p) => {
    if (!p.last_event_at) return false;
    const ageMin = (Date.now() - new Date(p.last_event_at).getTime()) / 60000;
    return ageMin > 60 && p.has_token;
  }).length;

  // Determina nível geral
  let level: "ok" | "warn" | "danger" = "ok";
  let title = "🟢 Tudo saudável";

  if (invalidTokens > 0) {
    level = "danger";
    title = "🔴 Saúde geral: AÇÃO NECESSÁRIA";
  } else if (noToken > 0 || duplicatedCount > 0 || stale > 0) {
    level = "warn";
    title = "🟡 Saúde geral: ATENÇÃO";
  } else if (total === 0) {
    level = "warn";
    title = "🟡 Nenhum pixel cadastrado";
  }

  // Linhas de diagnóstico
  const issues: { icon: string; text: string; severity: "danger" | "warn" | "info" }[] = [];

  if (invalidTokens > 0) {
    issues.push({
      icon: "❌",
      text: `${invalidTokens} de ${total} ${invalidTokens === 1 ? "pixel com token inválido" : "pixels com token inválido"} — Meta está descartando eventos`,
      severity: "danger",
    });
  }
  if (noToken > 0) {
    issues.push({
      icon: "⚠️",
      text: `${noToken} ${noToken === 1 ? "pixel sem token CAPI" : "pixels sem token CAPI"} — sem CAPI o EMQ máximo é ~6.0`,
      severity: "warn",
    });
  }
  if (duplicatedCount > 0) {
    issues.push({
      icon: "⚠️",
      text: `${duplicatedCount} ${duplicatedCount === 1 ? "produto com pixels duplicados" : "produtos com pixels duplicados"} — Meta recomenda 1 pixel por produto`,
      severity: "warn",
    });
  }
  if (stale > 0) {
    issues.push({
      icon: "📭",
      text: `${stale} ${stale === 1 ? "pixel sem eventos recentes" : "pixels sem eventos recentes"} (>1h)`,
      severity: "warn",
    });
  }
  if (issues.length === 0) {
    issues.push({
      icon: "✨",
      text: `Tudo no verde · ${total} ${total === 1 ? "pixel ativo" : "pixels ativos"} · ${data.total_purchase_events.toLocaleString("pt-BR")} Purchases na janela de ${data.window_days}d`,
      severity: "info",
    });
  }

  const bgStyles = {
    ok: "bg-emerald-500/10 border-emerald-500/30",
    warn: "bg-amber-500/10 border-amber-500/30",
    danger: "bg-destructive/10 border-destructive/30",
  }[level];

  const titleStyles = {
    ok: "text-emerald-700 dark:text-emerald-400",
    warn: "text-amber-700 dark:text-amber-400",
    danger: "text-destructive",
  }[level];

  const Icon = level === "ok" ? CheckCircle2 : level === "warn" ? AlertTriangle : XCircle;

  return (
    <div className={`rounded-lg border-2 p-5 ${bgStyles}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-7 h-7 shrink-0 ${titleStyles}`} />
        <div>
          <p className={`text-lg font-bold uppercase tracking-wide ${titleStyles}`}>{title}</p>
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? "pixel" : "pixels"} cadastrados · janela de {data.window_days}d ·{" "}
            {data.total_events.toLocaleString("pt-BR")} eventos · {data.total_purchase_events.toLocaleString("pt-BR")} Purchases
          </p>
        </div>
      </div>

      <div className="space-y-1.5 pl-1">
        {issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="shrink-0">{issue.icon}</span>
            <span className={
              issue.severity === "danger" ? "text-destructive font-medium"
                : issue.severity === "warn" ? "text-amber-700 dark:text-amber-400"
                : "text-foreground/80"
            }>
              {issue.text}
            </span>
          </div>
        ))}
      </div>

      {level === "danger" && (
        <div className="mt-4 pt-3 border-t border-destructive/20 flex items-start gap-2 text-xs text-destructive/90">
          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Próxima ação:</strong> gere um novo Access Token CAPI no Gerenciador de Eventos do Facebook
            usando um perfil admin ativo, e atualize cada pixel pelo botão "Atualizar token" no card abaixo.
          </span>
        </div>
      )}
    </div>
  );
}
