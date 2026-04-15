// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, MessageSquare, CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface LogEntry {
  id: string;
  tenant_id: string;
  order_id: string | null;
  customer_phone: string;
  template_category: string;
  message_body: string;
  status: string;
  delivery_status: string;
  error_message: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<string, string> = {
  confirmacao: "Confirmação",
  boas_vindas: "Boas-vindas",
  abandono: "Abandono",
  lembrete_pix: "Lembrete PIX",
  acesso: "Acesso",
  geral: "Geral",
};

const DeliveryIcon = ({ delivery_status, delivered_at, read_at }: { delivery_status: string; delivered_at: string | null; read_at: string | null }) => {
  const tooltipMap: Record<string, string> = {
    sent: "Enviado ao servidor",
    server: "Recebido pelo WhatsApp",
    delivered: delivered_at ? `Entregue em ${format(new Date(delivered_at), "dd/MM HH:mm")}` : "Entregue",
    read: read_at ? `Lido em ${format(new Date(read_at), "dd/MM HH:mm")}` : "Lido",
    failed: "Falha na entrega",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            {delivery_status === "read" ? (
              <CheckCheck className="h-4 w-4 text-blue-500" />
            ) : delivery_status === "delivered" ? (
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
            ) : delivery_status === "server" ? (
              <Check className="h-4 w-4 text-muted-foreground" />
            ) : delivery_status === "failed" ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Check className="h-4 w-4 text-muted-foreground/50" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipMap[delivery_status] || delivery_status}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const WhatsAppSendLog = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("whatsapp_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    if (filterCategory !== "all") {
      query = query.eq("template_category", filterCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs((data || []) as LogEntry[]);
      setHasMore((data || []).length > PAGE_SIZE);
    }
    setLoading(false);
  }, [user, page, filterStatus, filterCategory]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const maskPhone = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    if (d.length >= 10) {
      return `${d.slice(0, 4)}****${d.slice(-2)}`;
    }
    return "****";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Histórico de Envios WhatsApp
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchLogs}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Nenhum envio registrado ainda.
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Telefone</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Mensagem</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-[50px]">Entrega</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, PAGE_SIZE).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {maskPhone(log.customer_phone)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[log.template_category] || log.template_category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={log.message_body}>
                        {log.message_body.slice(0, 60)}...
                      </TableCell>
                      <TableCell>
                        {log.status === "sent" ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Enviado
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1 text-[10px]" title={log.error_message || ""}>
                            <XCircle className="h-3 w-3" />
                            Falhou
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status === "sent" && (
                          <DeliveryIcon
                            delivery_status={log.delivery_status || "sent"}
                            delivered_at={log.delivered_at}
                            read_at={log.read_at}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-muted-foreground/50" /> Enviado</span>
              <span className="flex items-center gap-1"><CheckCheck className="h-3 w-3 text-muted-foreground" /> Entregue</span>
              <span className="flex items-center gap-1"><CheckCheck className="h-3 w-3 text-blue-500" /> Lido</span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">Página {page + 1}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppSendLog;
