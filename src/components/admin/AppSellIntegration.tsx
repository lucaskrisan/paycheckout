import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ExternalLink, Eye, EyeOff, Save, ShieldCheck } from "lucide-react";

const AppSellIntegration = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadIntegration();
  }, [user?.id]);

  const loadIntegration = async () => {
    const { data } = await supabase
      .from("appsell_integrations")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setToken(data.token || "");
      setActive(data.active || false);
      setExists(true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!token.trim()) {
      toast.error("Insira o token da API do AppSell");
      return;
    }

    setSaving(true);

    if (exists) {
      const { error } = await supabase
        .from("appsell_integrations")
        .update({ token: token.trim(), active, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) toast.error("Erro ao salvar");
      else toast.success("Integração AppSell atualizada!");
    } else {
      const { error } = await supabase
        .from("appsell_integrations")
        .insert({ user_id: user.id, token: token.trim(), active });
      if (error) toast.error("Erro ao salvar");
      else {
        toast.success("Integração AppSell configurada!");
        setExists(true);
      }
    }

    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card className="border border-border/50 bg-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 bg-gradient-to-br from-violet-500 to-purple-700">
            AS
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">AppSell</span>
              <Badge
                variant={active && token ? "default" : "secondary"}
                className="text-[10px]"
              >
                {active && token ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Envie eventos de pagamento automaticamente para o AppSell para liberar e gerenciar acessos dos seus clientes.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Token da API</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Cole aqui o token gerado no AppSell"
                  className="pr-10 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Acesse{" "}
              <a
                href="https://appsell-software.com/integracoes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                appsell-software.com/integracoes <ExternalLink className="w-2.5 h-2.5" />
              </a>
              , busque por "Panttera" e copie o token gerado.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={active}
                onCheckedChange={setActive}
                id="appsell-active"
              />
              <Label htmlFor="appsell-active" className="text-xs cursor-pointer">
                Ativar integração
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border/30 p-3 mt-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-foreground">Eventos enviados automaticamente</p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li><strong>approved</strong> — Pagamento confirmado</li>
                  <li><strong>refunded</strong> — Reembolso processado</li>
                  <li><strong>chargedback</strong> — Contestação de compra</li>
                  <li><strong>subscription_reactivated</strong> — Assinatura reativada</li>
                  <li><strong>subscription_cancelled</strong> — Assinatura cancelada</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppSellIntegration;
