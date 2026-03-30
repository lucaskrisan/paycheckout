import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [open, setOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isConnected = active && !!token;

  return (
    <>
      {/* Thumbnail card — just the logo */}
      <button
        onClick={() => setOpen(true)}
        className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer text-center"
      >
        <div className="w-24 h-24 rounded-2xl bg-background border border-border/50 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow p-3">
          <img src={logo} alt={name} className="w-full h-full object-contain" />
        </div>
        <div className="space-y-1">
          <span className="font-display font-bold text-foreground text-sm">{name}</span>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={cn(
              "text-[9px] px-2 py-0 h-[18px] font-semibold tracking-wide uppercase",
              isConnected && "bg-primary/15 text-primary border border-primary/30"
            )}
          >
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
      </button>

      {/* Config modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logo} alt={name} className="w-7 h-7 object-contain" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">{name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Token */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Token da API</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => onTokenChange(e.target.value)}
                  placeholder={tokenPlaceholder}
                  className="pr-10 text-xs h-9 bg-background border-border/50"
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

            {/* Toggle + Save */}
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

            {/* Events */}
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

            {/* Docs */}
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IntegrationCard;
