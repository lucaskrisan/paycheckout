import { RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { MetaAccount } from "@/hooks/useMetaAds";

interface Props {
  accounts: MetaAccount[];
  selectedAccount: string;
  onSelectAccount: (id: string) => void;
  datePreset: string;
  onDatePreset: (v: string) => void;
  customRange: { since: string; until: string } | null;
  onCustomRange: (r: { since: string; until: string }) => void;
  lastRefresh: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

export function MetaAdsHeader({
  accounts, selectedAccount, onSelectAccount,
  datePreset, onDatePreset, customRange, onCustomRange,
  lastRefresh, loading, onRefresh,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Account selector */}
      <Select value={selectedAccount} onValueChange={onSelectAccount}>
        <SelectTrigger className="w-[260px] bg-card border-border">
          <SelectValue placeholder="Selecione a conta" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.name || acc.account_id} ({acc.currency})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date preset */}
      <Select value={datePreset} onValueChange={onDatePreset}>
        <SelectTrigger className="w-[160px] bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="yesterday">Ontem</SelectItem>
          <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
          <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {datePreset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[140px] bg-card border-border"
            value={customRange?.since || ""}
            onChange={(e) => onCustomRange({ since: e.target.value, until: customRange?.until || "" })}
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            className="w-[140px] bg-card border-border"
            value={customRange?.until || ""}
            onChange={(e) => onCustomRange({ since: customRange?.since || "", until: e.target.value })}
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {lastRefresh && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Atualizado {timeAgo(lastRefresh)}
          </span>
        )}
        <Button size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
