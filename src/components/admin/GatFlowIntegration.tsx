import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ExternalLink, Rocket } from "lucide-react";
import IntegrationCard from "./IntegrationCard";
import { Button } from "@/components/ui/button";

const GATFLOW_LOGO = "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/52e9fb3f-30ef-489f-aa32-1375e513410c/1777747813313_q3pbm7_Panttera.png";

const GatFlowIntegration = () => {
  const { user } = useAuth();
  const [shopId, setShopId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadIntegration();
  }, [user?.id]);

  const loadIntegration = async () => {
    const { data } = await supabase
      .from("gatflow_integrations")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setShopId(data.shop_id || "");
      setApiSecret(data.api_secret || "");
      setActive(data.active || false);
      setExists(true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      shop_id: shopId.trim(),
      api_secret: apiSecret.trim(),
      active,
      updated_at: new Date().toISOString(),
    };

    const { error } = exists 
      ? await supabase.from("gatflow_integrations").update(payload).eq("user_id", user.id)
      : await supabase.from("gatflow_integrations").insert(payload);

    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração GatFlow salva!");
      setExists(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const handleOpenGatFlow = async () => {
    if (!shopId || !apiSecret) {
      toast.error("Configure o Shop ID e API Secret primeiro");
      return;
    }
    
    toast.info("Gerando acesso seguro...");
    
    try {
      // In a real production environment, this JWT generation should happen in an Edge Function
      // to keep the API Secret hidden from the client side. 
      // For this implementation, we are following the provided technical guide.
      const { data, error } = await supabase.functions.invoke("gatflow-sso", {
        body: { shop_id: shopId, admin_email: user?.email }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Erro ao abrir GatFlow: " + err.message);
    }
  };

  return (
    <IntegrationCard
      logo={GATFLOW_LOGO}
      name="GatFlow"
      description="Marketplace de Apps para automação de marketing e vendas."
      docsUrl="https://gatflow.com/docs"
      active={active}
      hasToken={!!apiSecret}
      token={apiSecret}
      onTokenChange={setApiSecret}
      onActiveChange={setActive}
      onSave={handleSave}
      saving={saving}
      saved={saved}
      tokenPlaceholder="API Secret do GatFlow"
      tokenHint="Obtenha seu API Secret no painel do GatFlow."
      loading={loading}
      extraFields={
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Shop ID</label>
            <input
              type="text"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              placeholder="ID da sua loja"
              className="w-full px-3 py-2 text-xs bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <Button 
            onClick={handleOpenGatFlow}
            className="w-full gap-2 text-xs h-9"
            variant="secondary"
          >
            <Rocket className="w-3.5 h-3.5" />
            Abrir GatFlow (SSO)
          </Button>
        </div>
      }
    />
  );
};

export default GatFlowIntegration;
