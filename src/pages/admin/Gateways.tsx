import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Trash2, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GatewayFormDialog from "@/components/admin/GatewayFormDialog";

export interface GatewayConfig {
  id?: string;
  provider: "asaas" | "pagarme" | "mercadopago" | "stripe";
  name: string;
  environment: "sandbox" | "production";
  active: boolean;
  payment_methods: string[];
  config: Record<string, any>;
}

const providerLabels: Record<string, string> = {
  asaas: "Asaas",
  pagarme: "Pagar.me",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
};

// ─── Gateway catalog ───
interface GatewayCatalogItem {
  id: string;
  provider: "asaas" | "pagarme" | "mercadopago" | "stripe";
  name: string;
  description: string;
  color: string;
  icon: string;
  badge?: string;
  tab: "split" | "sob_demanda";
}

const gatewayCatalog: GatewayCatalogItem[] = [
  // Split tab
  {
    id: "mercadopago",
    provider: "mercadopago",
    name: "Mercado Pago",
    description: "O Mercado Pago é uma fintech da América Latina criada pelo Mercado Livre, focada em vendas e cobranças para empresas.",
    color: "#009EE3",
    icon: "💳",
    tab: "split",
  },
  {
    id: "stripe-split",
    provider: "stripe",
    name: "Stripe",
    description: "O método de pagamento perfeito para compras internacionais, aceita pagamentos de todo o mundo.",
    color: "#635BFF",
    icon: "S",
    tab: "split",
  },
  {
    id: "pagarme-split",
    provider: "pagarme",
    name: "Pagar.me",
    description: "A Pagar.me é uma plataforma completa de pagamentos com suporte a PIX, cartão de crédito e boleto. Integração robusta e painel de controle intuitivo.",
    color: "#55C157",
    icon: "🟢",
    badge: "Mais utilizado",
    tab: "split",
  },
  // Sob Demanda tab
  {
    id: "asaas-od",
    provider: "asaas",
    name: "Asaas",
    description: "A Asaas oferece pagamentos via PIX e Cartão de Crédito com integração simplificada, suporte dedicado e alta taxa de aprovação.",
    color: "#0066FF",
    icon: "A",
    tab: "sob_demanda",
  },
  {
    id: "pagarme-od",
    provider: "pagarme",
    name: "Pagar.me",
    description: "A Pagar.me é uma plataforma completa de pagamentos com suporte a PIX, cartão de crédito e boleto. Integração robusta e painel de controle intuitivo.",
    color: "#55C157",
    icon: "🟢",
    badge: "NOVO",
    tab: "sob_demanda",
  },
  {
    id: "mercadopago-od",
    provider: "mercadopago",
    name: "Mercado Pago",
    description: "O Mercado Pago é uma fintech da América Latina criada pelo Mercado Livre, focada em vendas e cobranças para empresas.",
    color: "#009EE3",
    icon: "💳",
    tab: "sob_demanda",
  },
  {
    id: "stripe-od",
    provider: "stripe",
    name: "Stripe",
    description: "O método de pagamento perfeito para compras internacionais, aceita pagamentos de todo o mundo.",
    color: "#635BFF",
    icon: "S",
    tab: "sob_demanda",
  },
];

const Gateways = () => {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayConfig | null>(null);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    const { data, error } = await supabase.from("payment_gateways").select("*").order("created_at");
    if (data) {
      setGateways(
        data.map((g: any) => ({
          id: g.id,
          provider: g.provider,
          name: g.name,
          environment: g.environment,
          active: g.active,
          payment_methods: (g.payment_methods as string[]) || [],
          config: (g.config as Record<string, any>) || {},
        }))
      );
    }
    if (error) toast.error("Erro ao carregar gateways");
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gateway?")) return;
    const { error } = await supabase.from("payment_gateways").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Gateway excluído");
      loadGateways();
    }
  };

  const handleEdit = (gw: GatewayConfig) => {
    setEditingGateway(gw);
    setDialogOpen(true);
  };

  const handleInstall = (item: GatewayCatalogItem) => {
    const configMap: Record<string, Record<string, any>> = {
      asaas: defaultAsaasConfig,
      pagarme: defaultPagarmeConfig,
      mercadopago: defaultMercadoPagoConfig,
      stripe: defaultStripeConfig,
    };
    setEditingGateway({
      provider: item.provider,
      name: `${item.name} Principal`,
      environment: "sandbox",
      active: false,
      payment_methods: [],
      config: configMap[item.provider],
    });
    setDialogOpen(true);
  };

  const installedProviders = gateways.map((g) => g.provider);

  const renderCatalogCard = (item: GatewayCatalogItem) => {
    const isInstalled = installedProviders.includes(item.provider);
    return (
      <Card
        key={item.id}
        className="border border-border/50 bg-card hover:border-primary/30 transition-all duration-200 flex flex-col justify-between"
      >
        <CardContent className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: item.color }}
            >
              {item.icon.length <= 2 ? item.icon : ""}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{item.name}</span>
                {item.badge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
        </CardContent>
        <div className="px-5 pb-5">
          {isInstalled ? (
            <Button variant="outline" className="w-full" size="sm" disabled>
              Instalado
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full hover:bg-primary/10 hover:text-primary hover:border-primary/50"
              size="sm"
              onClick={() => handleInstall(item)}
            >
              Instalar
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const splitItems = gatewayCatalog.filter((i) => i.tab === "split");
  const sobDemandaItems = gatewayCatalog.filter((i) => i.tab === "sob_demanda");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Gateways de Pagamento</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure seus gateways de pagamento e billing</p>
      </div>

      {/* Installed gateways */}
      {!loading && gateways.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gateways Configurados</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gateways.map((gw) => (
              <Card key={gw.id} className="border border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-display">{gw.name}</CardTitle>
                      <Badge variant={gw.active ? "default" : "secondary"} className="text-[10px]">
                        {gw.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(gw)}>
                        <Settings2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(gw.id!)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{providerLabels[gw.provider]}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {gw.environment === "production" ? "Produção" : "Sandbox"}
                    </Badge>
                    {gw.payment_methods.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">
                        {m === "pix" ? "PIX" : m === "credit_card" ? "Cartão" : m}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Catalog tabs */}
      <Tabs defaultValue="split">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="split" className="gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Split
          </TabsTrigger>
          <TabsTrigger value="sob_demanda" className="gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            Sob Demanda
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
            {splitItems.map(renderCatalogCard)}
          </div>
        </TabsContent>

        <TabsContent value="sob_demanda" className="mt-4 space-y-4">
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground text-sm">Gateways Sob Demanda (Billing)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Gateways que não oferecem sistema de split, ou seja, a taxa não é descontada direto na hora da venda. Nessa modalidade, a taxa do GG fica em R$ 0,49 fixo por venda + 3% sobre o valor total.
              </p>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sobDemandaItems.map(renderCatalogCard)}
          </div>
        </TabsContent>
      </Tabs>

      <GatewayFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        gateway={editingGateway}
        onSaved={loadGateways}
      />
    </div>
  );
};

const defaultAsaasConfig = {
  pix_fee_percent: 0,
  pix_fee_fixed: 0.44,
  pix_validity_days: 1,
  pix_timer_minutes: 30,
  debit_fee_percent: 1.89,
  debit_fee_fixed: 0.35,
  credit_fee_1x: 2.99,
  credit_fee_2_6x: 2.99,
  credit_fee_7_12x: 2.99,
  credit_fee_13_21x: 4.29,
  credit_processing_fee: 0.44,
  max_installments: 12,
  min_installment_value: 5,
  free_installments: 1,
  interest_rate_initial: 6.58,
  interest_rate_incremental: 1.45,
  billing_description: "",
};

const defaultPagarmeConfig = {
  pix_fee_percent: 0.89,
  pix_fee_fixed: 0.44,
  pix_timer_minutes: 30,
  credit_fee_1x: 2.99,
  credit_fee_2_6x: 2.99,
  credit_fee_7_12x: 2.99,
  credit_processing_fee: 0.44,
  soft_descriptor: "",
  max_installments: 12,
  min_installment_value: 5,
  free_installments: 1,
  interest_rate_initial: 6.58,
  interest_rate_incremental: 1.45,
};

const defaultMercadoPagoConfig = {
  pix_fee_percent: 0.99,
  pix_fee_fixed: 0,
  pix_timer_minutes: 30,
  credit_fee_1x: 4.98,
  credit_fee_2_6x: 4.98,
  credit_fee_7_12x: 4.98,
  credit_processing_fee: 0,
  max_installments: 12,
  min_installment_value: 5,
  free_installments: 1,
  interest_rate_initial: 6.58,
  interest_rate_incremental: 1.45,
};

const defaultStripeConfig = {
  credit_fee_percent: 3.99,
  credit_fee_fixed: 0.39,
  pix_fee_percent: 1.5,
  pix_fee_fixed: 0,
  pix_timer_minutes: 30,
  max_installments: 12,
  min_installment_value: 5,
};

export default Gateways;
