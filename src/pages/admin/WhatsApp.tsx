// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Phone, Power, PowerOff, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const formatPhone = (raw: string) => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
};

const WhatsApp = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("disconnected");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing session on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("tenant_id", user.id)
        .maybeSingle();
      if (data) {
        setInstanceId(data.instance_id);
        setStatus(data.status);
        setPhoneNumber(data.phone_number);
      }
    };
    load();
  }, [user]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(
    (instId: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke("check-whatsapp-status", {
            body: { instance_id: instId },
          });
          if (error) throw error;
          if (data?.state === "open") {
            setStatus("connected");
            setPhoneNumber(data.phone_number);
            setQrcode(null);
            stopPolling();
            toast.success("WhatsApp conectado com sucesso!");
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    },
    [stopPolling]
  );

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-whatsapp");
      if (error) throw error;
      if (data?.qrcode) {
        setQrcode(data.qrcode);
        setInstanceId(data.instance_id);
        setStatus("connecting");
        startPolling(data.instance_id);
      } else {
        toast.error("QR Code não retornado. Tente novamente.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceId) return;
    setDisconnecting(true);
    stopPolling();
    try {
      const { error } = await supabase.functions.invoke("disconnect-whatsapp", {
        body: { instance_id: instanceId },
      });
      if (error) throw error;
      setStatus("disconnected");
      setPhoneNumber(null);
      setQrcode(null);
      toast.success("WhatsApp desconectado.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao desconectar. Tente novamente.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte seu WhatsApp para enviar mensagens automáticas aos clientes.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conexão WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "connected" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Conectado</p>
                  {phoneNumber && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      {formatPhone(phoneNumber)}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="ml-auto border-emerald-300 text-emerald-700 dark:text-emerald-300">
                  Ativo
                </Badge>
              </div>
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
          ) : status === "connecting" && qrcode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Escaneie o QR Code no seu WhatsApp...
              </div>
              <div className="flex justify-center p-4 bg-white rounded-xl border max-w-xs mx-auto">
                <img
                  src={`data:image/png;base64,${qrcode}`}
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
    </div>
  );
};

export default WhatsApp;
