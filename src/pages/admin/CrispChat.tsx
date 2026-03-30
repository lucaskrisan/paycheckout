import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Save, Loader2, ExternalLink, ShoppingCart, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CrispChat = () => {
  const { user } = useAuth();
  const [crispId, setCrispId] = useState("");
  const [enabledCheckout, setEnabledCheckout] = useState(true);
  const [enabledLanding, setEnabledLanding] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user?.id) loadCrisp();
  }, [user?.id]);

  const loadCrisp = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("checkout_settings")
      .select("crisp_website_id, crisp_enabled_checkout, crisp_enabled_landing")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setCrispId((data as any).crisp_website_id || "");
      setEnabledCheckout((data as any).crisp_enabled_checkout ?? true);
      setEnabledLanding((data as any).crisp_enabled_landing ?? true);
    }
    setLoaded(true);
  };

  const extractCrispId = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();
    const match = trimmed.match(/CRISP_WEBSITE_ID\s*=\s*["']([a-f0-9-]+)["']/i);
    if (match) return match[1];
    if (/^[a-f0-9-]{30,50}$/i.test(trimmed)) return trimmed;
    return null;
  };

  const saveCrisp = async () => {
    if (!user?.id) return;
    setSaving(true);
    const extracted = extractCrispId(crispId) || null;

    const payload = {
      crisp_website_id: extracted,
      crisp_enabled_checkout: enabledCheckout,
      crisp_enabled_landing: enabledLanding,
    };

    const { data: existing } = await supabase
      .from("checkout_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("checkout_settings")
        .update(payload as any)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("checkout_settings")
        .insert({ user_id: user.id, ...payload } as any));
    }

    if (error) toast.error("Erro ao salvar Crisp");
    else toast.success("Configurações do Crisp salvas!");
    if (extracted) setCrispId(extracted);
    setSaving(false);
  };

  const hasId = !!extractCrispId(crispId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Crisp Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione um chat ao vivo para atender clientes em tempo real
        </p>
      </div>

      <Card className="border-border/30 bg-muted/30">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground text-sm">Como funciona?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            O widget do Crisp aparece automaticamente nas páginas selecionadas, permitindo que seus clientes tirem dúvidas — aumentando suas conversões.
          </p>
        </CardContent>
      </Card>

      {loaded && (
        <Card className="border border-border/50 bg-card">
          <CardContent className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">Configurar Crisp Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Cole seu Website ID e escolha onde o chat aparece
                </p>
              </div>
              {hasId && <Badge className="text-[10px]">Configurado</Badge>}
            </div>

            {/* Website ID */}
            <div className="space-y-1.5">
              <Label className="text-xs">Website ID</Label>
              <Input
                placeholder="Cole seu CRISP_WEBSITE_ID aqui (ex: 1d36332d-054f-443b-...)"
                value={crispId}
                onChange={e => setCrispId(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Acesse{" "}
                <a
                  href="https://app.crisp.chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-0.5"
                >
                  app.crisp.chat <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                → Settings → Website Settings → copie o Website ID.
              </p>
            </div>

            {/* Toggles */}
            <div className="rounded-lg border border-border/40 divide-y divide-border/40">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Checkout</p>
                    <p className="text-[10px] text-muted-foreground">Exibir chat na página de pagamento</p>
                  </div>
                </div>
                <Switch
                  checked={enabledCheckout}
                  onCheckedChange={setEnabledCheckout}
                  disabled={!hasId}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Página de Vendas</p>
                    <p className="text-[10px] text-muted-foreground">Exibir chat na landing page</p>
                  </div>
                </div>
                <Switch
                  checked={enabledLanding}
                  onCheckedChange={setEnabledLanding}
                  disabled={!hasId}
                />
              </div>
            </div>

            <Button size="sm" onClick={saveCrisp} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrispChat;
