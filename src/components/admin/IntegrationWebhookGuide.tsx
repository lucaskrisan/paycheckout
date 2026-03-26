import { useState, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronRight, Copy, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const webhookConfigs = [
  {
    provider: "pagarme",
    label: "Pagar.me",
    color: "#55C157",
    url: `${SUPABASE_URL}/functions/v1/pagarme-webhook`,
    events: ["order.paid", "order.payment_failed", "order.canceled", "charge.paid", "charge.refunded", "subscription.created", "subscription.canceled"],
    instructions: "No painel Pagar.me → Configurações → Webhooks → Novo Webhook → Cole a URL abaixo e selecione os eventos listados.",
    dashboardUrl: "https://dash.pagar.me",
    tips: [
      "Desative o Whitelist de IPs — nossas funções usam IPs dinâmicos.",
      "A chave de API deve ter permissão de Leitura e Escrita (não Somente Leitura).",
      "Use chaves com prefixo sk_live_ para produção."
    ],
  },
  {
    provider: "asaas",
    label: "Asaas",
    color: "#0066FF",
    url: `${SUPABASE_URL}/functions/v1/asaas-webhook`,
    events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED"],
    instructions: "No painel Asaas → Integrações → Webhooks → Adicionar → Cole a URL abaixo e selecione os eventos.",
    dashboardUrl: "https://www.asaas.com/webhooks",
    tips: [
      "O token de autenticação do webhook deve ser configurado como secret na plataforma.",
    ],
  },
  {
    provider: "mercadopago",
    label: "Mercado Pago",
    color: "#009EE3",
    url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
    events: ["payment", "merchant_order"],
    instructions: "No painel do Mercado Pago → Seu negócio → Configurações → Webhooks → Cole a URL abaixo.",
    dashboardUrl: "https://www.mercadopago.com.br/developers/panel/app",
    tips: [],
  },
  {
    provider: "stripe",
    label: "Stripe",
    color: "#635BFF",
    url: `${SUPABASE_URL}/functions/v1/stripe-webhook`,
    events: ["checkout.session.completed", "payment_intent.succeeded", "charge.refunded"],
    instructions: "No Stripe Dashboard → Developers → Webhooks → Add endpoint → Cole a URL abaixo.",
    dashboardUrl: "https://dashboard.stripe.com/webhooks",
    tips: [
      "Copie o Signing Secret gerado pelo Stripe e configure como secret na plataforma."
    ],
  },
];

const STORAGE_KEY = "integration_guide_dismissed";

interface Props {
  installedProviders: string[];
}

const IntegrationWebhookGuide = ({ installedProviders }: Props) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [expanded, setExpanded] = useState(!dismissed);
  const [openProvider, setOpenProvider] = useState<string | null>(null);

  const hasAnyGateway = installedProviders.length > 0;

  useEffect(() => {
    if (!hasAnyGateway) {
      setExpanded(true);
    }
  }, [hasAnyGateway]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    setExpanded(false);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  const relevantConfigs = hasAnyGateway
    ? webhookConfigs.filter(w => installedProviders.includes(w.provider))
    : webhookConfigs;

  return (
    <div className="rounded-lg bg-card border border-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-muted/30 transition-colors"
      >
        <BookOpen className="w-4 h-4 text-primary" />
        <div className="text-left flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            Guia de Integração de Gateways
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {hasAnyGateway
              ? "Configure os webhooks dos seus gateways para receber confirmações de pagamento"
              : "⚡ Nenhum gateway instalado — siga o guia para começar a vender"}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Intro */}
          <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
            <p className="text-[11px] text-amber-300/80 leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Sem o webhook configurado, os pagamentos não serão confirmados automaticamente.
                A URL é a mesma para todos os produtores — basta copiar e colar no painel do gateway.
              </span>
            </p>
          </div>

          {/* Steps overview */}
          <div className="grid gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">1</span>
              <span className="text-xs text-muted-foreground">Instale o gateway desejado no catálogo abaixo</span>
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">2</span>
              <span className="text-xs text-muted-foreground">Preencha as credenciais (API Key / Secret Key)</span>
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">3</span>
              <span className="text-xs text-muted-foreground">Copie a URL do webhook abaixo e cole no painel do gateway</span>
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">4</span>
              <span className="text-xs text-muted-foreground">Ative o gateway e faça uma venda de teste</span>
            </div>
          </div>

          {/* Webhook URLs per provider */}
          <div className="space-y-2 mt-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              URLs de Webhook por Gateway
            </h3>
            {relevantConfigs.map((wh) => (
              <WebhookCard
                key={wh.provider}
                config={wh}
                isOpen={openProvider === wh.provider}
                onToggle={() => setOpenProvider(openProvider === wh.provider ? null : wh.provider)}
                onCopy={copyUrl}
                isInstalled={installedProviders.includes(wh.provider)}
              />
            ))}
          </div>

          {/* Dismiss */}
          {!dismissed && hasAnyGateway && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-muted-foreground h-6"
                onClick={handleDismiss}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Entendi, minimizar guia
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WebhookCard = ({
  config,
  isOpen,
  onToggle,
  onCopy,
  isInstalled,
}: {
  config: (typeof webhookConfigs)[0];
  isOpen: boolean;
  onToggle: () => void;
  onCopy: (url: string) => void;
  isInstalled: boolean;
}) => {
  return (
    <div className="rounded-md bg-muted/20 border border-border/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.label.charAt(0)}
        </div>
        <span className="text-xs font-medium text-foreground text-left flex-1">
          {config.label}
        </span>
        {isInstalled && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-green-500/50 text-green-400">
            Instalado
          </Badge>
        )}
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pl-12 space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {config.instructions}
          </p>

          {/* Webhook URL */}
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] bg-background/80 border border-border/50 rounded px-2 py-1.5 text-foreground font-mono break-all select-all">
              {config.url}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onCopy(config.url)}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>

          {/* Events */}
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Eventos:</span>
            {config.events.map((ev) => (
              <Badge key={ev} variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                {ev}
              </Badge>
            ))}
          </div>

          {/* Tips */}
          {config.tips.length > 0 && (
            <div className="space-y-1">
              {config.tips.map((tip, i) => (
                <p key={i} className="text-[10px] text-muted-foreground/80 italic leading-relaxed">
                  💡 {tip}
                </p>
              ))}
            </div>
          )}

          {/* External link */}
          <a
            href={config.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir painel do {config.label}
          </a>
        </div>
      )}
    </div>
  );
};

export default IntegrationWebhookGuide;
