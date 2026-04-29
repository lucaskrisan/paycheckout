import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Shield, Key, Webhook, Globe } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  client_id: string;
  client_secret: string;
  sso_secret: string;
  webhook_secret: string;
  webhook_url: string;
  is_installed?: boolean;
}

const Marketplace = () => {
  const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const { data: apps, isLoading, refetch } = useQuery({
    queryKey: ["marketplace-apps"],
    queryFn: async () => {
      const { data: appsData, error: appsError } = await supabase
        .from("marketplace_apps")
        .select("*")
        .eq("active", true);

      if (appsError) throw appsError;

      const { data: installations } = await supabase
        .from("marketplace_app_installations")
        .select("app_id")
        .eq("active", true);

      return (appsData as MarketplaceApp[]).map(app => ({
        ...app,
        is_installed: installations?.some(i => i.app_id === app.id)
      }));
    },
  });

  const handleInstall = async (app: MarketplaceApp) => {
    try {
      setLoadingAction("install");
      const { data, error } = await supabase.functions.invoke("marketplace-auth", {
        body: { action: "generate-install-code", appId: app.id }
      });

      if (error) throw error;
      window.open(data.url, "_blank");
      toast.info("Finalize a instalação na página do parceiro.");
      
      // Polling simples para detectar instalação
      const interval = setInterval(async () => {
        const { data: check } = await supabase
          .from("marketplace_app_installations")
          .select("id")
          .eq("app_id", app.id)
          .single();
        if (check) {
          refetch();
          clearInterval(interval);
          toast.success("App instalado com sucesso!");
        }
      }, 3000);
      
      setTimeout(() => clearInterval(interval), 60000);
    } catch (err) {
      toast.error("Erro ao iniciar instalação.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenApp = async (app: MarketplaceApp) => {
    try {
      setLoadingAction("open");
      const { data, error } = await supabase.functions.invoke("marketplace-auth", {
        body: { action: "generate-sso-url", appId: app.id }
      });

      if (error) throw error;
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error("Erro ao gerar acesso seguro.");
    } finally {
      setLoadingAction(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado com sucesso!`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Marketplace de Apps</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações de parceiros e ferramentas externas do ecossistema Panttera
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps?.map((app) => (
          <Card 
            key={app.id} 
            className="group cursor-pointer hover:border-primary/40 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm border-border/40"
            onClick={() => setSelectedApp(app)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  {app.logo_url ? (
                    <img src={app.logo_url} alt={app.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Globe className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{app.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {app.is_installed ? (
                <Button variant="default" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={(e) => { e.stopPropagation(); handleOpenApp(app); }}>
                  Abrir Dashboard
                </Button>
              ) : (
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={(e) => { e.stopPropagation(); handleInstall(app); }}>
                  Instalar App
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedApp && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Configurações: {selectedApp.name}
            </h2>
            <Button variant="ghost" onClick={() => setSelectedApp(null)} className="text-muted-foreground">
              Fechar
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* OAuth2 Credentials */}
            <Card className="bg-card/30 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Credenciais OAuth2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Client ID</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/20 p-2.5 rounded border border-white/5 text-xs truncate">
                      {selectedApp.client_id}
                    </code>
                    <Button size="sm" variant="secondary" onClick={() => copyToClipboard(selectedApp.client_id, "Client ID")}>
                      Copiar
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Client Secret</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/20 p-2.5 rounded border border-white/5 text-xs truncate">
                      {selectedApp.client_secret}
                    </code>
                    <Button size="sm" variant="secondary" onClick={() => copyToClipboard(selectedApp.client_secret, "Client Secret")}>
                      Copiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SSO & Webhooks */}
            <Card className="bg-card/30 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-primary" />
                  Segredos de Comunicação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">PANTTERA_SHARED_SECRET (SSO JWT)</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/20 p-2.5 rounded border border-white/5 text-xs truncate">
                      {selectedApp.sso_secret}
                    </code>
                    <Button size="sm" variant="secondary" onClick={() => copyToClipboard(selectedApp.sso_secret, "SSO Secret")}>
                      Copiar
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">PANTTERA_WEBHOOK_SECRET</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black/20 p-2.5 rounded border border-white/5 text-xs truncate">
                      {selectedApp.webhook_secret}
                    </code>
                    <Button size="sm" variant="secondary" onClick={() => copyToClipboard(selectedApp.webhook_secret, "Webhook Secret")}>
                      Copiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="font-bold text-foreground">Acessar {selectedApp.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Entre no painel da ferramenta com Single Sign-On seguro da Panttera.
                  </p>
                </div>
                <Button 
                  className="w-full md:w-auto h-12 px-8 font-bold gap-2" 
                  disabled={!selectedApp.is_installed || loadingAction === "open"}
                  onClick={() => handleOpenApp(selectedApp)}
                >
                  {loadingAction === "open" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Abrir Dashboard"}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase">URL Base da API (Produção)</h4>
              <p className="text-sm font-mono text-primary">https://ck.panttera.com.br/functions/v1</p>
            </div>
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase">Webhook Endpoint (Configurado)</h4>
              <p className="text-sm font-mono text-white truncate">{selectedApp.webhook_url}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
