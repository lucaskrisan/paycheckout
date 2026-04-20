import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { PixelFeedbackResponse } from "@/pages/admin/Pixel";

export default function PixelHealthBanner({ data }: { data: PixelFeedbackResponse }) {
  const total = data.pixels.length;
  const invalidTokens = data.pixels.filter((p) => p.token_status === "invalid").length;
  const stale = data.pixels.filter((p) => {
    if (!p.last_event_at) return false;
    const ageMin = (Date.now() - new Date(p.last_event_at).getTime()) / 60000;
    return ageMin > 60 && p.has_token;
  }).length;

  let level: "ok" | "warn" | "danger" = "ok";
  let message = `Tudo saudável · ${total} ${total === 1 ? "pixel" : "pixels"} · ${data.total_purchase_events} Purchases (${data.window_days}d)`;

  if (invalidTokens > 0) {
    level = "danger";
    message = `${invalidTokens} ${invalidTokens === 1 ? "token inválido" : "tokens inválidos"} — atualize agora`;
  } else if (stale > 0) {
    level = "warn";
    message = `${stale} ${stale === 1 ? "pixel sem eventos recentes" : "pixels sem eventos recentes"} (>1h)`;
  } else if (total === 0) {
    level = "warn";
    message = "Nenhum pixel cadastrado ainda";
  }

  const styles = {
    ok: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    warn: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
  }[level];

  const Icon = level === "ok" ? CheckCircle2 : level === "warn" ? AlertTriangle : XCircle;

  return (
    <div className={`rounded-lg border-2 p-5 flex items-center gap-4 ${styles}`}>
      <Icon className="w-8 h-8 shrink-0" />
      <div className="flex-1">
        <p className="text-lg font-bold uppercase tracking-wide">
          {level === "ok" ? "🟢 Tudo saudável" : level === "warn" ? "🟡 Atenção" : "🔴 Ação necessária"}
        </p>
        <p className="text-sm opacity-90">{message}</p>
      </div>
    </div>
  );
}
