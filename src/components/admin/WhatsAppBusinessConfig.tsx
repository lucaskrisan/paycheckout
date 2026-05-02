import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Save, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

const WhatsAppBusinessConfig = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    whatsapp_business_id: "",
    whatsapp_access_token: "",
    whatsapp_phone_number_id: "",
    status: "inactive"
  });

  useEffect(() => {
    if (!user) return;
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("whatsapp_configs")
          .select("*")
          .eq("tenant_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setConfig({
            whatsapp_business_id: data.whatsapp_business_id || "",
            whatsapp_access_token: data.whatsapp_access_token || "",
            whatsapp_phone_number_id: data.whatsapp_phone_number_id || "",
            status: data.status || "inactive"
          });
        }
      } catch (err) {
        console.error("Erro ao carregar config:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_configs")
        .upsert({
          tenant_id: user.id,
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Configuração da Meta Business salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-gold" />
    </div>
  );

  return (
    <Card className="border-gold/20 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <ShieldCheck className="w-32 h-32" />
      </div>
      <CardHeader className="bg-gold/5 border-b border-gold/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold" />
              Meta Business API (WhatsApp Cloud)
            </CardTitle>
            <CardDescription>
              Conecte sua conta oficial da Meta para disparos via API oficial.
            </CardDescription>
          </div>
          <Badge variant={config.status === "active" ? "default" : "secondary"} className={config.status === "active" ? "bg-emerald-500" : ""}>
            {config.status === "active" ? "Conectado" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_id">WhatsApp Business Account ID</Label>
              <Input 
                id="business_id"
                placeholder="Ex: 105234567890123"
                value={config.whatsapp_business_id}
                onChange={(e) => setConfig({...config, whatsapp_business_id: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_id">Phone Number ID</Label>
              <Input 
                id="phone_id"
                placeholder="Ex: 109876543210987"
                value={config.whatsapp_phone_number_id}
                onChange={(e) => setConfig({...config, whatsapp_phone_number_id: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access_token">System User Access Token (Permanent)</Label>
            <Input 
              id="access_token"
              type="password"
              placeholder="EAAG..."
              value={config.whatsapp_access_token}
              onChange={(e) => setConfig({...config, whatsapp_access_token: e.target.value})}
            />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Use um token de "System User" com permissões de whatsapp_business_messaging.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <a 
              href="https://developers.facebook.com/apps/" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              Abrir Meta Developers <ExternalLink className="w-3 h-3" />
            </a>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-gold hover:bg-gold/90 text-black gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Configuração
            </Button>
          </div>
        </form>

        {config.whatsapp_access_token && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Pronto para Validação</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  As credenciais foram salvas. O próximo passo será o teste de envio via MCP.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppBusinessConfig;
