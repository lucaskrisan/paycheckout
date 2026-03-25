import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe, Plus, Trash2, CheckCircle, AlertCircle, Loader2,
  RefreshCw, Copy, ExternalLink, ChevronRight, X, Rocket,
  Monitor, Settings, ArrowRight, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

/* ───────── Tutorial Steps ───────── */
const TUTORIAL_STEPS = [
  {
    title: "Escolha um subdomínio",
    description:
      'Vá ao painel do seu registrador de domínio e escolha um subdomínio para seu checkout. Exemplos: pay.seusite.com, checkout.seusite.com, comprar.seusite.com',
    icon: Globe,
  },
  {
    title: "Configure o DNS",
    description:
      'No painel DNS do seu domínio, crie um registro CNAME apontando seu subdomínio para app.panttera.com.br. Exemplo:\n\nTipo: CNAME\nNome: pay\nValor: app.panttera.com.br',
    icon: Settings,
  },
  {
    title: "Adicione aqui na plataforma",
    description:
      'Depois de configurar o DNS, digite o subdomínio completo (ex: pay.seusite.com) no campo abaixo e clique em "Adicionar". O SSL será emitido automaticamente!',
    icon: Rocket,
  },
  {
    title: "Aguarde a verificação",
    description:
      'O Cloudflare vai verificar o DNS e emitir o certificado SSL. Isso pode levar de 5 minutos a algumas horas. Quando o status ficar "Ativo", seu checkout já estará funcionando no seu domínio!',
    icon: ShieldCheck,
  },
];

/* ───────── Status helpers ───────── */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pending_validation: { label: "Validando DNS", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  moved: { label: "Movido", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  deleted: { label: "Removido", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const SSL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "SSL Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  pending_validation: { label: "SSL Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pending_issuance: { label: "Emitindo SSL", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pending_deployment: { label: "Implantando SSL", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  initializing: { label: "Inicializando", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const Domains = () => {
  const { user } = useAuth();

  /* ── Pixel domains (facebook_domains) ── */
  const [fbDomains, setFbDomains] = useState<any[]>([]);
  const [newFbDomain, setNewFbDomain] = useState("");
  const [addingFb, setAddingFb] = useState(false);

  /* ── Custom checkout domains ── */
  const [customDomains, setCustomDomains] = useState<any[]>([]);
  const [newHostname, setNewHostname] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  /* ── Tutorial ── */
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem("panttera_domain_tutorial_dismissed") !== "true";
  });
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    if (user) {
      loadFbDomains();
      loadCustomDomains();
    }
  }, [user]);

  /* ── Facebook Domains ── */
  const loadFbDomains = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("facebook_domains")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setFbDomains(data);
  };

  const addFbDomain = async () => {
    if (!newFbDomain || !user) return;
    setAddingFb(true);
    const { error } = await supabase.from("facebook_domains").insert({
      domain: newFbDomain,
      user_id: user.id,
      verified: false,
    });
    if (error) {
      toast.error("Erro ao adicionar domínio");
    } else {
      toast.success("Domínio adicionado");
      setNewFbDomain("");
      loadFbDomains();
    }
    setAddingFb(false);
  };

  const removeFbDomain = async (id: string) => {
    await supabase.from("facebook_domains").delete().eq("id", id);
    toast.success("Domínio removido");
    loadFbDomains();
  };

  /* ── Custom Domains (Cloudflare for SaaS) ── */
  const loadCustomDomains = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("custom_domains" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setCustomDomains(data as any[]);
  };

  const addCustomDomain = async () => {
    if (!newHostname || !user) return;
    const clean = newHostname.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase().trim();
    if (!clean.includes(".")) {
      toast.error("Digite um domínio válido (ex: pay.seusite.com)");
      return;
    }
    setAddingCustom(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("cloudflare-add-hostname", {
        body: { hostname: clean },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Erro ao adicionar domínio");
      } else {
        toast.success("Domínio adicionado! Aguarde a verificação do DNS.");
        setNewHostname("");
        loadCustomDomains();
      }
    } catch {
      toast.error("Erro inesperado");
    }
    setAddingCustom(false);
  };

  const removeCustomDomain = async (id: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("cloudflare-remove-hostname", {
        body: { id },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Erro ao remover");
      } else {
        toast.success("Domínio removido");
        loadCustomDomains();
      }
    } catch {
      toast.error("Erro inesperado");
    }
  };

  const checkStatus = async (id: string) => {
    setCheckingStatus(id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("cloudflare-check-status", {
        body: { id },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.data && !res.data.error) {
        loadCustomDomains();
        if (res.data.status === "active") {
          toast.success("Domínio verificado e ativo! 🎉");
        } else {
          toast.info(`Status: ${STATUS_MAP[res.data.status]?.label || res.data.status}`);
        }
      }
    } catch {
      toast.error("Erro ao verificar status");
    }
    setCheckingStatus(null);
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("panttera_domain_tutorial_dismissed", "true");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Domínios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie domínios para rastreamento (Pixel) e checkout personalizado
        </p>
      </div>

      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="custom" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <Rocket className="w-4 h-4" /> Checkout Customizado
          </TabsTrigger>
          <TabsTrigger value="pixel" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
            <Monitor className="w-4 h-4" /> Domínios de Pixel
          </TabsTrigger>
        </TabsList>

        {/* ═══════ TAB: Custom Domains ═══════ */}
        <TabsContent value="custom" className="space-y-4 mt-4">
          {/* Tutorial */}
          {showTutorial && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-display flex items-center gap-2 text-primary">
                    <Rocket className="w-4 h-4" />
                    Como configurar seu domínio customizado
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={dismissTutorial} className="text-muted-foreground hover:text-foreground h-7 px-2">
                    <X className="w-4 h-4 mr-1" /> Pular tutorial
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Step indicators */}
                <div className="flex items-center gap-1 mb-4">
                  {TUTORIAL_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${
                        i <= tutorialStep ? "bg-primary" : "bg-muted"
                      }`}
                      onClick={() => setTutorialStep(i)}
                    />
                  ))}
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    {(() => {
                      const StepIcon = TUTORIAL_STEPS[tutorialStep].icon;
                      return <StepIcon className="w-5 h-5 text-primary" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Passo {tutorialStep + 1}: {TUTORIAL_STEPS[tutorialStep].title}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                      {TUTORIAL_STEPS[tutorialStep].description}
                    </p>

                    {tutorialStep === 1 && (
                      <div className="mt-3 bg-muted/50 rounded-lg p-3 border border-border/50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Registro DNS necessário</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Tipo</span>
                            <p className="font-mono font-bold text-foreground">CNAME</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Nome</span>
                            <p className="font-mono font-bold text-foreground">pay</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor</span>
                            <div className="flex items-center gap-1">
                              <p className="font-mono font-bold text-primary text-[11px]">app.panttera.com.br</p>
                              <button onClick={() => copyToClipboard("app.panttera.com.br")} className="text-muted-foreground hover:text-primary">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={tutorialStep === 0}
                    onClick={() => setTutorialStep((s) => s - 1)}
                    className="text-xs"
                  >
                    Anterior
                  </Button>
                  {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setTutorialStep((s) => s + 1)}
                      className="text-xs gap-1"
                    >
                      Próximo <ChevronRight className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={dismissTutorial} className="text-xs gap-1">
                      Entendi! <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!showTutorial && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowTutorial(true); setTutorialStep(0); }}
              className="text-xs gap-1 text-muted-foreground"
            >
              <Rocket className="w-3 h-3" /> Ver tutorial novamente
            </Button>
          )}

          {/* Custom Domains Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Globe className="w-4 h-4" /> Seus Domínios de Checkout
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure um subdomínio próprio para seu checkout (ex: pay.seusite.com)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* DNS instruction banner */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Instrução:</span> Aponte seu subdomínio via{" "}
                  <span className="font-mono text-primary">CNAME</span> para{" "}
                  <button
                    onClick={() => copyToClipboard("app.panttera.com.br")}
                    className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                  >
                    app.panttera.com.br <Copy className="w-3 h-3" />
                  </button>
                </p>
              </div>

              {customDomains.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum domínio customizado configurado
                </p>
              ) : (
                <div className="space-y-3">
                  {customDomains.map((d: any) => {
                    const statusInfo = STATUS_MAP[d.status] || { label: d.status, color: "bg-muted text-muted-foreground" };
                    const sslInfo = d.ssl_status ? SSL_STATUS_MAP[d.ssl_status] : null;
                    return (
                      <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground">{d.hostname}</span>
                          <Badge variant="outline" className={`text-[10px] gap-1 border ${statusInfo.color}`}>
                            {d.status === "active" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {statusInfo.label}
                          </Badge>
                          {sslInfo && (
                            <Badge variant="outline" className={`text-[10px] gap-1 border ${sslInfo.color}`}>
                              <ShieldCheck className="w-3 h-3" />
                              {sslInfo.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {d.status === "active" && (
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <a href={`https://${d.hostname}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => checkStatus(d.id)}
                            disabled={checkingStatus === d.id}
                            className="h-8 w-8"
                          >
                            {checkingStatus === d.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeCustomDomain(d.id)} className="h-8 w-8">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="ex: pay.seusite.com"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomDomain()}
                  className="flex-1"
                />
                <Button onClick={addCustomDomain} disabled={addingCustom || !newHostname} size="sm">
                  {addingCustom ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1" />
                  )}
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TAB: Pixel Domains ═══════ */}
        <TabsContent value="pixel" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Domínios de Rastreamento (Pixel)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Domínios associados ao seu Pixel do Facebook/TikTok para rastreamento CAPI
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {fbDomains.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum domínio encontrado</p>
              ) : (
                <div className="space-y-3">
                  {fbDomains.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{d.domain}</span>
                        {d.verified ? (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <CheckCircle className="w-3 h-3" /> Verificado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <AlertCircle className="w-3 h-3" /> Pendente
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFbDomain(d.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="ex: checkout.meusite.com.br"
                  value={newFbDomain}
                  onChange={(e) => setNewFbDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFbDomain()}
                  className="flex-1"
                />
                <Button onClick={addFbDomain} disabled={addingFb || !newFbDomain} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Domínio
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Domains;
