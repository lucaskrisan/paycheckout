// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Webhook, Plus, Trash2, Copy, Eye, EyeOff, Loader2, ExternalLink,
  Send, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AVAILABLE_EVENTS = [
  { value: "payment.approved", label: "Pagamento Aprovado" },
  { value: "payment.failed", label: "Pagamento Falhou" },
  { value: "payment.refunded", label: "Reembolso" },
  { value: "subscription.created", label: "Assinatura Criada" },
  { value: "subscription.canceled", label: "Assinatura Cancelada" },
  { value: "checkout.completed", label: "Checkout Concluído" },
  { value: "order.paid", label: "Venda Aprovada (legacy)" },
  { value: "order.refunded", label: "Reembolso (legacy)" },
  { value: "order.cancelled", label: "Cancelamento (legacy)" },
];

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  created_at: string;
  product_id: string | null;
  description: string | null;
}

interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  event_id: string;
  status: string;
  attempt: number;
  max_attempts: number;
  last_response_status: number | null;
  last_response_body: string | null;
  last_error: string | null;
  payload: any;
  created_at: string;
  completed_at: string | null;
}

export default function Webhooks() {
  const { user } = useAuth();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set(["payment.approved"]));
  const [newProductId, setNewProductId] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");
  const [testing, setTesting] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("endpoints");

  const load = useCallback(async () => {
    if (!user) return;
    const [epRes, dlRes, prodRes] = await Promise.all([
      supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),
    ]);
    setEndpoints((epRes.data as any[]) || []);
    setDeliveries((dlRes.data as any[]) || []);
    setProducts((prodRes.data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addEndpoint = async () => {
    if (!user || !newUrl.trim()) return;
    if (!newUrl.startsWith("http")) { toast.error("URL deve começar com http:// ou https://"); return; }
    if (newEvents.size === 0) { toast.error("Selecione pelo menos um evento"); return; }

    setAdding(true);
    const { error } = await supabase
      .from("webhook_endpoints")
      .insert({
        user_id: user.id,
        url: newUrl.trim(),
        events: Array.from(newEvents),
        product_id: newProductId === "all" ? null : newProductId,
        description: newDescription.trim() || null,
      });

    if (error) {
      toast.error("Erro ao adicionar webhook");
      console.error(error);
    } else {
      toast.success("Webhook adicionado!");
      setNewUrl("");
      setNewDescription("");
      setNewEvents(new Set(["payment.approved"]));
      setNewProductId("all");
      load();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("webhook_endpoints").update({ active: !active }).eq("id", id);
    setEndpoints((prev) => prev.map((e) => e.id === id ? { ...e, active: !active } : e));
  };

  const deleteEndpoint = async (id: string) => {
    await supabase.from("webhook_endpoints").delete().eq("id", id);
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
      if (next.has(event)) next.delete(event); else next.add(event);
      return next;
    });
  };

  const testWebhook = async (endpointId: string) => {
    setTesting(endpointId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("webhook-test", {
        body: { endpoint_id: endpointId, event_type: "payment.approved" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.data?.success) {
        toast.success(`Teste enviado! Status: ${res.data.status}`);
      } else {
        toast.error(`Teste falhou: ${res.data?.response || res.error?.message}`);
      }
      load();
    } catch (err) {
      toast.error("Erro ao testar webhook");
    }
    setTesting(null);
  };

  const resendDelivery = async (deliveryId: string) => {
    setResending(deliveryId);
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    // Reset to retrying
    await supabase
      .from("webhook_deliveries")
      .update({
        status: "retrying",
        attempt: 0,
        next_retry_at: new Date().toISOString(),
        completed_at: null,
      })
      .eq("id", deliveryId);

    // Trigger retry processor
    await supabase.functions.invoke("webhook-retry");
    toast.success("Webhook reenviado!");
    await load();
    setResending(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" />Sucesso</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Falhou</Badge>;
      case "retrying":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 gap-1"><RotateCcw className="w-3 h-3" />Retentando</Badge>;
      case "pending":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200 gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (selectedEndpoint !== "all" && d.endpoint_id !== selectedEndpoint) return false;
    if (deliveryFilter !== "all" && d.status !== deliveryFilter) return false;
    return true;
  });

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
          Receba notificações automáticas via POST — compatível com Zapier, N8N, Make e qualquer sistema.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="endpoints" className="gap-2">
            <Webhook className="w-4 h-4" /> Endpoints
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="w-4 h-4" /> Logs
            {deliveries.filter(d => d.status === "failed").length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                {deliveries.filter(d => d.status === "failed").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="w-4 h-4" /> Documentação
          </TabsTrigger>
        </TabsList>

        {/* ENDPOINTS TAB */}
        <TabsContent value="endpoints" className="space-y-4 mt-4">
          {/* Add new webhook */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Criar Webhook</h2>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="https://hooks.zapier.com/..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <Input
                placeholder="Descrição (opcional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Produto:</p>
                  <Select value={newProductId} onValueChange={setNewProductId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os produtos</SelectItem>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Eventos:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {AVAILABLE_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={newEvents.has(ev.value)}
                        onCheckedChange={() => toggleEventOnNew(ev.value)}
                      />
                      <span className="text-foreground">{ev.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={addEndpoint} disabled={adding || !newUrl.trim()} className="gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
                Criar Webhook
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
                      <div className="min-w-0">
                        <span className="text-sm font-mono text-foreground truncate block">{ep.url}</span>
                        {ep.description && (
                          <span className="text-xs text-muted-foreground">{ep.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        disabled={testing === ep.id}
                        onClick={() => testWebhook(ep.id)}
                      >
                        {testing === ep.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Testar
                      </Button>
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
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Secret:</span>
                    <code className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded">
                      {showSecrets.has(ep.id) ? ep.secret : "••••••••••••••••"}
                    </code>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => setShowSecrets((prev) => {
                        const next = new Set(prev);
                        next.has(ep.id) ? next.delete(ep.id) : next.add(ep.id);
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
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por endpoint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os endpoints</SelectItem>
                {endpoints.map(ep => (
                  <SelectItem key={ep.id} value={ep.id}>
                    {ep.url.replace(/^https?:\/\//, '').substring(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="retrying">Retentando</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={load} className="gap-1">
              <RotateCcw className="w-3 h-3" /> Atualizar
            </Button>
          </div>

          {filteredDeliveries.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredDeliveries.map(d => {
                const ep = endpoints.find(e => e.id === d.endpoint_id);
                const isExpanded = expandedDelivery === d.id;
                return (
                  <Card key={d.id} className="overflow-hidden">
                    <button
                      className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedDelivery(isExpanded ? null : d.id)}
                    >
                      {getStatusBadge(d.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{d.event_type}</Badge>
                          <span className="text-xs text-muted-foreground font-mono">{d.event_id}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {ep?.url || d.endpoint_id} • Tentativa {d.attempt}/{d.max_attempts}
                          {d.last_response_status ? ` • HTTP ${d.last_response_status}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(d.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t p-3 space-y-3 bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Request (Payload)</p>
                            <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-48 font-mono">
                              {JSON.stringify(d.payload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Response</p>
                            <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-48 font-mono">
                              {d.last_response_body || d.last_error || "Sem resposta"}
                            </pre>
                            {d.last_response_status && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Status HTTP: {d.last_response_status}
                              </p>
                            )}
                          </div>
                        </div>

                        {d.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={resending === d.id}
                            onClick={() => resendDelivery(d.id)}
                          >
                            {resending === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                            Reenviar
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DOCS TAB */}
        <TabsContent value="docs" className="space-y-4 mt-4">
          <WebhookDocs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WebhookDocs() {
  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Como funcionam os Webhooks Panttera</h3>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
          <p>
            Os webhooks permitem que você receba notificações automáticas em tempo real quando eventos
            ocorrem na plataforma. A cada evento, enviamos um <strong>POST</strong> para cada URL configurada.
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Eventos Disponíveis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Evento</th>
                <th className="text-left p-2 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b"><td className="p-2 font-mono">payment.approved</td><td className="p-2">Pagamento aprovado com sucesso</td></tr>
              <tr className="border-b"><td className="p-2 font-mono">payment.failed</td><td className="p-2">Pagamento falhou ou foi recusado</td></tr>
              <tr className="border-b"><td className="p-2 font-mono">payment.refunded</td><td className="p-2">Pagamento reembolsado</td></tr>
              <tr className="border-b"><td className="p-2 font-mono">subscription.created</td><td className="p-2">Nova assinatura criada</td></tr>
              <tr className="border-b"><td className="p-2 font-mono">subscription.canceled</td><td className="p-2">Assinatura cancelada</td></tr>
              <tr><td className="p-2 font-mono">checkout.completed</td><td className="p-2">Checkout finalizado com sucesso</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Formato do Payload</h3>
        <pre className="text-xs bg-muted rounded p-3 overflow-auto font-mono">
{`{
  "id": "evt_abc123def456...",
  "type": "payment.approved",
  "created_at": "2026-03-19T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "external_id": "gateway_id",
    "status": "paid",
    "payment": {
      "amount": 97.00,
      "currency": "BRL",
      "method": "pix"
    },
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "11999999999",
      "cpf": "123.456.789-00"
    },
    "product": {
      "id": "uuid",
      "name": "Curso Premium",
      "price": 97.00
    },
    "metadata": {},
    "created_at": "2026-03-19T12:00:00Z"
  }
}`}
        </pre>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Segurança — Validação de Assinatura</h3>
        <p className="text-xs text-muted-foreground">
          Cada requisição inclui o header <code className="bg-muted px-1 rounded">x-panttera-signature</code> com
          uma assinatura HMAC-SHA256 do body usando seu secret. <strong>Sempre valide essa assinatura</strong> para
          garantir que a requisição veio da Panttera.
        </p>

        <div className="space-y-3">
          <p className="text-xs font-medium text-foreground">Node.js:</p>
          <pre className="text-xs bg-muted rounded p-3 overflow-auto font-mono">
{`const crypto = require('crypto');

function validateSignature(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// No seu handler:
app.post('/webhook', (req, res) => {
  const sig = req.headers['x-panttera-signature'];
  const body = JSON.stringify(req.body);
  
  if (!validateSignature(body, sig, YOUR_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Processar evento...
  const event = req.body;
  console.log('Evento:', event.type, event.id);
  
  // IMPORTANTE: Responda com 200 rapidamente
  res.status(200).send('OK');
});`}
          </pre>

          <p className="text-xs font-medium text-foreground">Python:</p>
          <pre className="text-xs bg-muted rounded p-3 overflow-auto font-mono">
{`import hmac
import hashlib

def validate_signature(body: str, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

# Flask example:
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    sig = request.headers.get('x-panttera-signature')
    body = request.get_data(as_text=True)
    
    if not validate_signature(body, sig, YOUR_SECRET):
        return 'Invalid signature', 401
    
    event = request.json
    print(f"Evento: {event['type']} {event['id']}")
    
    return 'OK', 200`}
          </pre>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Sistema de Retentativas</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Timeout de <strong>5 segundos</strong> por requisição</li>
          <li><strong>3 tentativas</strong> com backoff exponencial: 5s → 30s → 2min</li>
          <li>Após 3 falhas, o evento é marcado como <strong>falho</strong></li>
          <li>Eventos falhos podem ser reenviados manualmente na aba <strong>Logs</strong></li>
          <li>Cada evento possui um <strong>ID único</strong> para idempotência (evitar duplicatas)</li>
        </ul>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Headers da Requisição</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Header</th>
                <th className="text-left p-2 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b"><td className="p-2 font-mono">Content-Type</td><td className="p-2">application/json</td></tr>
              <tr className="border-b"><td className="p-2 font-mono">x-panttera-signature</td><td className="p-2">HMAC-SHA256 do body com seu secret</td></tr>
              <tr className="border-b"><td className="p-2 font-mono">x-panttera-event</td><td className="p-2">Tipo do evento (ex: payment.approved)</td></tr>
              <tr><td className="p-2 font-mono">User-Agent</td><td className="p-2">Panttera-Webhooks/1.0</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 space-y-4 bg-amber-500/5 border-amber-200">
        <div className="flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Boas Práticas</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside mt-2">
              <li>Responda com <strong>HTTP 200</strong> o mais rápido possível</li>
              <li>Processe o evento de forma <strong>assíncrona</strong> se possível</li>
              <li>Use o <strong>event.id</strong> para evitar processar o mesmo evento duas vezes</li>
              <li>Sempre <strong>valide a assinatura</strong> antes de processar</li>
              <li>Recomendamos usar <a href="https://requestbin.com/" target="_blank" className="text-primary underline">RequestBin</a> para testar</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
