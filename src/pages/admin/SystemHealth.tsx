import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  RefreshCw,
  Database,
  Zap,
  Settings2,
  Server,
} from "lucide-react";
import { toast } from "sonner";

interface CheckResult {
  name: string;
  category: "edge_function" | "database" | "config";
  status: "ok" | "warning" | "error";
  message: string;
  details?: string;
}

const SystemHealth = () => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const checkEdgeFunction = async (name: string, testBody?: object): Promise<CheckResult> => {
    try {
      const start = Date.now();
      const { data, error } = await supabase.functions.invoke(name, {
        body: testBody || {},
      });
      const duration = Date.now() - start;

      if (error) {
        // Some functions return 400 for missing fields — that's expected and means the function is alive
        const errMsg = typeof error === "object" ? JSON.stringify(error) : String(error);
        if (errMsg.includes("Missing required") || errMsg.includes("required") || errMsg.includes("400")) {
          return {
            name: `Edge Function: ${name}`,
            category: "edge_function",
            status: "ok",
            message: `Online (${duration}ms) — validação de campos funcionando`,
          };
        }
        return {
          name: `Edge Function: ${name}`,
          category: "edge_function",
          status: "error",
          message: `Erro: ${errMsg}`,
          details: errMsg,
        };
      }
      return {
        name: `Edge Function: ${name}`,
        category: "edge_function",
        status: "ok",
        message: `Online (${duration}ms)`,
      };
    } catch (err: any) {
      return {
        name: `Edge Function: ${name}`,
        category: "edge_function",
        status: "error",
        message: `Falha na conexão: ${err.message}`,
        details: err.message,
      };
    }
  };

  const checkTable = async (tableName: string): Promise<CheckResult> => {
    try {
      const start = Date.now();
      const { count, error } = await (supabase.from(tableName as any) as any)
        .select("id", { count: "exact", head: true });
      const duration = Date.now() - start;

      if (error) {
        return {
          name: `Tabela: ${tableName}`,
          category: "database",
          status: "error",
          message: `Erro: ${error.message}`,
          details: error.message,
        };
      }
      return {
        name: `Tabela: ${tableName}`,
        category: "database",
        status: "ok",
        message: `Acessível (${count ?? 0} registros, ${duration}ms)`,
      };
    } catch (err: any) {
      return {
        name: `Tabela: ${tableName}`,
        category: "database",
        status: "error",
        message: `Falha: ${err.message}`,
      };
    }
  };

  const runChecks = async () => {
    setRunning(true);
    setResults([]);
    const allResults: CheckResult[] = [];

    // 1. Edge Functions
    const edgeFunctions = [
      { name: "create-pix-payment", body: {} },
      { name: "create-asaas-payment", body: {} },
      { name: "check-order-status", body: { external_id: "test-health-check" } },
      { name: "send-access-link", body: {} },
      { name: "facebook-capi", body: {} },
      { name: "meta-diagnostics", body: {} },
    ];

    const edgeResults = await Promise.all(
      edgeFunctions.map((fn) => checkEdgeFunction(fn.name, fn.body))
    );
    allResults.push(...edgeResults);

    // 2. Database tables
    const tables = [
      "products",
      "orders",
      "customers",
      "coupons",
      "courses",
      "checkout_settings",
      "notification_settings",
      "payment_gateways",
      "order_bumps",
      "member_access",
      "product_pixels",
      "abandoned_carts",
      "platform_settings",
    ];

    const dbResults = await Promise.all(tables.map((t) => checkTable(t)));
    allResults.push(...dbResults);

    // 3. Config checks
    // Check if there are active products
    try {
      const { count } = await (supabase.from("products") as any)
        .select("id", { count: "exact", head: true })
        .eq("active", true);
      allResults.push({
        name: "Produtos ativos",
        category: "config",
        status: (count ?? 0) > 0 ? "ok" : "warning",
        message: (count ?? 0) > 0 ? `${count} produto(s) ativo(s)` : "Nenhum produto ativo encontrado",
      });
    } catch { /* ignore */ }

    // Check active gateways
    try {
      const { data: gateways } = await supabase
        .from("payment_gateways")
        .select("provider, active")
        .eq("active", true);
      allResults.push({
        name: "Gateways de pagamento",
        category: "config",
        status: (gateways?.length ?? 0) > 0 ? "ok" : "warning",
        message: (gateways?.length ?? 0) > 0
          ? `${gateways!.length} gateway(s) ativo(s): ${gateways!.map((g) => g.provider).join(", ")}`
          : "Nenhum gateway ativo",
      });
    } catch { /* ignore */ }

    // Check pending orders (possible stuck payments)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await (supabase.from("orders") as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", oneDayAgo);
      allResults.push({
        name: "Pedidos pendentes > 24h",
        category: "config",
        status: (count ?? 0) > 5 ? "warning" : "ok",
        message: (count ?? 0) > 0
          ? `${count} pedido(s) pendente(s) há mais de 24h`
          : "Nenhum pedido preso",
      });
    } catch { /* ignore */ }

    // Check checkout settings
    try {
      const { data: settings } = await supabase
        .from("checkout_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      allResults.push({
        name: "Configurações do checkout",
        category: "config",
        status: settings ? "ok" : "warning",
        message: settings ? "Configurado" : "Sem configurações personalizadas",
      });
    } catch { /* ignore */ }

    setResults(allResults);
    setLastRun(new Date());
    setRunning(false);
  };

  const copyReport = () => {
    const timestamp = lastRun?.toLocaleString("pt-BR") || new Date().toLocaleString("pt-BR");
    const errors = results.filter((r) => r.status === "error");
    const warnings = results.filter((r) => r.status === "warning");
    const ok = results.filter((r) => r.status === "ok");

    let report = `🔍 RELATÓRIO DE FISCALIZAÇÃO — ${timestamp}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `✅ OK: ${ok.length} | ⚠️ Avisos: ${warnings.length} | ❌ Erros: ${errors.length}\n\n`;

    if (errors.length > 0) {
      report += `❌ ERROS:\n`;
      errors.forEach((r) => {
        report += `  • ${r.name}: ${r.message}\n`;
        if (r.details) report += `    Detalhes: ${r.details}\n`;
      });
      report += `\n`;
    }

    if (warnings.length > 0) {
      report += `⚠️ AVISOS:\n`;
      warnings.forEach((r) => {
        report += `  • ${r.name}: ${r.message}\n`;
      });
      report += `\n`;
    }

    report += `✅ FUNCIONANDO (${ok.length}):\n`;
    ok.forEach((r) => {
      report += `  • ${r.name}: ${r.message}\n`;
    });

    navigator.clipboard.writeText(report);
    toast.success("Relatório copiado para a área de transferência!");
  };

  const errorCount = results.filter((r) => r.status === "error").length;
  const warningCount = results.filter((r) => r.status === "warning").length;
  const okCount = results.filter((r) => r.status === "ok").length;

  const statusIcon = (status: string) => {
    if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const categoryIcon = (cat: string) => {
    if (cat === "edge_function") return <Zap className="w-4 h-4" />;
    if (cat === "database") return <Database className="w-4 h-4" />;
    return <Settings2 className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Fiscalizar Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verifica Edge Functions, banco de dados e configurações em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <Button variant="outline" size="sm" onClick={copyReport} className="gap-2">
              <Copy className="w-4 h-4" />
              Copiar Relatório
            </Button>
          )}
          <Button onClick={runChecks} disabled={running} className="gap-2">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fiscalizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Fiscalizar Agora
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      {results.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> {okCount} OK
          </Badge>
          {warningCount > 0 && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm border-amber-200 bg-amber-50 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" /> {warningCount} Aviso(s)
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm border-red-200 bg-red-50 text-red-700">
              <XCircle className="w-3.5 h-3.5" /> {errorCount} Erro(s)
            </Badge>
          )}
          {lastRun && (
            <span className="text-xs text-muted-foreground self-center ml-auto">
              Última verificação: {lastRun.toLocaleTimeString("pt-BR")}
            </span>
          )}
        </div>
      )}

      {/* Results by category */}
      {results.length > 0 && (
        <div className="space-y-4">
          {(["edge_function", "database", "config"] as const).map((cat) => {
            const catResults = results.filter((r) => r.category === cat);
            if (catResults.length === 0) return null;
            const label = cat === "edge_function" ? "Edge Functions" : cat === "database" ? "Banco de Dados" : "Configurações";
            return (
              <Card key={cat}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {categoryIcon(cat)}
                    {label}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {catResults.filter((r) => r.status === "ok").length}/{catResults.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {catResults.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                          r.status === "error"
                            ? "bg-red-50 border border-red-100"
                            : r.status === "warning"
                            ? "bg-amber-50 border border-amber-100"
                            : "bg-muted/40 border border-transparent"
                        }`}
                      >
                        {statusIcon(r.status)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{r.name}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">{r.message}</p>
                          {r.details && (
                            <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap break-all bg-red-50 p-2 rounded">
                              {r.details}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !running && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Server className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Pronto para fiscalizar</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Clique em "Fiscalizar Agora" para verificar todas as Edge Functions, tabelas do banco de dados e configurações do sistema.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemHealth;
