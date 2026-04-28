import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Plus, Trash2, Activity, Shield, Zap, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALL_EVENTS = ["Purchase", "InitiateCheckout", "AddPaymentInfo", "Lead", "ViewContent", "PageView"];

export default function PixelMirrors() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    pixel_id: "",
    capi_token: "",
    fire_on_events: ALL_EVENTS,
    event_source_url_override: "",
  });

  const { data: mirrors, isLoading } = useQuery({
    queryKey: ["mirror_pixels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mirror_pixels" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.pixel_id.trim() || !form.capi_token.trim()) {
        throw new Error("Pixel ID e Token CAPI são obrigatórios");
      }
      const { error } = await supabase.from("mirror_pixels" as any).insert({
        label: form.label.trim() || "Pixel Espelho",
        pixel_id: form.pixel_id.trim(),
        capi_token: form.capi_token.trim(),
        fire_on_events: form.fire_on_events,
        event_source_url_override: form.event_source_url_override.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pixel espelho criado");
      setOpen(false);
      setForm({ label: "", pixel_id: "", capi_token: "", fire_on_events: ALL_EVENTS, event_source_url_override: "" });
      qc.invalidateQueries({ queryKey: ["mirror_pixels"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("mirror_pixels" as any).update({ active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mirror_pixels"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mirror_pixels" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["mirror_pixels"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      fire_on_events: f.fire_on_events.includes(ev)
        ? f.fire_on_events.filter((x) => x !== ev)
        : [...f.fire_on_events, ev],
    }));
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Pixels Espelho (CAPI-only)
          </h1>
          <p className="text-muted-foreground mt-1">
            Migração de pixels sem expor o domínio à categorização do Meta.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Pixel Espelho</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Pixel Espelho</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Rótulo (interno)</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Pixel BM Novo Procrastinação" />
              </div>
              <div>
                <Label>Pixel ID *</Label>
                <Input value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} placeholder="123456789012345" />
              </div>
              <div>
                <Label>Token CAPI *</Label>
                <Input type="password" value={form.capi_token} onChange={(e) => setForm({ ...form, capi_token: e.target.value })} placeholder="EAAxxxxxx..." />
              </div>
              <div>
                <Label>event_source_url override (opcional)</Label>
                <Input value={form.event_source_url_override} onChange={(e) => setForm({ ...form, event_source_url_override: e.target.value })} placeholder="https://app.panttera.com.br/" />
                <p className="text-xs text-muted-foreground mt-1">Se vazio, usa o do evento original.</p>
              </div>
              <div>
                <Label>Eventos a espelhar</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALL_EVENTS.map((ev) => (
                    <Badge
                      key={ev}
                      variant={form.fire_on_events.includes(ev) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleEvent(ev)}
                    >
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription className="space-y-1 mt-2">
          <p>• Todo evento que a plataforma envia ao Meta CAPI é <strong>duplicado</strong> para os pixels espelho ativos abaixo.</p>
          <p>• Os pixels espelho recebem <strong>apenas via servidor</strong> (CAPI puro). O fbevents.js nunca dispara para eles no browser.</p>
          <p>• Como o Meta nunca recebe um <em>pageload</em> destes pixels, ele <strong>não consegue crawlear o domínio</strong> para categorizar como "Financeiro".</p>
          <p>• Use isso para migrar de pixels antigos sem perder tracking. EMQ esperado: 6-8/10 (com email/phone hasheados que já temos).</p>
        </AlertDescription>
      </Alert>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid gap-4">
        {mirrors?.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {m.label}
                    {m.active ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Pausado</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono">Pixel: {m.pixel_id}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={m.active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: m.id, active: v })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remover este pixel espelho?")) deleteMutation.mutate(m.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {(m.fire_on_events as string[]).map((ev) => (
                  <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Eventos enviados:</span>
                  <strong>{m.total_events_sent || 0}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Último evento: </span>
                  <strong>
                    {m.last_event_at
                      ? format(new Date(m.last_event_at), "dd/MM HH:mm", { locale: ptBR })
                      : "—"}
                  </strong>
                </div>
                {m.event_source_url_override && (
                  <div className="col-span-full text-xs text-muted-foreground truncate">
                    URL override: <code>{m.event_source_url_override}</code>
                  </div>
                )}
              </div>
              {m.last_meta_response?.error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    Último erro Meta: {JSON.stringify(m.last_meta_response.error)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}

        {mirrors?.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum pixel espelho cadastrado.</p>
              <p className="text-xs mt-1">Crie um para começar a migrar tracking sem risco de categorização.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
