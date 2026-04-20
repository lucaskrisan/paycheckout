import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HelpCircle, Calendar, Activity, KeyRound } from "lucide-react";
import type { PixelMetric } from "@/pages/admin/Pixel";
import PixelEMQTable from "./PixelEMQTable";
import PixelLearningProgress from "./PixelLearningProgress";
import PixelHealthBadge from "./PixelHealthBadge";
import UpdateTokenDialog from "./UpdateTokenDialog";

export default function PixelComparisonCard({
  pixel,
  onUpdated,
}: {
  pixel: PixelMetric;
  onUpdated: () => void;
}) {
  const [tokenOpen, setTokenOpen] = useState(false);

  const purchases = pixel.events
    .filter((e) => e.event_name === "Purchase")
    .reduce((s, e) => s + e.count, 0);
  const totalEvents = pixel.events.reduce((s, e) => s + e.count, 0);

  const ageDays = Math.floor(
    (Date.now() - new Date(pixel.created_at).getTime()) / 86400000
  );
  const isMature = ageDays > 14 && purchases >= 50;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isMature ? "default" : "secondary"}>
              {isMature ? "Maduro ✅" : "Em treino"}
            </Badge>
            <PixelHealthBadge status={pixel.token_status} hasToken={pixel.has_token} />
          </div>
          <p className="font-mono text-sm font-semibold truncate">{pixel.pixel_id}</p>
          <p className="text-xs text-muted-foreground truncate">
            {pixel.product_name || "Produto"} · criado há {ageDays}d
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setTokenOpen(true)}>
          <KeyRound className="w-3.5 h-3.5 mr-1" />
          Token
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="w-3 h-3" /> Eventos (7d)
          </p>
          <p className="text-xl font-bold tabular-nums">{totalEvents.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Purchases (7d)
          </p>
          <p className="text-xl font-bold tabular-nums">{purchases}</p>
        </div>
      </div>

      {/* Learning */}
      {!isMature && <PixelLearningProgress purchases={purchases} />}

      {/* EMQ */}
      <PixelEMQTable rows={pixel.emq_by_event} />

      <UpdateTokenDialog
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        pixelRowId={pixel.id}
        pixelLabel={pixel.pixel_id}
        onSaved={onUpdated}
      />
    </div>
  );
}
