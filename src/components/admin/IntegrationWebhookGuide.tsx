import { useState, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronRight, Copy, CheckCircle2, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface StepDetail {
  title: string;
  description: string;
  warning?: string;
}

interface EventCategory {
  category: string;
  action: "marcar_todos" | "marcar_alguns" | "nao_marcar";
  events?: string[];
  note?: string;
}

interface WebhookConfig {
  provider: string;
  label: string;
  color: string;
  initials: string;
  url: string;
  eventCategories: EventCategory[];
  dashboardUrl: string;
  stepByStep: StepDetail[];
  importantNotes: string[];
  commonMistakes: string[];
}

const webhookConfigs: WebhookConfig[] = [
  {
    provider: "pagarme",
    label: "Pagar.me",
    color: "#55C157",
    initials: "Pg",
    url: `${SUPABASE_URL}/functions/v1/pagarme-webhook`,
    eventCategories: [
      { category: "PEDIDO", action: "marcar_alguns", events: ["order.paid", "order.payment_failed", "order.canceled"], note: "Clique no \"+\" ao lado de PEDIDO para expandir. Marque apenas estes 3 eventos." },
      { category: "COBRANÇA", action: "marcar_alguns", events: ["charge.paid", "charge.refunded"], note: "Clique no \"+\" ao lado de COBRANÇA para expandir. Marque apenas estes 2 eventos." },
      { category: "ASSINATURA", action: "marcar_alguns", events: ["subscription.created", "subscription.canceled"], note: "Clique no \"+\" ao lado de ASSINATURA. Marque apenas estes 2 eventos." },
      { category: "ANTECIPAÇÃO", action: "nao_marcar" },
      { category: "CARTÃO", action: "nao_marcar" },
      { category: "CHECKOUT", action: "nao_marcar" },
      { category: "CLIENTE", action: "nao_marcar" },
      { category: "CONTA BANCÁRIA", action: "nao_marcar" },
      { category: "DESCONTO", action: "nao_marcar" },
      { category: "ENDEREÇO", action: "nao_marcar" },
      { category: "FATURA", action: "nao_marcar" },
      { category: "ITEM DA ASSINATURA", action: "nao_marcar" },
      { category: "ITEM DO PEDIDO", action: "nao_marcar" },
      { category: "ITEM DO PLANO", action: "nao_marcar" },
      { category: "LINK DE PAGAMENTO", action: "nao_marcar" },
      { category: "PLANO", action: "nao_marcar" },
      { category: "RECEBEDOR", action: "nao_marcar" },
      { category: "TRANSFERÊNCIA", action: "nao_marcar" },
      { category: "USO", action: "nao_marcar" },
    ],
    dashboardUrl: "https://dash.pagar.me",
    stepByStep: [
      {
        title: "1. Acesse o painel da Pagar.me",
        description: "Entre em dash.pagar.me com seu login e senha da Pagar.me.",
      },
      {
        title: "2. Vá até Configurações → Webhooks",
        description: "No menu lateral esquerdo, clique em CONFIGURAÇÕES (pode aparecer como ícone de engrenagem). Depois clique em \"Webhooks\" na lista de sub-menus.",
      },
      {
        title: "3. Clique em \"Criar Webhook\" ou \"Novo\"",
        description: "No canto superior direito da página de Webhooks, clique no botão para criar um novo webhook.",
      },
      {
        title: "4. Ative o Status",
        description: "O toggle de \"Status\" deve estar ATIVO (verde). Isso garante que o webhook vai funcionar imediatamente.",
      },
      {
        title: "5. Cole a URL do webhook",
        description: "No campo \"URL\", cole EXATAMENTE a URL abaixo. ⚠️ NÃO coloque seu e-mail neste campo — precisa ser a URL técnica que começa com https://",
        warning: "O campo URL deve conter uma URL (endereço web), NÃO um e-mail. Exemplo correto: https://viplto... Exemplo errado: seuemail@gmail.com",
      },
      {
        title: "6. Configure o máximo de tentativas",
        description: "No campo \"Máximo de tentativas\", coloque o número 3 (três). Isso significa que se a primeira tentativa falhar, o sistema vai tentar mais 2 vezes.",
      },
      {
        title: "7. Selecione os eventos obrigatórios",
        description: "Role a página para baixo até a seção \"Eventos\". Você precisa marcar os eventos específicos listados abaixo. Clique no \"+\" ao lado de cada categoria para expandir e marcar os eventos individuais.",
      },
      {
        title: "8. Salve o webhook",
        description: "Clique no botão \"Salvar\" ou \"Criar\" no final da página. O webhook será ativado imediatamente.",
      },
    ],
    importantNotes: [
      "A chave de API (API Key) deve ter permissão de \"Leitura e Escrita\" — NÃO use chaves com permissão \"Somente Leitura\".",
      "Use chaves com prefixo sk_live_ para produção. Chaves com sk_test_ são apenas para testes.",
      "Desative o \"Whitelist de IPs\" nas configurações da Pagar.me. Nossas funções usam IPs dinâmicos que mudam a cada execução.",
      "A \"Habilitar autenticação\" pode ficar desativada — nosso sistema já valida por assinatura HMAC.",
    ],
    commonMistakes: [
      "❌ Colocar e-mail no campo URL — o campo URL aceita APENAS endereços web (https://...)",
      "❌ Usar chave de API com permissão \"Somente Leitura\" — precisa ser \"Leitura e Escrita\"",
      "❌ Esquecer de ativar o toggle de Status — o webhook fica inativo e não recebe notificações",
      "❌ Não selecionar os eventos corretos — sem os eventos marcados, nenhuma notificação é enviada",
      "❌ Deixar o Whitelist de IPs ativo — bloqueia nossas funções e os pagamentos não são confirmados",
    ],
  },
  {
    provider: "asaas",
    label: "Asaas",
    color: "#0066FF",
    initials: "As",
    url: `${SUPABASE_URL}/functions/v1/asaas-webhook`,
    eventCategories: [
      { category: "PAGAMENTO", action: "marcar_alguns", events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED"], note: "Marque apenas estes 4 eventos de pagamento." },
    ],
    dashboardUrl: "https://www.asaas.com",
    stepByStep: [
      {
        title: "1. Acesse o painel do Asaas",
        description: "Entre em www.asaas.com com seu login e senha.",
      },
      {
        title: "2. Vá até Integrações",
        description: "No menu lateral, clique em \"Integrações\" ou \"Configurações\" → \"Integrações\".",
      },
      {
        title: "3. Clique em \"Webhooks\"",
        description: "Na página de integrações, localize a seção de Webhooks e clique para configurar.",
      },
      {
        title: "4. Adicione um novo webhook",
        description: "Clique em \"Adicionar\" ou \"Novo webhook\".",
      },
      {
        title: "5. Cole a URL do webhook",
        description: "No campo \"URL\", cole EXATAMENTE a URL abaixo. ⚠️ Este campo aceita APENAS URLs (endereços web começando com https://).",
        warning: "NÃO coloque e-mail no campo URL. Cole apenas o endereço técnico que começa com https://",
      },
      {
        title: "6. Selecione os eventos",
        description: "Marque os eventos listados abaixo: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE e PAYMENT_REFUNDED.",
      },
      {
        title: "7. Salve",
        description: "Clique em \"Salvar\" para ativar o webhook.",
      },
    ],
    importantNotes: [
      "A API Key do Asaas está disponível em Configurações → Integrações → Chave de API.",
      "Use a chave de Produção para vendas reais. A chave Sandbox é apenas para testes.",
    ],
    commonMistakes: [
      "❌ Usar a chave de Sandbox em produção — as vendas reais não serão processadas",
      "❌ Colocar e-mail no campo URL — precisa ser a URL técnica (https://...)",
    ],
  },
  {
    provider: "mercadopago",
    label: "Mercado Pago",
    color: "#009EE3",
    initials: "MP",
    url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
    eventCategories: [
      { category: "Pagamentos", action: "marcar_todos", note: "Marque \"Pagamentos\" (payment)." },
      { category: "Ordens", action: "marcar_todos", note: "Marque \"Ordens\" (merchant_order)." },
    ],
    dashboardUrl: "https://www.mercadopago.com.br/developers/panel/app",
    stepByStep: [
      {
        title: "1. Acesse o painel de desenvolvedor",
        description: "Entre em mercadopago.com.br/developers/panel com sua conta do Mercado Pago.",
      },
      {
        title: "2. Selecione sua aplicação",
        description: "Na lista de aplicações, clique na aplicação que você está usando para receber pagamentos.",
      },
      {
        title: "3. Vá até \"Webhooks\"",
        description: "No menu da aplicação, clique em \"Webhooks\" ou \"Notificações IPN\".",
      },
      {
        title: "4. Configure a URL de notificação",
        description: "No campo \"URL de produção\", cole EXATAMENTE a URL abaixo.",
        warning: "Cole apenas a URL técnica (https://...), NÃO coloque e-mail.",
      },
      {
        title: "5. Selecione os eventos",
        description: "Marque \"Pagamentos\" (payment) e \"Ordens\" (merchant_order).",
      },
      {
        title: "6. Salve as configurações",
        description: "Clique em \"Salvar\" para ativar as notificações.",
      },
    ],
    importantNotes: [
      "O Access Token está em Credenciais → Produção → Access Token.",
      "Use o Access Token de PRODUÇÃO, não o de teste.",
    ],
    commonMistakes: [
      "❌ Usar credenciais de teste em produção",
      "❌ Colocar e-mail no campo URL",
    ],
  },
  {
    provider: "stripe",
    label: "Stripe",
    color: "#635BFF",
    initials: "S",
    url: `${SUPABASE_URL}/functions/v1/stripe-webhook`,
    eventCategories: [
      { category: "Checkout", action: "marcar_alguns", events: ["checkout.session.completed"], note: "Marque este evento." },
      { category: "Payment Intent", action: "marcar_alguns", events: ["payment_intent.succeeded"], note: "Marque este evento." },
      { category: "Charge", action: "marcar_alguns", events: ["charge.refunded"], note: "Marque este evento." },
    ],
    dashboardUrl: "https://dashboard.stripe.com/webhooks",
    stepByStep: [
      {
        title: "1. Acesse o Stripe Dashboard",
        description: "Entre em dashboard.stripe.com com sua conta.",
      },
      {
        title: "2. Vá até Developers → Webhooks",
        description: "No menu superior, clique em \"Developers\" e depois em \"Webhooks\".",
      },
      {
        title: "3. Clique em \"Add endpoint\"",
        description: "No canto superior direito, clique em \"Add endpoint\".",
      },
      {
        title: "4. Cole a URL do webhook",
        description: "No campo \"Endpoint URL\", cole EXATAMENTE a URL abaixo.",
        warning: "Cole apenas a URL (https://...), NÃO coloque e-mail.",
      },
      {
        title: "5. Selecione os eventos",
        description: "Clique em \"Select events\" e marque: checkout.session.completed, payment_intent.succeeded e charge.refunded.",
      },
      {
        title: "6. Copie o Signing Secret",
        description: "Após salvar, o Stripe vai gerar um \"Signing Secret\" (começa com whsec_). Copie este código — você vai precisar configurá-lo como secret na plataforma.",
      },
    ],
    importantNotes: [
      "O Signing Secret é gerado APÓS criar o webhook. Copie e guarde com segurança.",
      "Certifique-se de estar no modo \"Live\" (produção) e não no modo \"Test\".",
    ],
    commonMistakes: [
      "❌ Esquecer de copiar o Signing Secret após criar o webhook",
      "❌ Criar o webhook no modo Test ao invés de Live",
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
    toast.success("URL copiada para a área de transferência!");
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
            📋 Guia de Integração — Como configurar seu Gateway
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {hasAnyGateway
              ? "Configure os webhooks para que os pagamentos sejam confirmados automaticamente"
              : "⚡ Nenhum gateway instalado — siga o passo a passo para começar a vender"}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Critical warning */}
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
            <p className="text-[11px] text-destructive leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>ATENÇÃO:</strong> Sem o webhook configurado corretamente, seus pagamentos <strong>NÃO serão confirmados automaticamente</strong>. 
                Isso significa que mesmo que o cliente pague, o pedido vai ficar como "Pendente" para sempre.
              </span>
            </p>
          </div>

          {/* What is a webhook */}
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                <p><strong className="text-foreground">O que é um Webhook?</strong></p>
                <p>É um "endereço de notificação" — uma URL que o gateway (Pagar.me, Asaas, etc.) usa para avisar nosso sistema quando um pagamento é aprovado, recusado ou reembolsado.</p>
                <p>Sem ele, nosso sistema nunca fica sabendo que o cliente pagou.</p>
              </div>
            </div>
          </div>

          {/* Overview steps */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground">Visão geral — 4 passos para começar a vender:</h3>
            <div className="grid gap-2">
              {[
                { n: "1", text: "Instale o gateway desejado", sub: "Escolha no catálogo abaixo (ex: Pagar.me, Asaas, Mercado Pago ou Stripe)" },
                { n: "2", text: "Preencha suas credenciais", sub: "Cole a API Key e Secret Key do seu gateway. Essas chaves ficam no painel do gateway." },
                { n: "3", text: "Configure o Webhook", sub: "Copie a URL abaixo e cole no painel do gateway, na seção de Webhooks. Marque os eventos corretos." },
                { n: "4", text: "Ative e teste", sub: "Ative o gateway aqui na plataforma e faça uma venda de teste para confirmar que tudo funciona." },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-2.5 px-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    {step.n}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-foreground">{step.text}</span>
                    <p className="text-[10px] text-muted-foreground">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-gateway detailed guides */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              🔧 Tutorial detalhado por Gateway
            </h3>
            {relevantConfigs.map((wh) => (
              <WebhookDetailCard
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
                Já configurei, minimizar guia
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WebhookDetailCard = ({
  config,
  isOpen,
  onToggle,
  onCopy,
  isInstalled,
}: {
  config: WebhookConfig;
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
          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.initials}
        </div>
        <span className="text-xs font-medium text-foreground text-left flex-1">
          Como configurar o {config.label}
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
        <div className="px-3 pb-4 space-y-4">
          {/* Webhook URL - prominent */}
          <div className="rounded-md bg-primary/5 border border-primary/30 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-foreground">
              📋 URL do Webhook do {config.label} — Copie e cole no painel:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-background border border-border rounded px-3 py-2 text-foreground font-mono break-all select-all leading-relaxed">
                {config.url}
              </code>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-[10px] gap-1.5 shrink-0"
                onClick={() => onCopy(config.url)}
              >
                <Copy className="w-3 h-3" />
                Copiar URL
              </Button>
            </div>
            <p className="text-[10px] text-destructive font-medium">
              ⚠️ Cole esta URL no campo "URL" do webhook. NÃO coloque seu e-mail neste campo!
            </p>
          </div>

          {/* Step by step */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-foreground">Passo a passo detalhado:</h4>
            <div className="space-y-2">
              {config.stepByStep.map((step, i) => (
                <div key={i} className="rounded bg-background/50 border border-border/20 p-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-foreground">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{step.description}</p>
                  {step.warning && (
                    <div className="rounded bg-destructive/10 border border-destructive/20 px-2 py-1.5 mt-1">
                      <p className="text-[10px] text-destructive font-medium leading-relaxed">
                        ⚠️ {step.warning}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Events to select */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-foreground">
              ✅ Eventos que você DEVE marcar:
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {config.events.map((ev) => (
                <Badge key={ev} variant="secondary" className="text-[10px] px-2 py-0.5 font-mono bg-primary/10 text-primary border border-primary/20">
                  {ev}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              No painel do {config.label}, expanda cada categoria de eventos clicando no "+" e marque os itens acima.
            </p>
          </div>

          {/* Important notes */}
          {config.importantNotes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-foreground">📌 Informações importantes:</h4>
              <div className="space-y-1">
                {config.importantNotes.map((note, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/30">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Common mistakes */}
          {config.commonMistakes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-foreground">🚫 Erros comuns — NÃO faça isso:</h4>
              <div className="rounded bg-destructive/5 border border-destructive/15 p-2.5 space-y-1">
                {config.commonMistakes.map((mistake, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">
                    {mistake}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* External link */}
          <a
            href={config.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir painel do {config.label} em nova aba →
          </a>
        </div>
      )}
    </div>
  );
};

export default IntegrationWebhookGuide;
