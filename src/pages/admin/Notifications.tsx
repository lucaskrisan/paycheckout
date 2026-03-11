import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Bell, Clock, Sparkles, FileText, TrendingUp, Loader2, Smartphone, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NotifSettings {
  send_pending: boolean;
  send_approved: boolean;
  show_value: string;
  show_product_name: boolean;
  show_utm_campaign: boolean;
  show_dashboard_name: boolean;
  notification_pattern: string;
  notification_sound: string;
  report_08: boolean;
  report_12: boolean;
  report_18: boolean;
  report_23: boolean;
}

const NOTIFICATION_SOUNDS = [
  { value: "kaching", label: "Ka-ching! 💰", emoji: "💰" },
  { value: "coin", label: "Moeda", emoji: "🪙" },
  { value: "cash", label: "Dinheiro", emoji: "💵" },
  { value: "bell", label: "Sino", emoji: "🔔" },
  { value: "success", label: "Sucesso", emoji: "✅" },
  { value: "magic", label: "Mágica", emoji: "✨" },
  { value: "pop", label: "Pop", emoji: "🎵" },
  { value: "none", label: "Sem som", emoji: "🔇" },
];

const defaultSettings: NotifSettings = {
  send_pending: false,
  send_approved: true,
  show_value: "commission",
  show_product_name: false,
  show_utm_campaign: false,
  show_dashboard_name: false,
  notification_pattern: "creative",
  notification_sound: "kaching",
  report_08: false,
  report_12: false,
  report_18: false,
  report_23: false,
};

const Notifications = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotifSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          send_pending: data.send_pending,
          send_approved: data.send_approved,
          show_value: data.show_value,
          show_product_name: data.show_product_name,
          show_utm_campaign: data.show_utm_campaign,
          show_dashboard_name: data.show_dashboard_name,
          notification_pattern: data.notification_pattern,
          notification_sound: data.notification_sound || 'kaching',
          report_08: data.report_08,
          report_12: data.report_12,
          report_18: data.report_18,
          report_23: data.report_23,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert(
        { user_id: user.id, ...settings, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas!");
    }
    setSaving(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        toast.success("App instalado com sucesso!");
      }
      setDeferredPrompt(null);
    }
  };

  const update = (key: keyof NotifSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewMessage = () => {
    if (settings.notification_pattern === "profit") {
      return { title: "Venda aprovada!", body: `Comissão: R$ 84,90` };
    }
    if (settings.notification_pattern === "detailed") {
      return {
        title: "💰 Nova venda!",
        body: `Produto XYZ • PIX • R$ 197,00\nCliente: João Silva`,
      };
    }
    // creative
    return {
      title: "🎉 Ka-ching! Mais uma venda!",
      body: `Caiu R$ 84,90 na conta! 🔥`,
    };
  };

  const preview = previewMessage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Notificações</h1>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Install PWA */}
      {!isInstalled && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Instalar App no Celular</p>
                <p className="text-sm text-muted-foreground">
                  Instale o PayCheckout como app para receber notificações push no celular.
                </p>
              </div>
            </div>
            {deferredPrompt ? (
              <Button onClick={handleInstall} className="shrink-0">
                Instalar App
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground shrink-0 max-w-[200px] text-right">
                Abra <strong>paycheckout.lovable.app</strong> no celular → Menu → "Adicionar à tela inicial"
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Notificações de Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações de Venda
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Seja notificado no app sempre que for realizada uma nova venda:
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="font-semibold text-foreground">Opções</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Enviar vendas pendentes</Label>
                <Select
                  value={settings.send_pending ? "enabled" : "disabled"}
                  onValueChange={(v) => update("send_pending", v === "enabled")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Desabilitado</SelectItem>
                    <SelectItem value="enabled">Habilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Enviar vendas aprovadas</Label>
                <Select
                  value={settings.send_approved ? "enabled" : "disabled"}
                  onValueChange={(v) => update("send_approved", v === "enabled")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Desabilitado</SelectItem>
                    <SelectItem value="enabled">Habilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor da venda</Label>
                <Select value={settings.show_value} onValueChange={(v) => update("show_value", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commission">Comissão</SelectItem>
                    <SelectItem value="full">Valor completo</SelectItem>
                    <SelectItem value="hidden">Esconder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do produto</Label>
                <Select
                  value={settings.show_product_name ? "show" : "hide"}
                  onValueChange={(v) => update("show_product_name", v === "show")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Esconder</SelectItem>
                    <SelectItem value="show">Mostrar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor de utm_campaign</Label>
                <Select
                  value={settings.show_utm_campaign ? "show" : "hide"}
                  onValueChange={(v) => update("show_utm_campaign", v === "show")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Esconder</SelectItem>
                    <SelectItem value="show">Mostrar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do dashboard</Label>
                <Select
                  value={settings.show_dashboard_name ? "show" : "hide"}
                  onValueChange={(v) => update("show_dashboard_name", v === "show")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Esconder</SelectItem>
                    <SelectItem value="show">Mostrar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Prévia de Notificação</Label>
              <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">{preview.title}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{preview.body}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificações de Relatório */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Notificações de Relatório
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure as notificações de relatório que quer visualizar:
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="font-semibold text-foreground">Horários</h3>

            <div className="space-y-4">
              {[
                { key: "report_08" as const, label: "Notificação das 08:00" },
                { key: "report_12" as const, label: "Notificação das 12:00" },
                { key: "report_18" as const, label: "Notificação das 18:00" },
                { key: "report_23" as const, label: "Notificação das 23:00" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label>{item.label}</Label>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(v) => update(item.key, v)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Padrão de Notificação</h3>
              <RadioGroup
                value={settings.notification_pattern}
                onValueChange={(v) => update("notification_pattern", v)}
                className="space-y-2"
              >
                <label
                  className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                    settings.notification_pattern === "profit"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="profit" />
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status de Lucro</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                    settings.notification_pattern === "detailed"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="detailed" />
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Resumo Detalhado</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                    settings.notification_pattern === "creative"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="creative" />
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Notificações Criativas</span>
                </label>
              </RadioGroup>
            </div>

            {/* Report Preview */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Prévia de Notificação</Label>
              {settings.report_08 || settings.report_12 || settings.report_18 || settings.report_23 ? (
                <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">📊 Relatório do dia</p>
                    <p className="text-xs text-muted-foreground">Vendas: 12 • Faturamento: R$ 2.364,00</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Prévia indisponível. Habilite ao menos um horário de notificação para visualizar a prévia.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
