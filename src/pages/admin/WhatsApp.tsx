// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageCircle, Plus, Smartphone, FileText, Loader2, RefreshCw,
  Trash2, QrCode, PowerOff, Wifi, WifiOff, Send, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Instance {
  instance: {
    instanceName: string;
    instanceId?: string;
    status?: string;
    owner?: string;
  };
}

const evoApi = async (action: string, body?: Record<string, unknown>) => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/evolution-api`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...body }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error || err?.response?.message?.[0] || `Erro ${res.status}`);
  }
  return res.json();
};

const WhatsApp = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [qrDialog, setQrDialog] = useState<{ open: boolean; name: string; qr: string; base64?: string; loading?: boolean; error?: string }>({
    open: false, name: "", qr: "", base64: "", loading: false, error: "",
  });
  const [sendDialog, setSendDialog] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [sendNumber, setSendNumber] = useState("");
  const [sendText, setSendText] = useState("");
  const [sending, setSending] = useState(false);
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await evoApi("list_instances");
      const list = Array.isArray(data) ? data : [];
      setInstances(list);
      if (list.length > 0) {
        const states: Record<string, string> = {};
        await Promise.all(
          list.map(async (inst: Instance) => {
            const name = inst.instance?.instanceName;
            if (!name) return;
            try {
              const state = await evoApi("connection_state", { instanceName: name });
              states[name] = state?.instance?.state || state?.state || "unknown";
            } catch {
              states[name] = "error";
            }
          })
        );
        setConnectionStates(states);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar instâncias");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadInstances(); }, [loadInstances]);

  // Auto-poll connection states every 8s
  useEffect(() => {
    if (instances.length === 0) return;
    let cancelled = false;
    const poll = async () => {
      const states: Record<string, string> = {};
      await Promise.all(
        instances.map(async (inst: Instance) => {
          const name = inst.instance?.instanceName;
          if (!name) return;
          try {
            const state = await evoApi("connection_state", { instanceName: name });
            states[name] = state?.instance?.state || state?.state || "unknown";
          } catch {
            states[name] = "error";
          }
        })
      );
      if (!cancelled) setConnectionStates(states);
    };
    const id = setInterval(poll, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, [instances]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Nome da instância é obrigatório"); return; }
    setCreating(true);
    try {
      const instanceName = newName.trim().replace(/\s/g, "-").toLowerCase();
      await evoApi("create_instance", { instanceName });
      toast.success("Instância criada!");
      setDialogOpen(false);
      setNewName("");
      loadInstances();
      // Auto-open QR dialog
      setTimeout(() => handleGetQR(instanceName), 1500);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar instância");
    }
    setCreating(false);
  };

  const handleGetQR = async (name: string) => {
    setQrDialog({ open: true, name, qr: "", base64: "", loading: true, error: "" });
    try {
      const fetchQr = async () => evoApi("get_qrcode", { instanceName: name });
      const fetchCached = async () => evoApi("get_cached_qr", { instanceName: name });
      let data = await fetchQr();

      if (data?.connected) {
        setQrDialog(q => ({ ...q, loading: false, error: "Esta instância já está conectada no WhatsApp." }));
        loadInstances();
        return;
      }

      if (!data?.base64 && !data?.code && data?.waiting) {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          // Try cached QR from webhook first, then fallback to connect endpoint
          const cached = await fetchCached();
          if (cached?.base64) {
            data = { ...data, base64: cached.base64 };
            break;
          }
          data = await fetchQr();
          if (data?.connected || data?.base64 || data?.code || !data?.waiting) break;
        }
      }

      if (data?.connected) {
        setQrDialog(q => ({ ...q, loading: false, error: "Esta instância já está conectada no WhatsApp." }));
        loadInstances();
      } else if (data?.base64) {
        setQrDialog(q => ({ ...q, base64: data.base64, qr: data.code || "", loading: false }));
      } else if (data?.code) {
        setQrDialog(q => ({ ...q, qr: data.code, loading: false }));
      } else {
        setQrDialog(q => ({
          ...q,
          loading: false,
          error: data?.waiting
            ? "O servidor ainda está preparando o QR Code. Aguarde alguns segundos e tente novamente."
            : "QR Code indisponível no momento. Tente reiniciar a instância e gerar novamente.",
        }));
      }
    } catch (err: any) {
      setQrDialog(q => ({ ...q, loading: false, error: err.message || "Erro ao buscar QR Code" }));
    }
  };

  const handleLogout = async (name: string) => {
    try {
      await evoApi("logout", { instanceName: name });
      toast.success(`${name} desconectado`);
      loadInstances();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Deletar instância "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await evoApi("delete_instance", { instanceName: name });
      toast.success(`${name} deletada`);
      loadInstances();
    } catch (err: any) {
      toast.error(err.message || "Erro ao deletar instância");
    }
  };

  const handleRestart = async (name: string) => {
    try {
      await evoApi("restart", { instanceName: name });
      toast.success(`${name} reiniciada`);
      setTimeout(loadInstances, 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao reiniciar");
    }
  };

  const handleSend = async () => {
    if (!sendNumber || !sendText) { toast.error("Número e mensagem são obrigatórios"); return; }
    setSending(true);
    try {
      const data = await evoApi("send_text", {
        instanceName: sendDialog.name,
        number: sendNumber.replace(/\D/g, ""),
        text: sendText,
      });
      if (data?.key) {
        toast.success("Mensagem enviada!");
        setSendDialog({ open: false, name: "" });
        setSendNumber("");
        setSendText("");
      } else {
        toast.error("Erro ao enviar mensagem");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    }
    setSending(false);
  };

  const getStatusBadge = (name: string) => {
    const state = connectionStates[name];
    if (state === "open") return <Badge className="bg-green-500/10 text-green-500 gap-1"><Wifi className="w-3 h-3" /> Conectado</Badge>;
    if (state === "close" || state === "closed") return <Badge variant="outline" className="gap-1 text-muted-foreground"><WifiOff className="w-3 h-3" /> Desconectado</Badge>;
    if (state === "connecting") return <Badge variant="outline" className="gap-1 text-yellow-500"><Loader2 className="w-3 h-3 animate-spin" /> Conectando</Badge>;
    return <Badge variant="outline" className="gap-1 text-muted-foreground">—</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-green-500" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Gerencie instâncias e envie mensagens via Evolution API</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Instância
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Instâncias</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma instância criada</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Crie sua primeira instância para conectar um número do WhatsApp via QR Code.
                </p>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Criar Primeira Instância
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {instances.map((inst) => {
                const name = inst.instance?.instanceName || "unknown";
                const state = connectionStates[name];
                const isConnected = state === "open";
                return (
                  <Card key={name} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium truncate">{name}</CardTitle>
                        {getStatusBadge(name)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {!isConnected && (
                          <Button variant="outline" size="sm" onClick={() => handleGetQR(name)}>
                            <QrCode className="w-3.5 h-3.5 mr-1.5" /> QR Code
                          </Button>
                        )}
                        {isConnected && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setSendDialog({ open: true, name })}>
                              <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleLogout(name)}>
                              <PowerOff className="w-3.5 h-3.5 mr-1.5" /> Desconectar
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleRestart(name)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reiniciar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(name)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Deletar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="border-border/50 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Como funciona?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><span className="text-primary font-bold">1.</span> Crie uma instância com o nome desejado</li>
                <li className="flex items-center gap-2"><span className="text-primary font-bold">2.</span> Escaneie o QR Code com seu WhatsApp</li>
                <li className="flex items-center gap-2"><span className="text-primary font-bold">3.</span> Pronto! Mensagens automáticas serão enviadas por esta conexão</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-1">Templates em breve</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Templates de mensagem para automações estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Instance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome da Instância</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: vendas-principal"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <p className="text-xs text-muted-foreground mt-1">Identificador único (sem espaços)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onOpenChange={(open) => setQrDialog((q) => ({ ...q, open }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" /> Conectar: {qrDialog.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrDialog.loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrDialog.error ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                <p className="text-sm text-muted-foreground">{qrDialog.error}</p>
              </div>
            ) : qrDialog.base64 ? (
              <img src={qrDialog.base64} alt="QR Code" className="w-64 h-64 rounded-lg border border-border" />
            ) : qrDialog.qr ? (
              <div className="bg-muted p-4 rounded-lg text-xs font-mono break-all max-h-64 overflow-auto">
                {qrDialog.qr}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">QR Code indisponível.</p>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho → Escaneie o QR Code
            </p>
            <Button variant="outline" size="sm" onClick={() => handleGetQR(qrDialog.name)} disabled={qrDialog.loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${qrDialog.loading ? "animate-spin" : ""}`} /> Tentar novamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={sendDialog.open} onOpenChange={(open) => setSendDialog((s) => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" /> Enviar mensagem: {sendDialog.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Número</label>
              <Input value={sendNumber} onChange={(e) => setSendNumber(e.target.value)} placeholder="5511999999999" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mensagem</label>
              <Input value={sendText} onChange={(e) => setSendText(e.target.value)} placeholder="Olá! Sua compra foi aprovada." onKeyDown={(e) => e.key === "Enter" && handleSend()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog({ open: false, name: "" })}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsApp;
