import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Save, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CrispChat = () => {
  const { user } = useAuth();
  const [crispId, setCrispId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user?.id) loadCrisp();
  }, [user?.id]);

  const loadCrisp = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("checkout_settings")
      .select("crisp_website_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if ((data as any)?.crisp_website_id) setCrispId((data as any).crisp_website_id);
    setLoaded(true);
  };

  const extractCrispId = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();
    // If user pasted the full script tag, extract the CRISP_WEBSITE_ID
    const match = trimmed.match(/CRISP_WEBSITE_ID\s*=\s*["']([a-f0-9-]+)["']/i);
    if (match) return match[1];
    // If it's already a clean UUID-like ID
    if (/^[a-f0-9-]{30,50}$/i.test(trimmed)) return trimmed;
    return null;
  };

  const saveCrisp = async () => {
    if (!user?.id) return;
    setSaving(true);
    const extracted = extractCrispId(crispId) || null;

    const { data: existing } = await supabase
      .from("checkout_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("checkout_settings")
        .update({ crisp_website_id: trimmed } as any)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("checkout_settings")
        .insert({ user_id: user.id, crisp_website_id: trimmed } as any));
    }

    if (error) toast.error("Erro ao salvar Crisp");
    else toast.success(trimmed ? "Crisp ativado no checkout!" : "Crisp removido do checkout");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Crisp Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione um chat ao vivo no seu checkout para atender clientes em tempo real
        </p>
      </div>

      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground text-sm">Como funciona?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            O widget do Crisp aparecerá automaticamente em todos os seus checkouts, permitindo que seus clientes tirem dúvidas antes de finalizar a compra — aumentando suas conversões.
          </p>
        </CardContent>
      </Card>

      {loaded && (
        <Card className="border border-border/50 bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Configurar Crisp Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Cole seu Website ID para ativar o chat nos checkouts
                </p>
              </div>
              {crispId && <Badge className="ml-auto text-[10px]">Ativo</Badge>}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Cole seu CRISP_WEBSITE_ID aqui (ex: 1d36332d-054f-443b-...)"
                value={crispId}
                onChange={e => setCrispId(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={saveCrisp} disabled={saving} className="gap-1.5 shrink-0">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar
              </Button>
            </div>

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
              → Settings → Website Settings → copie o Website ID. Deixe vazio para desativar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrispChat;
