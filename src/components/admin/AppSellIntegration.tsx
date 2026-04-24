import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ExternalLink } from "lucide-react";
import IntegrationCard from "./IntegrationCard";
import appsellLogo from "@/assets/appsell-logo.webp";
import appsellCardLogo from "@/assets/appsell-logo.png";

const APPSELL_EVENTS = [
  { key: "approved", label: "Pagamento confirmado" },
  { key: "refunded", label: "Reembolso processado" },
  { key: "chargedback", label: "Contestação de compra" },
  { key: "subscription_reactivated", label: "Assinatura reativada" },
  { key: "subscription_cancelled", label: "Assinatura cancelada" },
];

const AppSellIntegration = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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

  const handleTestConnection = async () => {
    if (!user?.id || !token.trim()) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("appsell-notify", {
        body: { event: "test_connection", user_id: user.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("✅ Conexão com AppSell funcionando!");
      } else {
        toast.error("❌ AppSell retornou erro: " + (data?.error || `Status ${data?.status}`));
      }
    } catch (err: any) {
      toast.error("Erro ao testar: " + err.message);
    }
    setTesting(false);
  };

  // Render immediately — loading only affects background data hydration, not the card visibility

  return (
    <IntegrationCard
      logo={appsellLogo}
      cardLogo={appsellCardLogo}
      name="AppSell"
      description="Envie eventos de pagamento automaticamente para liberar e gerenciar acessos dos seus clientes."
      docsUrl="https://appsell-software.com/integracoes"
      docsLabel="appsell-software.com/integracoes"
      active={active}
      hasToken={!!token}
      token={token}
      onTokenChange={setToken}
      onActiveChange={setActive}
      onSave={handleSave}
      saving={saving}
      tokenPlaceholder='Cole aqui o token gerado no AppSell'
      tokenHint={
        <>
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
        </>
      }
      statusEvents={APPSELL_EVENTS}
      onTestConnection={handleTestConnection}
      testing={testing}
    />
  );
};

export default AppSellIntegration;
