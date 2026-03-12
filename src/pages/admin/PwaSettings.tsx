import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Smartphone, Palette, Bell, Image, Save, Loader2, ArrowLeft, Upload, Eye,
} from "lucide-react";

interface PwaSettingsData {
  app_name: string;
  short_name: string;
  description: string;
  theme_color: string;
  background_color: string;
  icon_192_url: string;
  icon_512_url: string;
  splash_image_url: string;
  notification_title: string;
  notification_body: string;
  notification_icon_url: string;
}

const defaults: PwaSettingsData = {
  app_name: "PayCheckout",
  short_name: "PayCheckout",
  description: "Plataforma de vendas",
  theme_color: "#16a34a",
  background_color: "#ffffff",
  icon_192_url: "",
  icon_512_url: "",
  splash_image_url: "",
  notification_title: "💰 Nova venda!",
  notification_body: "Você recebeu uma nova venda de {product} no valor de {value}",
  notification_icon_url: "",
};

const PwaSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PwaSettingsData>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("pwa_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          app_name: (data as any).app_name || defaults.app_name,
          short_name: (data as any).short_name || defaults.short_name,
          description: (data as any).description || defaults.description,
          theme_color: (data as any).theme_color || defaults.theme_color,
          background_color: (data as any).background_color || defaults.background_color,
          icon_192_url: (data as any).icon_192_url || "",
          icon_512_url: (data as any).icon_512_url || "",
          splash_image_url: (data as any).splash_image_url || "",
          notification_title: (data as any).notification_title || defaults.notification_title,
          notification_body: (data as any).notification_body || defaults.notification_body,
          notification_icon_url: (data as any).notification_icon_url || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleUpload = async (field: keyof PwaSettingsData, file: File) => {
    if (!user) return;
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/pwa-${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      setSettings((prev) => ({ ...prev, [field]: urlData.publicUrl }));
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    }
    setUploading(null);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pwa_settings" as any)
        .upsert(
          {
            user_id: user.id,
            ...settings,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" }
        );

      if (error) throw error;
      toast.success("Configurações salvas! As mudanças serão aplicadas automaticamente.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
    setSaving(false);
  };

  const ImageUploadField = ({
    label,
    field,
    hint,
  }: {
    label: string;
    field: keyof PwaSettingsData;
    hint: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-3">
        {settings[field] ? (
          <img
            src={settings[field] as string}
            alt={label}
            className="w-16 h-16 rounded-lg border border-border object-contain bg-muted"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/50">
            <Image className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(field, file);
              }}
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors">
              {uploading === field ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Enviar imagem
            </span>
          </label>
          {settings[field] && (
            <Input
              value={settings[field] as string}
              onChange={(e) => setSettings((prev) => ({ ...prev, [field]: e.target.value }))}
              className="text-xs h-7"
              placeholder="Ou cole a URL da imagem"
            />
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do App</h1>
            <p className="text-sm text-muted-foreground">
              Personalize o ícone, cores, splash screen e notificações do seu app mobile
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card className="border border-border shadow-none">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Identidade do App</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nome do app</Label>
                  <Input
                    value={settings.app_name}
                    onChange={(e) => setSettings((p) => ({ ...p, app_name: e.target.value }))}
                    placeholder="PayCheckout"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Nome curto</Label>
                  <Input
                    value={settings.short_name}
                    onChange={(e) => setSettings((p) => ({ ...p, short_name: e.target.value }))}
                    placeholder="PayCheckout"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Descrição</Label>
                <Input
                  value={settings.description}
                  onChange={(e) => setSettings((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Plataforma de vendas"
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="border border-border shadow-none">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Cores</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cor do tema</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.theme_color}
                      onChange={(e) => setSettings((p) => ({ ...p, theme_color: e.target.value }))}
                      className="w-10 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input
                      value={settings.theme_color}
                      onChange={(e) => setSettings((p) => ({ ...p, theme_color: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Cor de fundo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.background_color}
                      onChange={(e) =>
                        setSettings((p) => ({ ...p, background_color: e.target.value }))
                      }
                      className="w-10 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input
                      value={settings.background_color}
                      onChange={(e) =>
                        setSettings((p) => ({ ...p, background_color: e.target.value }))
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Icons & Splash */}
          <Card className="border border-border shadow-none">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Ícones e Splash Screen</h3>
              </div>

              <ImageUploadField
                label="Ícone 192x192"
                field="icon_192_url"
                hint="Ícone pequeno usado na home screen do celular. PNG, 192x192px."
              />
              <ImageUploadField
                label="Ícone 512x512"
                field="icon_512_url"
                hint="Ícone grande usado na splash screen. PNG, 512x512px."
              />
              <ImageUploadField
                label="Splash Screen"
                field="splash_image_url"
                hint="Imagem exibida ao abrir o app. Recomendado: 1242x2688px."
              />
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border border-border shadow-none">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Template de Notificação</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: <code className="bg-muted px-1 rounded">{"{product}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{value}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{customer}"}</code>
              </p>

              <div className="space-y-1.5">
                <Label className="text-sm">Título da notificação</Label>
                <Input
                  value={settings.notification_title}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, notification_title: e.target.value }))
                  }
                  placeholder="💰 Nova venda!"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Corpo da notificação</Label>
                <Textarea
                  value={settings.notification_body}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, notification_body: e.target.value }))
                  }
                  placeholder="Você recebeu uma nova venda de {product} no valor de {value}"
                  rows={3}
                />
              </div>

              <ImageUploadField
                label="Ícone da notificação"
                field="notification_icon_url"
                hint="Ícone exibido na notificação push. PNG, 96x96px."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          {/* Phone preview */}
          <Card className="border border-border shadow-none sticky top-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Preview</h3>
              </div>

              {/* App icon preview */}
              <div className="flex flex-col items-center gap-3 py-6 bg-muted/30 rounded-xl mb-4">
                <div
                  className="w-16 h-16 rounded-2xl border-2 border-border overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: settings.background_color }}
                >
                  {settings.icon_192_url ? (
                    <img
                      src={settings.icon_192_url}
                      alt="App icon"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl">📱</span>
                  )}
                </div>
                <span className="text-xs font-medium text-foreground">{settings.short_name}</span>
              </div>

              {/* Notification preview */}
              <div className="bg-card border border-border rounded-xl p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Notificação Push
                </p>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {settings.notification_icon_url ? (
                      <img
                        src={settings.notification_icon_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {settings.notification_title || "Título"}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {(settings.notification_body || "Corpo da notificação")
                        .replace("{product}", "Curso XYZ")
                        .replace("{value}", "R$ 197,00")
                        .replace("{customer}", "João")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Theme bar preview */}
              <div className="mt-4 rounded-lg overflow-hidden">
                <div
                  className="h-8 flex items-center justify-center"
                  style={{ backgroundColor: settings.theme_color }}
                >
                  <span className="text-white text-xs font-medium">Barra de tema</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center px-2">
            ⚡ As mudanças são aplicadas automaticamente. No mobile, feche e reabra o app para ver
            as atualizações.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PwaSettings;
