// @ts-nocheck
import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";

const WhatsAppTemplates = lazy(() => import("@/components/admin/WhatsAppTemplates"));
const WhatsAppFeatureFlags = lazy(() => import("@/components/admin/WhatsAppFeatureFlags"));
const WhatsAppSendLog = lazy(() => import("@/components/admin/WhatsAppSendLog"));
const WhatsAppStarterTemplates = lazy(() => import("@/components/admin/WhatsAppStarterTemplates"));
const WhatsAppMetricsCard = lazy(() => import("@/components/admin/WhatsAppMetricsCard"));
import WhatsAppTestMessageDialog from "@/components/admin/WhatsAppTestMessageDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Phone, Power, PowerOff, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Send, RotateCw } from "lucide-react";
import { toast } from "sonner";

const formatPhone = (raw: string) => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
};

const formatRelative = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months > 1 ? "meses" : "mês"}`;
};

const WhatsApp = () => {
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("disconnected");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [qrAge, setQrAge] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrAgeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load + periodic status check
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("tenant_id", user.id)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setPhoneNumber(data.phone_number);
        setInstanceId(data.instance_id);
        setConnectedAt(data.connected_at);
      }
      setLastChecked(new Date());
    };
    load();

    statusPollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("status, phone_number, instance_id, connected_at")
        .eq("tenant_id", user.id)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setPhoneNumber(data.phone_number);
        setInstanceId(data.instance_id);
        setConnectedAt(data.connected_at);
      }
      setLastChecked(new Date());
    }, 60_000);

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [user]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (qrRefreshRef.current) {
      clearInterval(qrRefreshRef.current);
      qrRefreshRef.current = null;
    }
    if (qrAgeRef.current) {
      clearInterval(qrAgeRef.current);
      qrAgeRef.current = null;
    }
    setQrAge(0);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const refreshQrCode = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("connect-whatsapp");
      if (error) throw error;
      if (data?.qrcode) {
        setQrcode(data.qrcode);
        setQrAge(0);
      }
    } catch (err) {
      console.error("QR refresh error:", err);
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    let attempts = 0;
    const maxAttempts = 80; // ~4 min at 3s

    // Status poll every 3s
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        setStatus("disconnected");
        setQrcode(null);
        toast.error("Tempo esgotado. Tente conectar novamente.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("check-whatsapp-status");
        if (error) throw error;
        setLastChecked(new Date());

        if (data?.state === "open") {
          setStatus("connected");
          setPhoneNumber(data.phone_number);
          if (data.instance_id) setInstanceId(data.instance_id);
          setConnectedAt(new Date().toISOString());
          setQrcode(null);
          stopPolling();
          toast.success("WhatsApp conectado com sucesso!");
        } else if (data?.error) {
          stopPolling();
          setErrorMsg(data.details || data.error);
          setQrcode(null);
          setStatus("disconnected");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 3000);

    // QR auto-refresh every 30s (Evolution QRs expire ~60s)
    qrRefreshRef.current = setInterval(() => {
      refreshQrCode();
    }, 30_000);

    // QR age counter (UI countdown)
    qrAgeRef.current = setInterval(() => {
      setQrAge((a) => a + 1);
    }, 1000);
  }, [stopPolling, refreshQrCode]);

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("connect-whatsapp");
      if (error) throw error;

      if (data?.error) {
        setErrorMsg(data.details || data.error);
        toast.error(data.error);
        return;
      }

      if (data?.qrcode) {
        setQrcode(data.qrcode);
        setStatus("connecting");
        if (data.instance_id) setInstanceId(data.instance_id);
        startPolling();
      } else {
        toast.error("QR Code não retornado. Tente novamente.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Não foi possível conectar. Tente novamente.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    stopPolling();
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("disconnect-whatsapp");
      if (error) throw error;

      if (data?.error) {
        setErrorMsg(data.details || data.error);
        toast.error(data.error);
        return;
      }

      setStatus("disconnected");
      setPhoneNumber(null);
      setInstanceId(null);
      setConnectedAt(null);
      setQrcode(null);
      toast.success("WhatsApp desconectado.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao desconectar. Tente novamente.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    setErrorMsg(null);
    try {
      await supabase.functions.invoke("disconnect-whatsapp");
      setStatus("disconnected");
      setPhoneNumber(null);
      setQrcode(null);

      const { data, error } = await supabase.functions.invoke("connect-whatsapp");
      if (error) throw error;
      if (data?.error) {
        setErrorMsg(data.details || data.error);
        toast.error(data.error);
        return;
      }
      if (data?.qrcode) {
        setQrcode(data.qrcode);
        setStatus("connecting");
        if (data.instance_id) setInstanceId(data.instance_id);
        startPolling();
        toast.success("Escaneie o novo QR Code para reconectar.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao reconectar.");
    } finally {
      setReconnecting(false);
    }
  };

  const qrSrc = qrcode
    ? qrcode.startsWith("data:image")
      ? qrcode
      : `data:image/png;base64,${qrcode.replace(/\s/g, "")}`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte seu WhatsApp para enviar mensagens automáticas aos clientes.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erro de conexão</p>
            <p className="mt-0.5 opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conexão WhatsApp
            {status === "connected" && (
              <span className="ml-2 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Monitorando
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "connected" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-emerald-800 dark:text-emerald-300">Conectado</p>
                      {phoneNumber && (
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          {formatPhone(phoneNumber)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300 shrink-0">
                      Ativo
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      <Clock className="w-3 h-3" />
                      <span>Conectado {formatRelative(connectedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      <RefreshCw className="w-3 h-3" />
                      <span>Verificado {formatRelative(lastChecked?.toISOString() ?? null)}</span>
                    </div>
                    {instanceId && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700/80 dark:text-emerald-400/80 truncate" title={instanceId}>
                        <span className="font-mono opacity-70">ID:</span>
                        <span className="font-mono truncate">{instanceId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setTestOpen(true)} variant="outline" className="gap-2">
                  <Send className="w-4 h-4" />
                  Enviar mensagem de teste
                </Button>
                <Button onClick={handleReconnect} disabled={reconnecting} variant="outline" className="gap-2">
                  {reconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  {reconnecting ? "Reconectando..." : "Reconectar"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-2"
                >
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                  {disconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
                </Button>
              </div>
            </div>
          ) : status === "connecting" && qrSrc ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Escaneie o QR Code no seu WhatsApp...
              </div>
              <div className="flex justify-center p-4 bg-white rounded-xl border max-w-xs mx-auto">
                <img
                  src={qrSrc}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                <XCircle className="w-8 h-8 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Desconectado</p>
                  <p className="text-sm text-muted-foreground">
                    Nenhum WhatsApp vinculado no momento.
                  </p>
                </div>
              </div>
              <Button onClick={handleConnect} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                {loading ? "Gerando QR Code..." : "Conectar WhatsApp"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {status === "connected" && (
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
          <WhatsAppMetricsCard />
        </Suspense>
      )}

      {isSuperAdmin && (
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
          <WhatsAppFeatureFlags />
        </Suspense>
      )}

      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
        <WhatsAppStarterTemplates />
      </Suspense>

      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
        <WhatsAppTemplates />
      </Suspense>

      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
        <WhatsAppSendLog />
      </Suspense>

      <WhatsAppTestMessageDialog open={testOpen} onOpenChange={setTestOpen} />
    </div>
  );
};

export default WhatsApp;
