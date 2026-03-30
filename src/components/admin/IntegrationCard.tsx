import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ExternalLink, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface IntegrationCardProps {
  logo: string;
  name: string;
  description: string;
  docsUrl?: string;
  docsLabel?: string;
  active: boolean;
  hasToken: boolean;
  token: string;
  onTokenChange: (val: string) => void;
  onActiveChange: (val: boolean) => void;
  onSave: () => void;
  saving: boolean;
  tokenPlaceholder?: string;
  tokenHint?: React.ReactNode;
  statusEvents?: { key: string; label: string }[];
}

const IntegrationCard = ({
  logo,
  name,
  description,
  docsUrl,
  docsLabel,
  active,
  hasToken,
  token,
  onTokenChange,
  onActiveChange,
  onSave,
  saving,
  tokenPlaceholder = "Cole aqui o token da API",
  tokenHint,
  statusEvents,
}: IntegrationCardProps) => {
  const [showToken, setShowToken] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isConnected = active && !!token;

  return (
    <Card className="border border-border/40 bg-card overflow-hidden transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 pb-0">
        <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
          <img src={logo} alt={name} className="w-9 h-9 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-foreground text-base">{name}</span>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className={cn(
                "text-[10px] px-2 py-0 h-5 font-semibold tracking-wide uppercase",
                isConnected && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
              )}
            >
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      <CardContent className="p-5 pt-4 space-y-4">
        {/* Token field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Token da API</Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder={tokenPlaceholder}
              className="pr-10 text-xs h-9 bg-background border-border/50 focus:border-primary/50"
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {tokenHint && <div className="text-[10px] text-muted-foreground leading-relaxed">{tokenHint}</div>}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Switch checked={active} onCheckedChange={onActiveChange} id={`${name}-active`} />
            <Label htmlFor={`${name}-active`} className="text-xs cursor-pointer text-foreground/80">
              Ativar integração
            </Label>
          </div>
          <Button onClick={onSave} disabled={saving} size="sm" className="gap-1.5 h-8 px-4 text-xs font-semibold">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Events accordion */}
        {statusEvents && statusEvents.length > 0 && (
          <div className="border border-border/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-medium text-foreground/80 hover:bg-muted/30 transition-colors"
            >
              <span>Eventos sincronizados</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expanded && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-border/20 pt-2.5">
                {statusEvents.map((ev) => (
                  <div key={ev.key} className="flex items-center gap-2 text-[11px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span className="font-mono text-primary/90 font-medium">{ev.key}</span>
                    <span className="text-muted-foreground">— {ev.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Docs link */}
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            {docsLabel || "Documentação"} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default IntegrationCard;
