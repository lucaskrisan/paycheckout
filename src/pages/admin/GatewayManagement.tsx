import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Trash2, ArrowRightLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import GatewayFormDialog from "@/components/admin/GatewayFormDialog";
import IntegrationWebhookGuide from "@/components/admin/IntegrationWebhookGuide";
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
}

const catalog: CatalogItem[] = [
  { id: "as", provider: "asaas", name: "Asaas", description: "Pagamentos via PIX e Cartão de Crédito com integração simplificada, suporte dedicado e alta taxa de aprovação.", color: "#0066FF", initials: "As" },
  { id: "pg", provider: "pagarme", name: "Pagar.me", description: "Plataforma completa de pagamentos com suporte a PIX, cartão de crédito e boleto. Integração robusta e painel intuitivo.", color: "#55C157", initials: "Pg", badge: "Recomendado" },
  { id: "mp", provider: "mercadopago", name: "Mercado Pago", description: "Fintech da América Latina criada pelo Mercado Livre, focada em vendas e cobranças para empresas.", color: "#009EE3", initials: "MP" },
  { id: "st", provider: "stripe", name: "Stripe", description: "Perfeito para compras internacionais, aceita pagamentos de todo o mundo com segurança e confiabilidade.", color: "#635BFF", initials: "S" },
];

const defaultConfigs: Record<string, Record<string, any>> = {
  asaas: { pix_fee_percent: 0, pix_fee_fixed: 0.44, pix_validity_days: 1, pix_timer_minutes: 30, debit_fee_percent: 1.89, debit_fee_fixed: 0.35, credit_fee_1x: 2.99, credit_fee_2_6x: 2.99, credit_fee_7_12x: 2.99, credit_fee_13_21x: 4.29, credit_processing_fee: 0.44, max_installments: 12, min_installment_value: 5, free_installments: 1, interest_rate_initial: 6.58, interest_rate_incremental: 1.45, billing_description: "" },
  pagarme: { pix_fee_percent: 0.89, pix_fee_fixed: 0.44, pix_timer_minutes: 30, credit_fee_1x: 2.99, credit_fee_2_6x: 2.99, credit_fee_7_12x: 2.99, credit_processing_fee: 0.44, soft_descriptor: "", max_installments: 12, min_installment_value: 5, free_installments: 1, interest_rate_initial: 6.58, interest_rate_incremental: 1.45 },
  mercadopago: { pix_fee_percent: 0.99, pix_fee_fixed: 0, pix_timer_minutes: 30, credit_fee_1x: 4.98, credit_fee_2_6x: 4.98, credit_fee_7_12x: 4.98, credit_processing_fee: 0, max_installments: 12, min_installment_value: 5, free_installments: 1, interest_rate_initial: 6.58, interest_rate_incremental: 1.45 },
  stripe: { credit_fee_percent: 3.99, credit_fee_fixed: 0.39, pix_fee_percent: 1.5, pix_fee_fixed: 0, pix_timer_minutes: 30, max_installments: 12, min_installment_value: 5 },
};

const SectionHeader = ({ title, dot }: { title: string; dot?: string }) => (
  <div className="flex items-center gap-2.5 pb-1">
    {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">{title}</h2>
  </div>
);

const GatewayManagement = () => {
  const { user } = useAuth();
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayConfig | null>(null);

  useEffect(() => { loadGateways(); }, []);

  const loadGateways = async () => {
    let query = supabase.from("payment_gateways").select("*").order("created_at");
    // Producers only see their own gateways; super admin sees all in the platform section
    if (user?.id) {
      query = query.eq("user_id", user.id);
    }
    const { data, error } = await query;
    if (!data) { if (error) toast.error("Erro ao carregar gateways"); setLoading(false); return; }

    setGateways(data.map((g: any) => ({
      id: g.id, provider: g.provider, name: g.name, environment: g.environment,
      active: g.active, payment_methods: (g.payment_methods as string[]) || [],
      config: (g.config as Record<string, any>) || {},
      user_id: g.user_id,
    })));
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

  const renderGatewayCard = (gw: GatewayConfig) => {
    return (
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
  };

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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Gateways de Pagamento</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seus processadores de pagamento</p>
      </div>

      <IntegrationWebhookGuide installedProviders={installedProviders} />

      {!loading && activeGateways.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Gateways Ativos" dot="bg-green-500" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGateways.map(renderGatewayCard)}
          </div>
        </section>
      )}

      {!loading && inactiveGateways.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Gateways Inativos" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveGateways.map(renderGatewayCard)}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader title="Gateways Disponíveis" />
        <Card className="border-border/30 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Conecte seu gateway de pagamento para processar vendas via PIX e Cartão de Crédito. A taxa da plataforma é de <strong>R$ 0,49 fixo + 3%</strong> sobre o valor de cada venda.
            </p>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {catalog.map(renderCatalogCard)}
        </div>
      </section>

      <GatewayFormDialog open={dialogOpen} onOpenChange={setDialogOpen} gateway={editingGateway} onSaved={loadGateways} />
    </div>
  );
};

export default GatewayManagement;
