import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Send, Sparkles, ShieldAlert, ShieldCheck, ShieldQuestion, Copy, BookOpen, MessageCircle, Map } from "lucide-react";
import { toast } from "sonner";

type ChatMsg = { role: "user" | "assistant"; content: string };

type Risk = "green" | "yellow" | "red";

type FeatureArea = {
  name: string;
  risk: Risk;
  desc: string;
  examples: string[];
};

type FeatureGroup = {
  title: string;
  icon: string;
  areas: FeatureArea[];
};

// ════════════════════════════════════════════════════════════════════════════════
// MAPA COMPLETO DAS FUNCIONALIDADES — agrupadas por risco e domínio
// ════════════════════════════════════════════════════════════════════════════════
const FEATURE_MAP: FeatureGroup[] = [
  {
    title: "Pagamentos & Webhooks",
    icon: "💳",
    areas: [
      { name: "Webhook Stripe", risk: "red", desc: "Recebe confirmação de venda em USD. Mexer aqui pode bloquear vendas internacionais.", examples: ["Adicionar log de debug → CRÍTICO", "Mudar fluxo de assinatura → CRÍTICO"] },
      { name: "Webhook Pagar.me", risk: "red", desc: "Recebe confirmação de cartão BR. Bug aqui = vendas BR perdidas.", examples: ["Adicionar evento → CRÍTICO", "Corrigir status → CRÍTICO"] },
      { name: "Webhook Asaas", risk: "red", desc: "Recebe confirmação PIX/cartão BR. Crítico pra recargas de saldo.", examples: ["Mudar lógica → CRÍTICO"] },
      { name: "Webhook Mercado Pago", risk: "red", desc: "Confirmação de venda Mercado Pago.", examples: ["Mudar fluxo → CRÍTICO"] },
      { name: "process-order-paid (shared)", risk: "red", desc: "Função compartilhada que dispara TODOS os efeitos pós-venda (acesso, e-mail, webhook, push, fee).", examples: ["Qualquer mudança → CRÍTICO"] },
      { name: "accrue_platform_fee (trigger DB)", risk: "red", desc: "Calcula taxa R$0,99 + 2% (isenção primeiros R$1000). Mexer = financeiro errado.", examples: ["Mudar percentual → CRÍTICO + aprovação"] },
      { name: "Gateway Management (UI)", risk: "yellow", desc: "Tela onde produtor cadastra chaves do gateway.", examples: ["Mudar layout → SEGURO", "Mudar lógica de salvar → CUIDADO"] },
      { name: "Criação de pagamento PIX/Cartão", risk: "red", desc: "Funções create-*-payment. Erro = venda não gera.", examples: ["Adicionar campo → CUIDADO", "Mudar valor → CRÍTICO"] },
    ],
  },
  {
    title: "Checkout",
    icon: "🛒",
    areas: [
      { name: "Página de Checkout", risk: "yellow", desc: "Formulário público. UI é OK; lógica de pagamento é crítica.", examples: ["Mudar cor/texto → SEGURO", "Mudar validação CPF → CUIDADO"] },
      { name: "Checkout Builder (drag-drop)", risk: "green", desc: "Editor visual. Toda mudança visual aqui é segura.", examples: ["Adicionar componente → SEGURO"] },
      { name: "Order Bumps", risk: "yellow", desc: "Ofertas adicionais no checkout (limite 50).", examples: ["UI → SEGURO", "Lógica de cálculo → CUIDADO"] },
      { name: "Upsell One-Click", risk: "yellow", desc: "Página pós-venda com oferta extra.", examples: ["UI → SEGURO", "Lógica de cobrança → CUIDADO"] },
      { name: "Cupons", risk: "yellow", desc: "Validação e aplicação de descontos.", examples: ["UI → SEGURO", "Cálculo desconto → CUIDADO"] },
      { name: "PIX Modal", risk: "green", desc: "Modal com QR Code e cronômetro.", examples: ["Mudar layout → SEGURO"] },
      { name: "Stripe Payment Element", risk: "yellow", desc: "Componente Stripe pra cartão internacional.", examples: ["Mudar visual → SEGURO", "Mudar fluxo → CUIDADO"] },
    ],
  },
  {
    title: "Auth & Segurança",
    icon: "🔒",
    areas: [
      { name: "Login / Cadastro", risk: "yellow", desc: "Fluxo de autenticação (e-mail/senha + Google).", examples: ["UI → SEGURO", "Mudar provider → CUIDADO"] },
      { name: "Reset Password", risk: "yellow", desc: "Página /reset-password. Crítica para recuperação.", examples: ["Texto/UI → SEGURO", "Lógica → CUIDADO"] },
      { name: "RLS Policies (todas tabelas)", risk: "red", desc: "Regras de acesso ao banco. Erro = vazamento de dados.", examples: ["Qualquer mudança → CRÍTICO"] },
      { name: "user_roles (super_admin)", risk: "red", desc: "Tabela de papéis. Mexer mal = privilege escalation.", examples: ["Qualquer mudança → CRÍTICO"] },
      { name: "Turnstile (anti-bot)", risk: "yellow", desc: "Cloudflare Turnstile no login/checkout.", examples: ["Desativar → CUIDADO (abre porta pra bot)"] },
      { name: "Verificação de Produtor (KYC)", risk: "yellow", desc: "Upload de docs pra aprovação.", examples: ["UI → SEGURO", "Bypass → PROIBIDO"] },
      { name: "Rate Limiting", risk: "yellow", desc: "Bloqueio anti-força-bruta no login/checkout.", examples: ["Ajustar limite → CUIDADO"] },
    ],
  },
  {
    title: "E-mails (Resend)",
    icon: "📧",
    areas: [
      { name: "Confirmação de Compra", risk: "yellow", desc: "E-mail enviado após venda aprovada.", examples: ["Mudar texto → SEGURO", "Mudar lógica de envio → CUIDADO"] },
      { name: "Carrinho Abandonado", risk: "yellow", desc: "E-mail automático pra recuperar venda.", examples: ["Mudar template → SEGURO"] },
      { name: "Auth Emails (login/signup)", risk: "yellow", desc: "E-mails do Supabase Auth.", examples: ["Mudar template → SEGURO", "Mudar trigger → CUIDADO"] },
      { name: "Central de E-mails (admin)", risk: "green", desc: "UI pra gerenciar templates.", examples: ["Mudar layout → SEGURO"] },
      { name: "Process Email Queue", risk: "yellow", desc: "Cron que processa fila de e-mails (pgmq).", examples: ["Ajustar batch → CUIDADO"] },
    ],
  },
  {
    title: "Área de Membros",
    icon: "🎓",
    areas: [
      { name: "Cursos/Módulos/Lições", risk: "green", desc: "CRUD de conteúdo do curso.", examples: ["UI → SEGURO", "Adicionar campo → SEGURO"] },
      { name: "Member Lesson Viewer", risk: "green", desc: "Player de vídeo/conteúdo da lição.", examples: ["UI → SEGURO"] },
      { name: "Lesson Materials (anexos)", risk: "green", desc: "Upload/download de PDFs (bucket privado).", examples: ["UI → SEGURO", "Mudar bucket → CUIDADO"] },
      { name: "Reviews (avaliações)", risk: "green", desc: "Sistema de notas/comentários.", examples: ["UI → SEGURO"] },
      { name: "Member Access Token", risk: "yellow", desc: "Token único de acesso ao curso.", examples: ["UI → SEGURO", "Mudar geração → CRÍTICO"] },
      { name: "Drip Content", risk: "yellow", desc: "Liberação programada de conteúdo.", examples: ["UI → SEGURO", "Lógica de data → CUIDADO"] },
      { name: "Nina Chat (IA)", risk: "yellow", desc: "Assistente IA dentro da área de membros.", examples: ["Mudar prompt → SEGURO", "Mudar modelo → CUIDADO"] },
    ],
  },
  {
    title: "WhatsApp (Evolution API)",
    icon: "💬",
    areas: [
      { name: "Conexão WhatsApp", risk: "yellow", desc: "QR code, status da instância.", examples: ["UI → SEGURO"] },
      { name: "Templates de Mensagem", risk: "green", desc: "CRUD de templates.", examples: ["UI → SEGURO"] },
      { name: "Flow Builder (drag-drop)", risk: "green", desc: "Editor visual de fluxo.", examples: ["UI → SEGURO"] },
      { name: "Cron de Disparo", risk: "yellow", desc: "pg_cron que dispara mensagens.", examples: ["Ajustar horário → CUIDADO"] },
      { name: "Webhook WhatsApp (entrada)", risk: "yellow", desc: "Recebe mensagens de clientes.", examples: ["Mudar parsing → CUIDADO"] },
    ],
  },
  {
    title: "Tracking & Marketing",
    icon: "📊",
    areas: [
      { name: "Meta Pixel + CAPI (v22)", risk: "yellow", desc: "Rastreamento Facebook. Versão atual estável: v22.", examples: ["UI → SEGURO", "Mudar versão API → CRÍTICO (testar staging)"] },
      { name: "EMQ Snapshots", risk: "green", desc: "Histórico de qualidade de evento.", examples: ["UI → SEGURO"] },
      { name: "Pixel Token Health", risk: "yellow", desc: "Cron que valida tokens.", examples: ["UI → SEGURO", "Lógica → CUIDADO"] },
      { name: "Meta Ads (Insights)", risk: "yellow", desc: "Painel de campanhas.", examples: ["UI → SEGURO"] },
      { name: "UTM Attribution", risk: "green", desc: "Captura UTMs em carrinhos.", examples: ["UI → SEGURO"] },
      { name: "Customer Journey Feed", risk: "green", desc: "Timeline de eventos do cliente.", examples: ["UI → SEGURO"] },
    ],
  },
  {
    title: "Dashboard & Análise",
    icon: "📈",
    areas: [
      { name: "Dashboard (cards/charts)", risk: "green", desc: "Página principal. Toda mudança visual é segura.", examples: ["UI → SEGURO", "Adicionar card → SEGURO"] },
      { name: "get_dashboard_metrics (RPC)", risk: "yellow", desc: "Função SQL que agrega dados.", examples: ["Adicionar métrica → CUIDADO"] },
      { name: "Analytics", risk: "green", desc: "Página de análise detalhada.", examples: ["UI → SEGURO"] },
      { name: "Métricas (Producer)", risk: "green", desc: "Métricas pessoais do produtor.", examples: ["UI → SEGURO"] },
      { name: "Brazil Map", risk: "green", desc: "Mapa de vendas por estado.", examples: ["UI → SEGURO"] },
    ],
  },
  {
    title: "Financeiro & Billing",
    icon: "💰",
    areas: [
      { name: "billing_accounts (tabela)", risk: "red", desc: "Saldo, tier, cartão. Protegida por trigger.", examples: ["Qualquer alteração direta → BLOQUEADO"] },
      { name: "billing-auto-recharge", risk: "red", desc: "Função de recarga automática via Asaas.", examples: ["Mudar lógica → CRÍTICO"] },
      { name: "billing-recharge (UI)", risk: "yellow", desc: "Tela de recarga manual.", examples: ["UI → SEGURO", "Lógica → CUIDADO"] },
      { name: "Painel Financeiro (producer)", risk: "green", desc: "Visualização de saldo/extrato.", examples: ["UI → SEGURO"] },
      { name: "Credit Tiers (Iron→Diamond)", risk: "yellow", desc: "Sistema de níveis baseado em vendas.", examples: ["UI → SEGURO", "Mudar regra → CUIDADO"] },
    ],
  },
  {
    title: "Produtos & Catálogo",
    icon: "📦",
    areas: [
      { name: "Produtos (CRUD)", risk: "green", desc: "Tela de criação/edição.", examples: ["UI → SEGURO", "Adicionar campo → SEGURO"] },
      { name: "Product Edit (abas)", risk: "green", desc: "Editor com abas (Geral/Membros/Pagamento).", examples: ["UI → SEGURO"] },
      { name: "Moderação de Produto", risk: "yellow", desc: "Aprovação manual de produtos.", examples: ["UI → SEGURO", "Lógica → CUIDADO"] },
      { name: "Sync Stripe (sync-product-stripe)", risk: "yellow", desc: "Sincroniza produto com Stripe.", examples: ["UI → SEGURO", "Lógica → CUIDADO"] },
      { name: "Image Upload (storage)", risk: "green", desc: "Upload de imagem (bucket público).", examples: ["UI → SEGURO"] },
    ],
  },
  {
    title: "Domínios & Infraestrutura",
    icon: "🌐",
    areas: [
      { name: "Custom Domains (Cloudflare)", risk: "yellow", desc: "Domínios customizados de checkout.", examples: ["UI → SEGURO", "Lógica DNS → CUIDADO"] },
      { name: "PWA Settings", risk: "green", desc: "Manifest, ícones, splash.", examples: ["UI → SEGURO"] },
      { name: "Service Worker (sw.js)", risk: "yellow", desc: "Cache offline.", examples: ["Mudar cache → CUIDADO (pode quebrar)"] },
      { name: "OneSignal Push", risk: "yellow", desc: "Notificações push.", examples: ["UI → SEGURO", "Mudar config → CUIDADO"] },
    ],
  },
  {
    title: "Integrações Externas",
    icon: "🔌",
    areas: [
      { name: "AppSell", risk: "yellow", desc: "Plataforma de entrega (login_url).", examples: ["UI → SEGURO", "Mudar URL → CUIDADO"] },
      { name: "UTMify", risk: "yellow", desc: "Atribuição externa.", examples: ["UI → SEGURO"] },
      { name: "Webhooks Externos (saída)", risk: "yellow", desc: "Disparo pra URLs do produtor.", examples: ["UI → SEGURO", "Mudar payload → CUIDADO"] },
      { name: "API Keys (admin)", risk: "yellow", desc: "Tela de gerenciamento de chaves.", examples: ["UI → SEGURO"] },
    ],
  },
  {
    title: "Super Admin",
    icon: "👑",
    areas: [
      { name: "Super Admin Dashboard", risk: "green", desc: "Painel CEO com visão geral.", examples: ["UI → SEGURO"] },
      { name: "Blacklist (anti-fraude)", risk: "yellow", desc: "Lista de e-mails/CPFs bloqueados.", examples: ["UI → SEGURO", "Bypass → PROIBIDO"] },
      { name: "Verification Review", risk: "yellow", desc: "Aprovação de KYC.", examples: ["UI → SEGURO"] },
      { name: "Product Review", risk: "yellow", desc: "Moderação de produtos.", examples: ["UI → SEGURO"] },
      { name: "Cart Control", risk: "green", desc: "Gerenciamento de carrinhos.", examples: ["UI → SEGURO"] },
      { name: "System Health (Fiscalizar)", risk: "green", desc: "Monitoramento de saúde.", examples: ["UI → SEGURO"] },
      { name: "Roadmap", risk: "green", desc: "Lista de tarefas internas.", examples: ["UI → SEGURO"] },
    ],
  },
];

const RISK_META: Record<Risk, { label: string; color: string; icon: typeof ShieldCheck; desc: string }> = {
  green: { label: "Seguro", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: ShieldCheck, desc: "Pode pedir à vontade. UI, cores, textos, novos componentes." },
  yellow: { label: "Cuidado", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: ShieldQuestion, desc: "Peça com escopo claro. Auth, RLS, e-mails, integrações." },
  red: { label: "Crítico", color: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: ShieldAlert, desc: "PEÇA APROVAÇÃO antes. Webhooks pagto, taxa, billing, RLS de roles." },
};

// ════════════════════════════════════════════════════════════════════════════════

export default function SuporteLovable() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useAuth();

  // Bloqueia acesso a não-super-admin
  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast.error("Acesso restrito ao Super Admin");
      navigate("/admin");
    }
  }, [loading, isSuperAdmin, navigate]);

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suporte Lovable</h1>
          <p className="text-sm text-muted-foreground">Aprenda a pedir mudanças sem quebrar nada</p>
        </div>
      </div>

      <Tabs defaultValue="guide" className="mt-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="guide"><BookOpen className="w-4 h-4 mr-2" />Guia rápido</TabsTrigger>
          <TabsTrigger value="map"><Map className="w-4 h-4 mr-2" />Mapa do projeto</TabsTrigger>
          <TabsTrigger value="chat"><MessageCircle className="w-4 h-4 mr-2" />Chat com IA</TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="mt-6">
          <GuideTab />
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <MapTab />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// TAB 1 — GUIA RÁPIDO
// ────────────────────────────────────────────────────────────────────────────────
function GuideTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🟢 Como pedir BEM (exemplos)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 text-muted-foreground">
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <p className="font-medium text-foreground mb-1">✅ "Mude a cor do botão 'Comprar agora' do checkout para roxo (hsl 270 80% 55%). Não toque em nenhuma lógica."</p>
            <p className="text-xs">Específico, com escopo limitado, com critério claro.</p>
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <p className="font-medium text-foreground mb-1">✅ "No Dashboard, adicione um card mostrando 'Vendas hoje' usando o RPC get_dashboard_metrics existente."</p>
            <p className="text-xs">Diz qual página, qual recurso e qual fonte usar.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔴 Como NÃO pedir (evite)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 text-muted-foreground">
          <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
            <p className="font-medium text-foreground mb-1">❌ "Otimiza o sistema todo"</p>
            <p className="text-xs">Vago demais. Vai mexer em coisa crítica sem você saber.</p>
          </div>
          <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
            <p className="font-medium text-foreground mb-1">❌ "Faz uma auditoria nos webhooks"</p>
            <p className="text-xs">Auditoria = mudanças em arquivos críticos. Use só se houver bug confirmado.</p>
          </div>
          <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3">
            <p className="font-medium text-foreground mb-1">❌ "Melhora o checkout"</p>
            <p className="text-xs">Quebre em pedidos pequenos: "mude X", "adicione Y".</p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">📋 Checklist antes de pedir mudança CRÍTICA</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">1.</span> Tenha certeza de que existe um bug REAL (não suposto). Print, log, ou venda concreta.</li>
            <li className="flex gap-2"><span className="text-primary">2.</span> Peça primeiro: <strong className="text-foreground">"faz um plano antes de codar"</strong> (modo Plan do Lovable).</li>
            <li className="flex gap-2"><span className="text-primary">3.</span> Limite escopo: <strong className="text-foreground">"só mexa em X, não toque em Y"</strong>.</li>
            <li className="flex gap-2"><span className="text-primary">4.</span> Defina critério: <strong className="text-foreground">"depois deve continuar funcionando Z"</strong>.</li>
            <li className="flex gap-2"><span className="text-primary">5.</span> Tenha o histórico do Lovable aberto pra reverter se necessário.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">🎯 Níveis de risco</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {(["green", "yellow", "red"] as Risk[]).map((r) => {
            const meta = RISK_META[r];
            const Icon = meta.icon;
            return (
              <div key={r} className={`rounded-lg border p-4 ${meta.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{meta.label}</span>
                </div>
                <p className="text-xs opacity-90">{meta.desc}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// TAB 2 — MAPA COMPLETO
// ────────────────────────────────────────────────────────────────────────────────
function MapTab() {
  const [filter, setFilter] = useState<Risk | "all">("all");

  const totals = useMemo(() => {
    const all = FEATURE_MAP.flatMap((g) => g.areas);
    return {
      total: all.length,
      green: all.filter((a) => a.risk === "green").length,
      yellow: all.filter((a) => a.risk === "yellow").length,
      red: all.filter((a) => a.risk === "red").length,
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Tudo ({totals.total})
        </Button>
        <Button size="sm" variant={filter === "green" ? "default" : "outline"} className="border-emerald-500/30" onClick={() => setFilter("green")}>
          🟢 Seguro ({totals.green})
        </Button>
        <Button size="sm" variant={filter === "yellow" ? "default" : "outline"} className="border-amber-500/30" onClick={() => setFilter("yellow")}>
          🟡 Cuidado ({totals.yellow})
        </Button>
        <Button size="sm" variant={filter === "red" ? "default" : "outline"} className="border-rose-500/30" onClick={() => setFilter("red")}>
          🔴 Crítico ({totals.red})
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {FEATURE_MAP.map((group) => {
          const visible = filter === "all" ? group.areas : group.areas.filter((a) => a.risk === filter);
          if (visible.length === 0) return null;
          return (
            <AccordionItem key={group.title} value={group.title} className="border rounded-lg px-4 bg-card/50">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-2xl">{group.icon}</span>
                  <div>
                    <div className="font-semibold">{group.title}</div>
                    <div className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "área" : "áreas"}</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {visible.map((area) => {
                    const meta = RISK_META[area.risk];
                    const Icon = meta.icon;
                    return (
                      <div key={area.name} className={`rounded-lg border p-3 ${meta.color}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="font-medium text-foreground">{area.name}</span>
                              <Badge variant="outline" className={`${meta.color} text-[10px] uppercase`}>{meta.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{area.desc}</p>
                            <ul className="text-xs space-y-0.5">
                              {area.examples.map((ex, i) => (
                                <li key={i} className="text-muted-foreground/80">• {ex}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// TAB 3 — CHAT COM IA
// ────────────────────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Oi! 👋 Sou seu **Suporte Lovable**.\n\nMe diga **o que você quer mudar** no projeto e eu monto pra você um prompt seguro pra colar no chat do Lovable, já com o nível de risco e critérios de aceite.\n\nExemplos:\n- *\"quero mudar a cor do botão de comprar pra roxo\"*\n- *\"quero adicionar um card no dashboard com vendas de hoje\"*\n- *\"o checkout tá lento, será que dá pra otimizar?\"*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lovable-support-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 429) {
        toast.error("Muitas requisições. Aguarde alguns segundos.");
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Créditos do Lovable AI esgotados. Adicione em Settings → Workspace → Usage.");
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Erro ao conversar com a IA");
        setIsLoading(false);
        return;
      }

      // Stream SSE
      let assistantSoFar = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nlIdx);
          textBuffer = textBuffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return prev;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copiado!");
  };

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Conversa</CardTitle>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 group relative ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 border border-border"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-background prose-pre:border prose-pre:border-border prose-code:text-primary">
                    <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.role === "assistant" && msg.content && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={() => copyMessage(msg.content)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="O que você quer mudar no projeto?"
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={send} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Powered by Lovable AI · Sempre revise antes de colar no Lovable
        </p>
      </div>
    </Card>
  );
}
