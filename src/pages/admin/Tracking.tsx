import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, ExternalLink, CheckCircle2, AlertCircle, Globe, Code2, Zap,
  Activity, XCircle, AlertTriangle, Play, RefreshCw, Search, Link2, FileCode,
} from "lucide-react";
import TrackingScriptGenerator from "@/components/admin/TrackingScriptGenerator";
import UtmAttributionTable from "@/components/admin/UtmAttributionTable";
import PixelEventsDashboard from "@/components/admin/PixelEventsDashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PixelSummary {
  product_id: string;
  product_name: string;
  platform: string;
  pixel_id: string;
  domain: string | null;
  has_capi: boolean;
}

interface DiagCheck {
  name: string;
  status: "pass" | "warning" | "error";
  detail: string;
}

interface DiagResult {
  pixel_id: string;
  checks: DiagCheck[];
}

interface DiagSummary {
  total: number;
  passed: number;
  warnings: number;
  errors: number;
}

const Tracking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pixels, setPixels] = useState<PixelSummary[]>([]);
  const [domains, setDomains] = useState<{ id: string; domain: string; verified: boolean }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  // Diagnostics state
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagResult[] | null>(null);
  const [diagSummary, setDiagSummary] = useState<DiagSummary | null>(null);

  // Page verification state
  const [pageUrl, setPageUrl] = useState("");
  const [pageChecking, setPageChecking] = useState(false);
  const [pageChecks, setPageChecks] = useState<DiagCheck[] | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [pixelRes, domainRes] = await Promise.all([
        supabase
          .from("product_pixels")
          .select("pixel_id, platform, domain, capi_token, product_id, products(name)")
          .eq("user_id", user.id),
        supabase
          .from("facebook_domains")
          .select("*")
          .eq("user_id", user.id),
      ]);

      if (pixelRes.data) {
        const mapped = pixelRes.data.map((p: any) => ({
          product_id: p.product_id,
          product_name: (p.products as any)?.name || "Produto",
          platform: p.platform,
          pixel_id: p.pixel_id,
          domain: p.domain,
          has_capi: !!p.capi_token,
        }));
        setPixels(mapped);

        // Extract unique products that have Facebook pixels
        const fbPixels = mapped.filter((p) => p.platform === "facebook");
        const uniqueProds = Array.from(
          new Map(fbPixels.map((p) => [p.product_id, { id: p.product_id, name: p.product_name }])).values()
        );
        setProducts(uniqueProds);
        if (uniqueProds.length > 0) setSelectedProduct(uniqueProds[0].id);
      }

      if (domainRes.data) {
        setDomains(domainRes.data as any);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const runDiagnostics = async () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }
    setDiagLoading(true);
    setDiagResults(null);
    setDiagSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("meta-diagnostics", {
        body: { product_id: selectedProduct },
      });

      if (error) {
        console.error("[Diagnostics] invoke error:", error);
        throw new Error(typeof error === 'object' && error.message ? error.message : 'Falha na conexão com o servidor');
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      setDiagResults(data.results || []);
      setDiagSummary(data.summary || null);

      if (data.summary?.errors > 0) {
        toast.error(`${data.summary.errors} problema(s) encontrado(s)`);
      } else if (data.summary?.warnings > 0) {
        toast.warning(`${data.summary.warnings} aviso(s) — rastreamento funcional mas pode melhorar`);
      } else {
        toast.success("Rastreamento 100% saudável! 🎯");
      }
    } catch (err: any) {
      toast.error("Erro ao executar diagnóstico: " + (err.message || "Tente novamente"));
    } finally {
      setDiagLoading(false);
    }
  };

  const verifyPage = useCallback(async () => {
    const url = pageUrl.trim();
    if (!url) { toast.error("Cole a URL da página"); return; }
    if (!url.startsWith("http")) { toast.error("URL deve começar com http:// ou https://"); return; }

    setPageChecking(true);
    setPageChecks(null);

    const checks: DiagCheck[] = [];

    try {
      // 1) Fetch page HTML via edge function proxy (avoids CORS)
      const { data: htmlData, error: fetchErr } = await supabase.functions.invoke("meta-diagnostics", {
        body: { action: "verify_page", url },
      });

      if (fetchErr || !htmlData?.html) {
        // If edge function doesn't support it, do client-side checks
        checks.push({
          name: "Acesso à página",
          status: "warning",
          detail: "Não foi possível acessar a página remotamente. Verifique manualmente no navegador.",
        });
      } else {
        const html: string = htmlData.html;

        // Check for fbevents.js
        if (html.includes("fbevents.js")) {
          checks.push({ name: "Meta Pixel SDK", status: "pass", detail: "fbevents.js encontrado na página ✅" });
        } else {
          checks.push({ name: "Meta Pixel SDK", status: "error", detail: "fbevents.js NÃO encontrado! O script do pixel não está carregando." });
        }

        // Check for fbq('init'
        if (html.includes("fbq('init'") || html.includes('fbq("init"') || html.includes("fbq(\"init\"")) {
          checks.push({ name: "fbq init", status: "pass", detail: "Inicialização do Pixel encontrada na página ✅" });
        } else if (html.includes("public_product_pixels")) {
          checks.push({ name: "fbq init (dinâmico)", status: "pass", detail: "Pixel carregado dinamicamente via PayCheckout API ✅" });
        } else {
          checks.push({ name: "fbq init", status: "error", detail: "Nenhuma inicialização de Pixel encontrada." });
        }

        // Check for PageView
        if (html.includes("PageView")) {
          checks.push({ name: "PageView", status: "pass", detail: "Evento PageView detectado ✅" });
        } else {
          checks.push({ name: "PageView", status: "warning", detail: "PageView não encontrado no HTML (pode ser disparado dinamicamente)" });
        }

        // Check for ViewContent
        if (html.includes("ViewContent")) {
          checks.push({ name: "ViewContent", status: "pass", detail: "Evento ViewContent detectado — público de topo de funil ativo ✅" });
        } else {
          checks.push({ name: "ViewContent", status: "warning", detail: "ViewContent não encontrado. Recomendado para criar público 'viu a oferta mas não abriu checkout'." });
        }

        // Check for UTM capture
        if (html.includes("utm_source") || html.includes("pc_utms")) {
          checks.push({ name: "Captura de UTMs", status: "pass", detail: "Lógica de captura de UTMs encontrada ✅" });
        } else {
          checks.push({ name: "Captura de UTMs", status: "error", detail: "Nenhuma lógica de captura de UTMs encontrada. Os parâmetros não serão passados ao checkout." });
        }

        // Check for fbclid cross-domain propagation
        if (html.includes("fbclid")) {
          checks.push({ name: "Cross-domain fbclid", status: "pass", detail: "Propagação de fbclid para o checkout detectada — atribuição cross-domain ativa ✅" });
        } else {
          checks.push({ name: "Cross-domain fbclid", status: "warning", detail: "fbclid não está sendo propagado. A atribuição pode ser perdida na troca de domínio." });
        }

        // Check for _fbp cross-domain propagation
        if (html.includes("_fbp") || html.includes("fbp=") || html.includes("fbpCookie")) {
          checks.push({ name: "Cross-domain _fbp", status: "pass", detail: "Propagação de _fbp para o checkout detectada — cookie restaurado cross-domain ✅" });
        } else {
          checks.push({ name: "Cross-domain _fbp", status: "warning", detail: "_fbp não está sendo passado ao checkout. O Match Quality pode ser reduzido." });
        }

        // Check for _fbc cookie creation
        if (html.includes("_fbc")) {
          checks.push({ name: "Cookie _fbc", status: "pass", detail: "Criação de cookie _fbc na LP detectada ✅" });
        } else {
          checks.push({ name: "Cookie _fbc", status: "warning", detail: "Cookie _fbc não está sendo criado na LP. Será gerado apenas no checkout." });
        }

        // Check for goToCheckout
        if (html.includes("goToCheckout")) {
          checks.push({ name: "URL Decorator (goToCheckout)", status: "pass", detail: "Função de redirecionamento com propagação de parâmetros encontrada ✅" });
        } else {
          checks.push({ name: "URL Decorator (goToCheckout)", status: "warning", detail: "Função goToCheckout não encontrada. Verifique se os botões usam links diretos." });
        }

        // Check for PayCheckout product ID
        const productIdRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
        const foundIds = html.match(productIdRegex) || [];
        const myProductIds = pixels.map(p => p.product_id);
        const matchedProducts = [...new Set(foundIds)].filter(id => myProductIds.includes(id));

        if (matchedProducts.length > 0) {
          const names = matchedProducts.map(id => pixels.find(p => p.product_id === id)?.product_name).filter(Boolean);
          checks.push({ name: "Link do checkout", status: "pass", detail: `Produto(s) detectado(s): ${names.join(", ")} ✅` });
        } else {
          checks.push({ name: "Link do checkout", status: "error", detail: "Nenhum ID de produto do PayCheckout encontrado na página." });
        }

        // Check for config ID
        if (html.includes("config=") || html.includes("config'") || html.includes("configId")) {
          checks.push({ name: "Config ID", status: "pass", detail: "Referência a config de checkout encontrada ✅" });
        } else {
          checks.push({ name: "Config ID", status: "warning", detail: "Nenhum config ID encontrado — pode estar usando a oferta padrão." });
        }
      }
    } catch (err: any) {
      checks.push({ name: "Erro geral", status: "error", detail: err.message || "Erro desconhecido" });
    }

    setPageChecks(checks);
    setPageChecking(false);

    const errors = checks.filter(c => c.status === "error").length;
    const warnings = checks.filter(c => c.status === "warning").length;
    if (errors > 0) toast.error(`${errors} problema(s) encontrado(s) na página`);
    else if (warnings > 0) toast.warning(`Página OK com ${warnings} aviso(s)`);
    else toast.success("Página 100% configurada! 🎯");
  }, [pageUrl, pixels]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
      case "error": return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
      default: return null;
    }
  };

  const platformColors: Record<string, string> = {
    facebook: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "g ads": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "g analytics": "bg-orange-500/10 text-orange-500 border-orange-500/20",
    tiktok: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    taboola: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueProductIds = [...new Set(pixels.map((p) => p.product_id))];
  const totalPixels = pixels.length;
  const capiEnabled = pixels.filter((p) => p.has_capi).length;

  const healthScore = diagSummary
    ? Math.round((diagSummary.passed / Math.max(diagSummary.total, 1)) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rastreamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral dos pixels, Conversions API e diagnóstico completo do Meta.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalPixels}</p>
            <p className="text-xs text-muted-foreground">Pixels configurados</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{capiEnabled}</p>
            <p className="text-xs text-muted-foreground">Com CAPI ativo</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{domains.length}</p>
            <p className="text-xs text-muted-foreground">Domínios verificados</p>
          </div>
        </Card>
      </div>

      {/* ========= DIAGNOSTICS ========= */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Diagnóstico do Meta</h2>
            <p className="text-xs text-muted-foreground">Teste completo: Pixel ID, domínio, CAPI e conexão com a Graph API</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum pixel do Facebook configurado. Configure em Produtos → Editar → Configurações.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Produto</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={runDiagnostics} disabled={diagLoading} className="gap-2">
                  {diagLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : diagResults ? (
                    <RefreshCw className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {diagLoading ? "Analisando..." : diagResults ? "Rodar novamente" : "Executar diagnóstico"}
                </Button>
              </div>

              {/* Health Score */}
              {diagSummary && healthScore !== null && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Saúde do rastreamento</span>
                    <span className={`text-2xl font-bold ${
                      healthScore === 100 ? "text-primary" :
                      healthScore >= 70 ? "text-yellow-500" : "text-destructive"
                    }`}>
                      {healthScore}%
                    </span>
                  </div>
                  <Progress
                    value={healthScore}
                    className="h-3"
                  />
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="w-3 h-3" /> {diagSummary.passed} OK
                    </span>
                    <span className="flex items-center gap-1 text-yellow-500">
                      <AlertTriangle className="w-3 h-3" /> {diagSummary.warnings} Avisos
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-3 h-3" /> {diagSummary.errors} Erros
                    </span>
                  </div>
                </div>
              )}

              {/* Results */}
              {diagResults && diagResults.map((result) => (
                <Card key={result.pixel_id} className="overflow-hidden border-border">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-sm font-medium text-foreground">{result.pixel_id}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {result.checks.map((check, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        {statusIcon(check.status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{check.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}

              {diagResults && diagResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pixel do Facebook encontrado para este produto.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* ========= PAGE VERIFICATION ========= */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <FileCode className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Verificação de Página Externa</h2>
            <p className="text-xs text-muted-foreground">Cole a URL da sua página de vendas para verificar se o tracking está 100%</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-foreground">URL da página</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="https://suapagina.com"
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={verifyPage} disabled={pageChecking} className="gap-2">
              {pageChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {pageChecking ? "Verificando..." : "Verificar página"}
            </Button>
          </div>

          {pageChecks && (
            <Card className="overflow-hidden border-border">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground truncate">{pageUrl}</span>
              </div>
              <div className="divide-y divide-border">
                {pageChecks.map((check, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    {statusIcon(check.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{check.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </Card>

      {/* ========= SCRIPT GENERATOR + UTM TEMPLATE ========= */}
      <TrackingScriptGenerator
        pixels={pixels}
        products={products}
        checkoutBaseUrl={window.location.origin}
      />

      {/* ========= UTM ATTRIBUTION ========= */}
      <UtmAttributionTable />

      {/* ========= PIXELS BY PRODUCT ========= */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Pixels por produto</h2>
        {uniqueProductIds.length === 0 ? (
          <Card className="p-8 text-center">
            <Code2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Nenhum pixel configurado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure pixels em Produtos → Editar → Configurações → Pixels de conversão
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {uniqueProductIds.map((productId) => {
              const productPixels = pixels.filter((p) => p.product_id === productId);
              const productName = productPixels[0]?.product_name || "Produto";

              return (
                <Card key={productId} className="overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground text-sm">{productName}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs gap-1"
                      onClick={() => navigate(`/admin/products/${productId}/edit`)}
                    >
                      Editar <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="divide-y divide-border">
                    {productPixels.map((px, i) => (
                      <div key={i} className="px-5 py-3 flex items-center gap-3 text-sm">
                        <Badge
                          variant="outline"
                          className={`text-xs ${platformColors[px.platform] || "border-border text-muted-foreground"}`}
                        >
                          {px.platform}
                        </Badge>
                        <span className="font-mono text-foreground">{px.pixel_id}</span>
                        {px.domain && (
                          <span className="text-xs text-muted-foreground">via {px.domain}</span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          {px.has_capi ? (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> CAPI
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                              <AlertCircle className="w-3 h-3" /> Sem CAPI
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Domains */}
      {domains.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Domínios verificados</h2>
          <Card>
            <div className="divide-y divide-border">
              {domains.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{d.domain}</span>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs ${
                      d.verified
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }`}
                  >
                    {d.verified ? "Verificado" : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Tracking;
