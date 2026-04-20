import { CheckCircle2, XCircle, HelpCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PixelHealthBadge({
  status,
  hasToken,
}: {
  status: "healthy" | "invalid" | "unknown";
  hasToken: boolean;
}) {
  if (!hasToken) {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-500/40">
        <AlertCircle className="w-3 h-3 mr-1" /> Sem token
      </Badge>
    );
  }
  if (status === "healthy") {
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Token OK
      </Badge>
    );
  }
  if (status === "invalid") {
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" /> Token inválido
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <HelpCircle className="w-3 h-3 mr-1" /> Não verificado
    </Badge>
  );
}
