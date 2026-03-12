import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Webhook, Plus, Trash2, Copy, Eye, EyeOff, Loader2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_EVENTS = [
  { value: "order.paid", label: "Venda aprovada" },
  { value: "order.refunded", label: "Reembolso" },
  { value: "order.cancelled", label: "Cancelamento" },
];

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  created_at: string;
}

export default function Webhooks() {
  const { user } = useAuth();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set(["order.paid"]));
  const [adding, setAdding] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("webhook_endpoints" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setEndpoints((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addEndpoint = async () => {
    if (!user || !newUrl.trim()) return;
    if (!newUrl.startsWith("http")) { toast.error("URL deve começar com http:// ou https://"); return; }
    if (newEvents.size === 0) { toast.error("Selecione pelo menos um evento"); return; }

    setAdding(true);
    const { error } = await supabase
      .from("webhook_endpoints" as any)
      .insert({
        user_id: user.id,
        url: newUrl.trim(),
        events: Array.from(newEvents),
      });

    if (error) {
      toast.error("Erro ao adicionar webhook");
      console.error(error);
    } else {
      toast.success("Webhook adicionado!");
      setNewUrl("");
      setNewEvents(new Set(["order.paid"]));
      load();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase
      .from("webhook_endpoints" as any)
      .update({ active: !active })
      .eq("id", id);
    setEndpoints((prev) => prev.map((e) => e.id === id ? { ...e, active: !active } : e));
  };

  const deleteEndpoint = async (id: string) => {
    await supabase.from("webhook_endpoints" as any).delete().eq("id", id);
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
    toast.success("Webhook removido");
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copiado!");
  };

  const toggleEventOnNew = (event: string) => {
    setNewEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Receba notificações automáticas via POST em URLs externas (Zapier, N8N, Make, etc).
        </p>
      </div>

      {/* Add new webhook */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Adicionar Webhook</h2>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="https://hooks.zapier.com/..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Eventos:</p>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={newEvents.has(ev.value)}
                    onCheckedChange={() => toggleEventOnNew(ev.value)}
                  />
                  <span className="text-sm text-foreground">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={addEndpoint} disabled={adding || !newUrl.trim()} className="gap-2">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
            Adicionar
          </Button>
        </div>
      </Card>

      {/* Existing endpoints */}
      {endpoints.length === 0 ? (
        <Card className="p-8 text-center">
          <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum webhook configurado ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <Card key={ep.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono text-foreground truncate">{ep.url}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={ep.active} onCheckedChange={() => toggleActive(ep.id, ep.active)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEndpoint(ep.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ep.events.map((ev) => (
                  <Badge key={ev} variant="outline" className="text-xs">
                    {AVAILABLE_EVENTS.find((a) => a.value === ev)?.label || ev}
                  </Badge>
                )))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Secret:</span>
                <code className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded">
                  {showSecrets.has(ep.id) ? ep.secret : "••••••••••••••••"}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowSecrets((prev) => {
                    const next = new Set(prev);
                    if (next.has(ep.id)) next.delete(ep.id);
                    else next.add(ep.id);
                    return next;
                  })}
                >
                  {showSecrets.has(ep.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copySecret(ep.secret)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Documentation */}
      <Card className="p-5 space-y-3 bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">Como funciona:</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Quando um evento ocorre, enviamos um <strong>POST</strong> para cada URL ativa</li>
          <li>O header <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> contém a assinatura HMAC-SHA256 do body usando seu secret</li>
          <li>O header <code className="bg-muted px-1 rounded">X-Webhook-Event</code> contém o nome do evento</li>
          <li>O body contém: evento, timestamp, dados do pedido, cliente e produto</li>
          <li>Compatível com <strong>Zapier</strong>, <strong>N8N</strong>, <strong>Make</strong> e qualquer receptor de webhooks</li>
        </ul>
      </Card>
    </div>
  );
}
