// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, ShoppingCart, CreditCard, QrCode, Send, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  { key: "confirmacao", label: "Confirmação de Pagamento", description: "Envia mensagem automática quando o pagamento é confirmado.", icon: CreditCard },
  { key: "boas_vindas", label: "Boas-vindas", description: "Mensagem de boas-vindas para novos clientes.", icon: UserPlus },
  { key: "abandono", label: "Recuperação de Carrinho", description: "Envio automático para carrinhos abandonados.", icon: ShoppingCart },
  { key: "lembrete_pix", label: "Lembrete PIX", description: "Lembrete automático para PIX pendentes.", icon: QrCode },
  { key: "acesso", label: "Entrega de Acesso", description: "Envia link de acesso por WhatsApp após a compra.", icon: Send },
  { key: "geral", label: "Geral", description: "Templates de categoria geral.", icon: MessageSquare },
];

interface FeatureFlag {
  feature: string;
  enabled: boolean;
}

interface Props {
  tenantId: string;
}

const WhatsAppFeatureFlags = ({ tenantId }: Props) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_feature_flags")
      .select("feature, enabled")
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error fetching flags:", error);
    }

    const map: Record<string, boolean> = {};
    for (const f of FEATURES) map[f.key] = false;
    for (const row of (data || []) as FeatureFlag[]) {
      map[row.feature] = row.enabled;
    }
    setFlags(map);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const toggleFeature = async (feature: string, enabled: boolean) => {
    setToggling(feature);
    const { error } = await supabase
      .from("whatsapp_feature_flags")
      .upsert(
        { tenant_id: tenantId, feature, enabled, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,feature" }
      );

    if (error) {
      toast.error("Erro ao atualizar configuração");
      console.error(error);
    } else {
      setFlags((prev) => ({ ...prev, [feature]: enabled }));
      toast.success(`${enabled ? "Ativado" : "Desativado"}: ${FEATURES.find((f) => f.key === feature)?.label}`);
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Automações WhatsApp
          <Badge variant="outline" className="ml-auto text-xs">Super Admin</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground mb-4">
          Ative ou desative cada automação individualmente. As mensagens só serão enviadas se o produtor tiver WhatsApp conectado e um template ativo na categoria correspondente.
        </p>
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const isEnabled = flags[f.key] ?? false;
          const isToggling = toggling === f.key;

          return (
            <div
              key={f.key}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 px-4 py-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {isToggling && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => toggleFeature(f.key, checked)}
                  disabled={isToggling}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WhatsAppFeatureFlags;
