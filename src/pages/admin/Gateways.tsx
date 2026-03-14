import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

  const handleNew = (provider: "asaas" | "pagarme") => {
    setEditingGateway({
      provider,
      name: provider === "asaas" ? "Asaas Principal" : "Pagar.me Principal",
      environment: "sandbox",
      active: false,
      payment_methods: [],
      config: provider === "asaas" ? defaultAsaasConfig : defaultPagarmeConfig,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Gateways de Pagamento</h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNew("asaas")}>
          <Plus className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="font-semibold text-foreground">Adicionar Asaas</p>
          <p className="text-xs text-muted-foreground">PIX e Cartão de Crédito</p>
        </Card>
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNew("pagarme")}>
          <Plus className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="font-semibold text-foreground">Adicionar Pagar.me</p>
          <p className="text-xs text-muted-foreground">PIX e Cartão de Crédito</p>
        </Card>
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNew("mercadopago")}>
          <Plus className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="font-semibold text-foreground">Adicionar Mercado Pago</p>
          <p className="text-xs text-muted-foreground">PIX e Cartão de Crédito</p>
        </Card>
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleNew("stripe")}>
          <Plus className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="font-semibold text-foreground">Adicionar Stripe</p>
          <p className="text-xs text-muted-foreground">Cartão Internacional + PIX</p>
        </Card>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : gateways.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum gateway configurado.</p>
      ) : (
        <div className="space-y-4">
          {gateways.map((gw) => (
            <Card key={gw.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-display">{gw.name}</CardTitle>
                    <Badge variant={gw.active ? "default" : "secondary"}>
                      {gw.active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">{providerLabels[gw.provider]}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {gw.environment === "production" ? "Produção" : "Sandbox"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(gw)}>
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(gw.id!)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {gw.payment_methods.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs">
                      {m === "pix" ? "PIX" : m === "credit_card" ? "Cartão de Crédito" : m}
                    </Badge>
                  ))}
                  {gw.payment_methods.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum método ativo</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

export default Gateways;
