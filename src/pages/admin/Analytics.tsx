// @ts-nocheck
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart3,
  Map,
  Eye,
  MousePointerClick,
  Activity,
  Settings,
  ExternalLink,
  Save,
  Loader2,
  TrendingUp,
  Users,
  Globe,
  Smartphone,
  Monitor,
} from "lucide-react";
import BrazilMap from "@/components/admin/analytics/BrazilMap";

const Analytics = () => {
  const { user, isSuperAdmin } = useAuth();
  const [clarityId, setClarityId] = useState("");
  const [savedClarityId, setSavedClarityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load settings & orders
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [settingsRes, ordersRes] = await Promise.all([
          supabase.from("platform_settings").select("clarity_project_id").limit(1).single(),
          supabase
            .from("orders")
            .select("id, status, amount, customer_state, payment_method, created_at, metadata")
            .in("status", ["paid", "approved", "confirmed"])
            .order("created_at", { ascending: false })
            .limit(1000),
        ]);
        if (settingsRes.data?.clarity_project_id) {
          setClarityId(settingsRes.data.clarity_project_id);
          setSavedClarityId(settingsRes.data.clarity_project_id);
        }
        setOrders(ordersRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const saveClarityId = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ clarity_project_id: clarityId })
        .not("id", "is", null);
      if (error) throw error;
      setSavedClarityId(clarityId);
      toast.success("Clarity ID salvo com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sales by state
  const salesByState = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const state = o.customer_state?.toUpperCase();
      if (!state) return;
      if (!map[state]) map[state] = { count: 0, revenue: 0 };
      map[state].count += 1;
      map[state].revenue += Number(o.amount || 0);
    });
    return map;
  }, [orders]);

  const totalWithState = useMemo(
    () => orders.filter((o) => o.customer_state).length,
    [orders]
  );

  // Top 5 states
  const topStates = useMemo(() => {
    return Object.entries(salesByState)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);
  }, [salesByState]);

  // Payment method distribution
  const paymentDist = useMemo(() => {
    const pix = orders.filter((o) => o.payment_method === "pix").length;
    const card = orders.filter((o) => o.payment_method === "credit_card").length;
    const other = orders.length - pix - card;
    return { pix, card, other };
  }, [orders]);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Panttera Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão completa de comportamento e conversões
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          Super Admin
        </Badge>
      </div>

      {/* Clarity Config */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Microsoft Clarity — Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Cole seu Clarity Project ID (ex: abc123xyz)"
              value={clarityId}
              onChange={(e) => setClarityId(e.target.value)}
              className="max-w-md bg-secondary/50 border-border"
            />
            <Button
              onClick={saveClarityId}
              disabled={saving || clarityId === savedClarityId}
              size="sm"
              className="gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            {savedClarityId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(`https://clarity.microsoft.com/projects/view/${savedClarityId}/dashboard`, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Clarity
              </Button>
            )}
          </div>
          {savedClarityId && (
            <p className="text-xs text-muted-foreground mt-2">
              ✅ Clarity ativo — ID: <code className="text-primary">{savedClarityId}</code>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Vendas</p>
              <p className="text-lg font-bold text-foreground">{orders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Map className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Com Estado</p>
              <p className="text-lg font-bold text-foreground">
                {totalWithState}
                <span className="text-xs text-muted-foreground ml-1">
                  ({orders.length > 0 ? ((totalWithState / orders.length) * 100).toFixed(0) : 0}%)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <Globe className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PIX</p>
              <p className="text-lg font-bold text-foreground">{paymentDist.pix}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-500/10">
              <MousePointerClick className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cartão</p>
              <p className="text-lg font-bold text-foreground">{paymentDist.card}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map + Top States */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Vendas por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalWithState === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Map className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma venda com estado registrado ainda.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O estado será capturado automaticamente nas próximas vendas via checkout.
                </p>
              </div>
            ) : (
              <BrazilMap salesByState={salesByState} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Top States Ranking */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Top 5 Estados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topStates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sem dados geográficos disponíveis
                </p>
              ) : (
                <div className="space-y-3">
                  {topStates.map(([uf, data], i) => (
                    <div key={uf} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">
                        #{i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{uf}</span>
                          <span className="text-xs text-muted-foreground">
                            {data.count} vendas · {fmt(data.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{
                              width: `${(data.revenue / (topStates[0]?.[1]?.revenue || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clarity Insights Embed */}
          {savedClarityId && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Clarity Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden bg-secondary/30">
                  <iframe
                    src={`https://clarity.microsoft.com/projects/view/${savedClarityId}/dashboard`}
                    className="w-full h-[400px] border-0"
                    title="Microsoft Clarity Dashboard"
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Heatmaps, gravações de sessão e métricas de engajamento em tempo real
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Clarity Script Info */}
      {savedClarityId && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              Script de Instalação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Cole este script na sua página de vendas para capturar heatmaps e gravações:
            </p>
            <div className="relative">
              <pre className="bg-secondary/60 rounded-lg p-4 text-xs text-foreground overflow-x-auto border border-border">
{`<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;
    t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window,document,"clarity","script","${savedClarityId}");
</script>`}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `<script type="text/javascript">(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/${savedClarityId}";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${savedClarityId}");</script>`
                  );
                  toast.success("Script copiado!");
                }}
              >
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
