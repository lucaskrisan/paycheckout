import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings2, Trash2, CreditCard, Wallet, ArrowRightLeft, MessageCircle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GatewayFormDialog from "@/components/admin/GatewayFormDialog";
import type { GatewayConfig } from "@/pages/admin/Gateways";
import { useAuth } from "@/hooks/useAuth";

const providerLabels: Record<string, string> = {
  asaas: "Asaas",
  pagarme: "Pagar.me",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
};

interface CatalogItem {
  id: string;
  provider: "asaas" | "pagarme" | "mercadopago" | "stripe";
  name: string;
  description: string;
  color: string;
  initials: string;
  badge?: string;
  tab: "split" | "sob_demanda";
}

const catalog: CatalogItem[] = [
  { id: "mp-s", provider: "mercadopago", name: "Mercado Pago", description: "O Mercado Pago é uma fintech da América Latina criada pelo Mercado Livre, focada em vendas e cobranças para empresas.", color: "#009EE3", initials: "MP", tab: "split" },
  { id: "pg-s", provider: "pagarme", name: "Pagar.me", description: "A Pagar.me é uma plataforma completa de pagamentos com suporte a PIX, cartão de crédito e boleto. Integração robusta e painel de controle intuitivo.", color: "#55C157", initials: "Pg", badge: "Mais utilizado", tab: "split" },
  { id: "st-s", provider: "stripe", name: "Stripe", description: "O método de pagamento perfeito para compras internacionais, aceita pagamentos de todo o mundo.", color: "#635BFF", initials: "S", tab: "split" },
  { id: "as-d", provider: "asaas", name: "Asaas", description: "A Asaas oferece pagamentos via PIX e Cartão de Crédito com integração simplificada, suporte dedicado e alta taxa de aprovação.", color: "#0066FF", initials: "As", tab: "sob_demanda" },
  { id: "pg-d", provider: "pagarme", name: "Pagar.me", description: "A Pagar.me é uma plataforma completa de pagamentos com suporte a PIX, cartão de crédito e boleto.", color: "#55C157", initials: "Pg", badge: "NOVO", tab: "sob_demanda" },
  { id: "mp-d", provider: "mercadopago", name: "Mercado Pago", description: "O Mercado Pago é uma fintech da América Latina criada pelo Mercado Livre, focada em vendas e cobranças para empresas.", color: "#009EE3", initials: "MP", tab: "sob_demanda" },
  { id: "st-d", provider: "stripe", name: "Stripe", description: "O método de pagamento perfeito para compras internacionais, aceita pagamentos de todo o mundo.", color: "#635BFF", initials: "S", tab: "sob_demanda" },
];

const defaultConfigs: Record<string, Record<string, any>> = {
  asaas: { pix_fee_percent: 0, pix_fee_fixed: 0.44, pix_validity_days: 1, pix_timer_minutes: 30, debit_fee_percent: 1.89, debit_fee_fixed: 0.35, credit_fee_1x: 2.99, credit_fee_2_6x: 2.99, credit_fee_7_12x: 2.99, credit_fee_13_21x: 4.29, credit_processing_fee: 0.44, max_installments: 12, min_installment_value: 5, free_installments: 1, interest_rate_initial: 6.58, interest_rate_incremental: 1.45, billing_description: "" },
  pagarme: { pix_fee_percent: 0.89, pix_fee_fixed: 0.44, pix_timer_minutes: 30, credit_fee_1x: 2.99, credit_fee_2_6x: 2.99, credit_fee_7_12x: 2.99, credit_processing_fee: 0.44, soft_descriptor: "", max_installments: 12, min_installment_value: 5, free_installments: 1, interest_rate_initial: 6.58, interest_rate_incremental: 1.45 },
  mercadopago: { pix_fee_percent: 0.99, pix_fee_fixed: 0, pix_timer_minutes: 30, credit_fee_1x: 4.98, credit_fee_2_6x: 4.98, credit_fee_7_12x: 4.98, credit_processing_fee: 0, max_installments: 12, min_installment_value: 5, free_installments: 1, interest_rate_initial: 6.58, interest_rate_incremental: 1.45 },
  stripe: { credit_fee_percent: 3.99, credit_fee_fixed: 0.39, pix_fee_percent: 1.5, pix_fee_fixed: 0, pix_timer_minutes: 30, max_installments: 12, min_installment_value: 5 },
};

const Integrations = () => {
  const { user } = useAuth();
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayConfig | null>(null);

  // Crisp
  const [crispId, setCrispId] = useState("");
  const [crispSaving, setCrispSaving] = useState(false);
  const [crispLoaded, setCrispLoaded] = useState(false);

  useEffect(() => { loadGateways(); }, []);
  useEffect(() => { if (user?.id) loadCrisp(); }, [user?.id]);

  const loadCrisp = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("checkout_settings")
      .select("crisp_website_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if ((data as any)?.crisp_website_id) setCrispId((data as any).crisp_website_id);
    setCrispLoaded(true);
  };

  const saveCrisp = async () => {
    if (!user?.id) return;
    setCrispSaving(true);
    const trimmed = crispId.trim() || null;
    
    // Check if settings row exists
    const { data: existing } = await supabase
      .from("checkout_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("checkout_settings")
        .update({ crisp_website_id: trimmed } as any)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("checkout_settings")
        .insert({ user_id: user.id, crisp_website_id: trimmed } as any));
    }

    if (error) toast.error("Erro ao salvar Crisp");
    else toast.success(trimmed ? "Crisp ativado no checkout!" : "Crisp removido do checkout");
    setCrispSaving(false);
  };

  const loadGateways = async () => {
    const { data, error } = await supabase.from("payment_gateways").select("*").order("created_at");
    if (data) {
      setGateways(data.map((g: any) => ({
        id: g.id, provider: g.provider, name: g.name, environment: g.environment,
        active: g.active, payment_methods: (g.payment_methods as string[]) || [],
        config: (g.config as Record<string, any>) || {},
      })));
    }
    if (error) toast.error("Erro ao carregar gateways");
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gateway?")) return;
    const { error } = await supabase.from("payment_gateways").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Gateway excluído"); loadGateways(); }
  };

  const handleEdit = (gw: GatewayConfig) => { setEditingGateway(gw); setDialogOpen(true); };

  const handleInstall = (item: CatalogItem) => {
    setEditingGateway({
      provider: item.provider, name: `${item.name} Principal`, environment: "sandbox",
      active: false, payment_methods: [], config: defaultConfigs[item.provider],
    });
    setDialogOpen(true);
  };

  const handleMigrate = (gw: GatewayConfig) => {
    toast.info(`Para migrar de ${providerLabels[gw.provider]}, instale o novo gateway, configure as credenciais e depois desative o antigo.`);
  };

  const activeGateways = gateways.filter(g => g.active);
  const inactiveGateways = gateways.filter(g => !g.active);
  const installedProviders = gateways.map(g => g.provider);

  const renderGatewayCard = (gw: GatewayConfig) => (
    <Card key={gw.id} className="border border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{gw.name}</span>
            <Badge variant={gw.active ? "default" : "secondary"} className="text-[10px]">
              {gw.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Migrar" onClick={() => handleMigrate(gw)}>
              <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(gw)}>
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(gw.id!)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{providerLabels[gw.provider]}</Badge>
          <Badge variant="outline" className="text-[10px]">{gw.environment === "production" ? "Produção" : "Sandbox"}</Badge>
          {gw.payment_methods.map(m => (
            <Badge key={m} variant="secondary" className="text-[10px]">
              {m === "pix" ? "PIX" : m === "credit_card" ? "Cartão" : m}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCatalogCard = (item: CatalogItem) => {
    const isInstalled = installedProviders.includes(item.provider);
    return (
      <Card key={item.id} className="border border-border/50 bg-card hover:border-primary/30 transition-all flex flex-col justify-between">
        <CardContent className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: item.color }}>
              {item.initials}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{item.name}</span>
                {item.badge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">{item.badge}</Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
        </CardContent>
        <div className="px-5 pb-5">
          <Button
            variant="outline"
            className={`w-full ${isInstalled ? "" : "hover:bg-primary/10 hover:text-primary hover:border-primary/50"}`}
            size="sm"
            disabled={isInstalled}
            onClick={() => handleInstall(item)}
          >
            {isInstalled ? "Instalado" : "Instalar"}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure seus gateways de pagamento e integrações</p>
      </div>

      {/* Active gateways */}
      {!loading && activeGateways.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Gateways Ativos
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGateways.map(renderGatewayCard)}
          </div>
        </div>
      )}

      {/* Inactive gateways */}
      {!loading && inactiveGateways.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gateways Inativos</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveGateways.map(renderGatewayCard)}
          </div>
        </div>
      )}

      {/* Catalog + Crisp tabs */}
      <Tabs defaultValue="split">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="split" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Split
          </TabsTrigger>
          <TabsTrigger value="sob_demanda" className="gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Sob Demanda
          </TabsTrigger>
          <TabsTrigger value="crisp" className="gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Crisp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="mt-4 space-y-4">
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground text-sm">Gateways com Split de Pagamento</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Conecte sua conta de gateway diretamente. Os pagamentos são divididos automaticamente no momento da transação. Cobramos 3% sobre cada transação.
              </p>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.filter(i => i.tab === "split").map(renderCatalogCard)}
          </div>
        </TabsContent>

        <TabsContent value="sob_demanda" className="mt-4 space-y-4">
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground text-sm">Gateways Sob Demanda (Billing)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gateways que não oferecem sistema de split, ou seja, a taxa não é descontada direto na hora da venda. Nessa modalidade, a taxa fica em R$ 0,49 fixo por venda + 3% sobre o valor total.
              </p>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.filter(i => i.tab === "sob_demanda").map(renderCatalogCard)}
          </div>
        </TabsContent>

        <TabsContent value="crisp" className="mt-4 space-y-4">
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground text-sm">Crisp Chat — Atendimento ao Vivo</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione um chat ao vivo diretamente no seu checkout para atender clientes em tempo real e aumentar suas conversões.
              </p>
            </CardContent>
          </Card>

          {crispLoaded && (
            <Card className="border border-border/50 bg-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Configurar Crisp Chat</h3>
                    <p className="text-xs text-muted-foreground">O widget aparecerá automaticamente em todos os seus checkouts</p>
                  </div>
                  {crispId && <Badge className="ml-auto text-[10px]">Ativo</Badge>}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cole seu CRISP_WEBSITE_ID aqui (ex: 1d36332d-054f-443b-...)"
                    value={crispId}
                    onChange={e => setCrispId(e.target.value)}
                    className="text-xs"
                  />
                  <Button size="sm" onClick={saveCrisp} disabled={crispSaving} className="gap-1.5 shrink-0">
                    {crispSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Acesse <a href="https://app.crisp.chat" target="_blank" rel="noopener noreferrer" className="text-primary underline">app.crisp.chat</a> → Settings → Website Settings → copie o Website ID. Deixe vazio para desativar.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <GatewayFormDialog open={dialogOpen} onOpenChange={setDialogOpen} gateway={editingGateway} onSaved={loadGateways} />
    </div>
  );
};

export default Integrations;