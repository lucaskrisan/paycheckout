const downloadManualAsHTML = () => {
  const el = document.getElementById("manual-content");
  if (!el) return;
  const textContent = el.innerText;
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Manual Técnico Completo — PayCheckout</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.7; padding: 40px 20px; }
  .container { max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 48px; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
  h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #f8fafc; }
  .meta { font-size: 13px; color: #94a3b8; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #334155; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.8; color: #cbd5e1; }
  @media print { body { background: #fff; color: #1e293b; } .container { border: none; box-shadow: none; background: #fff; } pre { color: #334155; } }
</style>
</head>
<body>
<div class="container">
  <h1>Manual Técnico Completo — PayCheckout</h1>
  <p class="meta">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} | Documento de uso interno</p>
  <pre>${textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Manual_Tecnico_PayCheckout_${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

const TechnicalManual = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 text-foreground">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Manual Técnico Completo — PayCheckout</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const el = document.getElementById("manual-content");
              if (el) {
                navigator.clipboard.writeText(el.innerText);
                alert("Copiado para a área de transferência!");
              }
            }}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            Copiar tudo
          </button>
          <button
            onClick={downloadManualAsHTML}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            ⬇ Baixar HTML
          </button>
        </div>
      </div>

      <div id="manual-content" className="prose prose-sm max-w-none dark:prose-invert space-y-6 bg-card p-8 rounded-2xl border border-border">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{`
═══════════════════════════════════════════════════════════════
  MANUAL TÉCNICO COMPLETO — PAYCHECKOUT
  Versão: 1.0 | Data: ${new Date().toLocaleDateString("pt-BR")}
  Documento de uso interno — Documentação oficial do sistema
═══════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. VISÃO GERAL DO SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1.1 Propósito Estratégico
  PayCheckout é uma plataforma SaaS de "Checkout as a Service" para
  produtores digitais brasileiros. Permite criar checkouts de alta
  conversão, processar pagamentos (PIX, cartão, boleto), entregar
  conteúdo via área de membros e rastrear conversões com Pixel/CAPI.

1.2 Público-alvo
  • Produtores digitais (infoprodutores): criam produtos, configuram
    checkouts e gerenciam vendas.
  • Compradores (alunos): acessam conteúdo adquirido via portal do aluno.
  • Super Admin: administra a plataforma, gerencia produtores e billing.

1.3 Modelo de Negócio
  Monetização via take-rate: taxa percentual (padrão 4.99%) + taxa fixa
  (R$ 0,49) sobre cada venda aprovada. Créditos pré-pagos com tiers:
  • Iron: R$ 5 (padrão)
  • Bronze: R$ 50
  • Silver: R$ 500
  • Gold: R$ 5.000
  Atingir o limite sem quitação bloqueia geração de novos checkouts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ARQUITETURA TÉCNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 Stack
  Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
  Backend: Supabase (Lovable Cloud)
    • PostgreSQL (banco de dados)
    • Auth (autenticação)
    • Edge Functions (Deno runtime)
    • Storage (arquivos)
    • Realtime (WebSocket)
  Integrações: Asaas, Pagar.me, Mercado Pago, Stripe, OneSignal,
    Resend, Facebook CAPI, Lovable AI

2.2 Fluxo Geral
  Cadastro → Completar Perfil (CPF/Telefone) → Auto-promoção Admin
  → Painel Produtor → Criar Produto → Gerar Checkout → Vender
  → Webhook → Entrega automática → Área de Membros

2.3 Organização do Código
  src/
  ├── pages/              → Páginas (rotas)
  │   ├── admin/          → Painel do produtor (20+ páginas)
  │   ├── Checkout.tsx     → Checkout público
  │   ├── MemberArea.tsx   → Área de membros
  │   ├── CustomerPortal.tsx → Portal do comprador
  │   ├── Login.tsx        → Autenticação
  │   └── CompleteProfile.tsx → Onboarding
  ├── components/         → Componentes reutilizáveis
  │   ├── admin/          → Componentes do painel admin
  │   ├── checkout/       → Componentes do checkout
  │   ├── checkout-builder/ → Builder visual de checkout
  │   ├── member/         → Componentes da área de membros
  │   └── ui/             → shadcn/ui components
  ├── hooks/              → Custom hooks
  ├── integrations/       → Supabase client + types
  └── lib/                → Utilitários

  supabase/
  └── functions/          → 20+ Edge Functions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. ESTRUTURA DE NAVEGAÇÃO E ROTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROTAS PÚBLICAS
┌─────────────────────────────┬──────────────────────┬──────────────────────────────┐
│ URL                         │ Módulo               │ Acesso                       │
├─────────────────────────────┼──────────────────────┼──────────────────────────────┤
│ /                           │ Landing Page         │ Público                      │
│ /login                      │ Autenticação         │ Público                      │
│ /login?signup=true          │ Cadastro             │ Público                      │
│ /checkout/:productId        │ Checkout             │ Público (anon)               │
│ /checkout/sucesso           │ Sucesso pós-compra   │ Público                      │
│ /membros?token=xxx          │ Área de Membros      │ Token de acesso              │
│ /minha-conta?token=xxx      │ Portal do Comprador  │ Token de acesso              │
│ /completar-perfil           │ Onboarding           │ Autenticado (perfil incompleto)│
│ /aguardando-aprovacao       │ Aprovação pendente   │ Autenticado                  │
└─────────────────────────────┴──────────────────────┴──────────────────────────────┘

ROTAS ADMIN (requer role admin ou super_admin)
┌─────────────────────────────┬──────────────────────┬──────────────────────────────┐
│ /admin                      │ Dashboard            │ admin, super_admin           │
│ /admin/orders               │ Vendas               │ admin, super_admin           │
│ /admin/products             │ Produtos             │ admin, super_admin           │
│ /admin/products/:id/edit    │ Editar Produto       │ admin (dono), super_admin    │
│ /admin/customers            │ Clientes             │ admin, super_admin           │
│ /admin/settings             │ Config. Checkout     │ admin, super_admin           │
│ /admin/upsell               │ Upsell               │ admin, super_admin           │
│ /admin/coupons              │ Cupons               │ admin, super_admin           │
│ /admin/courses              │ Área de Membros      │ admin, super_admin           │
│ /admin/reviews              │ Avaliações           │ admin, super_admin           │
│ /admin/abandoned            │ Carrinhos Abandonados│ admin, super_admin           │
│ /admin/metrics              │ Métricas             │ admin, super_admin           │
│ /admin/integrations         │ Gateways             │ admin, super_admin           │
│ /admin/domains              │ Domínios             │ admin, super_admin           │
│ /admin/communications       │ Comunicações/E-mails │ admin, super_admin           │
│ /admin/webhooks             │ Webhooks             │ admin, super_admin           │
│ /admin/whatsapp             │ WhatsApp             │ admin, super_admin           │
│ /admin/notifications        │ Notificações Push    │ admin, super_admin           │
│ /admin/pwa                  │ App Mobile (PWA)     │ admin, super_admin           │
│ /admin/my-account           │ Minha Conta          │ admin, super_admin           │
│ /admin/tracking             │ Rastreamento/Pixel   │ admin, super_admin           │
│ /admin/emails               │ Logs de E-mail       │ admin, super_admin           │
│ /admin/billing              │ Billing              │ super_admin                  │
│ /admin/platform             │ Painel Plataforma    │ super_admin                  │
│ /admin/meta-ads             │ Meta Ads             │ super_admin                  │
│ /admin/health               │ Fiscalizar           │ super_admin                  │
│ /admin/roadmap              │ Roadmap              │ super_admin                  │
└─────────────────────────────┴──────────────────────┴──────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. MÓDULOS FUNCIONAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 CHECKOUT (/checkout/:productId)
────────────────────────────────────
  Objetivo: Página pública de pagamento para compradores.
  Uso: Gerada automaticamente para cada produto ativo.

  Campos de Entrada (comprador):
  ┌────────────────┬──────────────┬────────────┬─────────────┬───────────────┐
  │ Campo técnico  │ Label        │ Tipo       │ Obrigatório │ Validação     │
  ├────────────────┼──────────────┼────────────┼─────────────┼───────────────┤
  │ name           │ Nome completo│ text       │ Sim         │ min 3 chars   │
  │ email          │ E-mail       │ email      │ Sim         │ formato email │
  │ cpf            │ CPF          │ text       │ Sim         │ CPF válido    │
  │ phone          │ Telefone     │ text       │ Sim         │ 10-11 dígitos │
  │ payment_method │ Método pgto  │ enum       │ Sim         │ pix|credit    │
  └────────────────┴──────────────┴────────────┴─────────────┴───────────────┘

  Campos Cartão (se payment_method = credit):
  ┌────────────────┬──────────────┬────────────┬─────────────┐
  │ card_number    │ Nº do cartão │ text       │ Sim         │
  │ card_name      │ Nome cartão  │ text       │ Sim         │
  │ card_expiry    │ Validade     │ text       │ Sim (MM/AA) │
  │ card_cvv       │ CVV          │ text       │ Sim (3-4 d) │
  │ installments   │ Parcelas     │ select     │ Sim         │
  └────────────────┴──────────────┴────────────┴─────────────┘

  Regras de Negócio:
  • Desconto PIX: percentual configurável (padrão 5%)
  • Fórmula: valor_pix = price * (1 - pix_discount_percent / 100)
  • Order Bumps: produtos adicionais exibidos antes do pagamento
  • Fórmula total: total = product_price + Σ(bump_prices) - desconto_cupom
  • Validação server-side: Edge Function valida valor contra DB
  • Cupons: desconto % ou fixo, com uso máximo e expiração
  • Countdown Timer: minutos configuráveis (padrão 15)

  Edge Functions envolvidas:
  • create-asaas-payment — Pagamento via Asaas (PIX/cartão/boleto)
  • create-pix-payment — Pagamento PIX via Pagar.me
  • create-mercadopago-payment — Pagamento via Mercado Pago
  • create-stripe-payment — Pagamento via Stripe
  • check-order-status — Polling de status (sem autenticação)

  Saída:
  • PIX: QR Code + código copia-e-cola em modal
  • Cartão: processamento direto, redirect para /checkout/sucesso
  • Notificação push via OneSignal ao produtor

4.2 PRODUTOS (/admin/products)
────────────────────────────────
  Objetivo: Gerenciamento de produtos digitais.

  Campos:
  ┌────────────────┬──────────────┬────────────┬─────────────┬───────────────┐
  │ name           │ Nome         │ text       │ Sim         │ min 1 char    │
  │ description    │ Descrição    │ text       │ Não         │ —             │
  │ price          │ Preço        │ numeric    │ Sim         │ > 0           │
  │ original_price │ Preço orig.  │ numeric    │ Não         │ > price       │
  │ image_url      │ Imagem       │ text(URL)  │ Não         │ URL válida    │
  │ active         │ Ativo        │ boolean    │ —           │ default: true │
  │ is_subscription│ Assinatura   │ boolean    │ —           │ default: false│
  │ billing_cycle  │ Ciclo cobr.  │ text       │ Se assinat. │ weekly..yearly│
  │ show_coupon    │ Mostrar cupom│ boolean    │ —           │ default: true │
  └────────────────┴──────────────┴────────────┴─────────────┴───────────────┘

  RLS: user_id = auth.uid() OR is_super_admin()

4.3 DASHBOARD (/admin)
────────────────────────
  Objetivo: Visão consolidada de vendas e métricas.

  Métricas exibidas:
  • Receita total (soma de orders com status paid/approved)
  • Pedidos totais
  • Taxa de aprovação: (paid+approved) / total * 100
  • Ticket médio: receita / pedidos_aprovados
  • Visitantes ao vivo (via Supabase Realtime)

  Períodos: Hoje, Ontem, 7 dias, Mês atual, Mês passado, Total
  Gráfico: AreaChart (Recharts) com série temporal de vendas

4.4 ÁREA DE MEMBROS (/membros?token=xxx)
──────────────────────────────────────────
  Objetivo: Entrega de conteúdo digital (cursos/aulas).
  Acesso: via access_token (UUID) no header x-access-token.

  Estrutura: Curso → Módulos → Aulas → Materiais
  Funcionalidades:
  • Progresso de aulas (lesson_progress)
  • Avaliações/Reviews por aula (lesson_reviews)
  • Materiais complementares (lesson_materials)
  • Conteúdo: text, vídeo (embed), arquivo

  RLS: Validação via member_access.access_token + expires_at

4.5 CHECKOUT BUILDER (/admin/products/:id/checkout-builder)
────────────────────────────────────────────────────────────
  Objetivo: Editor visual drag-and-drop de checkout.
  Componentes: Paleta, Canvas, Editor de Propriedades
  Persistência: checkout_builder_configs (JSON layout + settings)
  Suporte a múltiplas configurações por produto (A/B testing)

4.6 UPSELL (/admin/upsell)
────────────────────────────
  Objetivo: Ofertas pós-compra (one-click upsell).
  Edge Function: process-upsell
  Fluxo: Após pagamento aprovado → exibir oferta → aceitar →
    criar novo pedido reaproveitando dados do cliente.
  Campos: product_id, upsell_product_id, discount_percent, title, description

4.7 CUPONS (/admin/coupons)
────────────────────────────
  Campos: code, discount_type (percent|fixed), discount_value,
    max_uses, min_amount, expires_at, product_id, active
  Validação: checkout verifica ativo + não expirado + não excedeu max_uses

4.8 GATEWAYS (/admin/integrations)
────────────────────────────────────
  Provedores suportados:
  • Asaas (PIX, cartão, boleto, assinatura)
  • Pagar.me (PIX, cartão)
  • Mercado Pago (PIX, cartão)
  • Stripe (cartão)

  Cada produtor configura suas próprias credenciais.
  Campos: provider, name, environment (sandbox|production), config (JSON), payment_methods (JSON)
  RLS: isolamento total por user_id

4.9 RASTREAMENTO (/admin/tracking)
────────────────────────────────────
  Objetivo: Configuração de Pixel Facebook e CAPI por produto.
  Tabela: product_pixels (pixel_id, capi_token, domain, fire_on_pix, fire_on_boleto)
  Edge Function: facebook-capi (envio server-side)
  Eventos: PageView, InitiateCheckout, AddPaymentInfo, Purchase
  EMQ: Monitoramento de saúde via emq_snapshots

4.10 COMUNICAÇÕES (/admin/communications)
──────────────────────────────────────────
  • E-mails transacionais via Resend
  • Logs completos: email_logs (status, aberturas, cliques, bounces)
  • Geração de copy via IA: Edge Function generate-email-copy (Lovable AI)
  • Webhooks customizados: fire-webhooks (HMAC-SHA256)
  • Push notifications: OneSignal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. SISTEMA DE AUTENTICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1 Métodos de Login
  • E-mail + Senha (Supabase Auth)
  • Google OAuth (Lovable Cloud managed ou BYOK)
  • Token de acesso (compradores, sem autenticação auth.users)

5.2 Fluxo Completo
  1. Cadastro: email+senha+nome → signUp → profile criado via trigger
  2. Cadastro completo: +telefone+CPF → profile.profile_completed = true
  3. Auto-promoção: trigger promote_to_admin_on_profile_complete
     insere role 'admin' automaticamente
  4. Google OAuth: redirect para /completar-perfil → preencher CPF+telefone

5.3 Roles (tabela user_roles)
  • user — padrão (atribuído via trigger handle_new_user_role)
  • admin — produtor (auto-promoção ou manual pelo super_admin)
  • super_admin — administrador global (promoção manual apenas)

5.4 Sessão
  • Supabase Auth JWT
  • onAuthStateChange listener
  • Persistência automática (localStorage)

5.5 Fluxo de Roteamento (Edge Function: resolve-user-destination)
  1. Verifica profile_completed
  2. Verifica roles (admin/super_admin)
  3. Verifica se é comprador (customers + member_access)
  4. Retorna destino:
     • !profileCompleted → /completar-perfil
     • buyerToken → /minha-conta?token=xxx
     • isAdmin → /admin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. SISTEMA DE ACESSO E MONETIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6.1 Hierarquia de Acesso
  ┌──────────────┬────────────────────────────────────────────────┐
  │ Role         │ Permissões                                     │
  ├──────────────┼────────────────────────────────────────────────┤
  │ anon         │ Checkout público, leitura de produtos ativos   │
  │ user         │ Completar perfil, acesso básico                │
  │ admin        │ Painel completo do produtor (CRUD próprio)     │
  │ super_admin  │ Tudo + billing + platform + meta-ads + health  │
  └──────────────┴────────────────────────────────────────────────┘

6.2 Billing (Faturamento da Plataforma)
  Tabelas: billing_accounts, billing_transactions
  Trigger: accrue_platform_fee (dispara quando order.status → paid/approved)
  Fórmula: fee = order.platform_fee_amount (calculado na Edge Function)
  Bloqueio: if balance > credit_limit → blocked = true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. EDGE FUNCTIONS (Backend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────┬────────────────────────────────────────┐
│ Função                   │ Propósito                              │
├──────────────────────────┼────────────────────────────────────────┤
│ create-asaas-payment     │ Criar pagamento via Asaas              │
│ create-pix-payment       │ Criar pagamento PIX via Pagar.me       │
│ create-mercadopago-payment│ Criar pagamento via Mercado Pago      │
│ create-stripe-payment    │ Criar pagamento via Stripe             │
│ check-order-status       │ Polling status (sem auth, anon)        │
│ asaas-webhook            │ Receber webhooks Asaas                 │
│ mercadopago-webhook      │ Receber webhooks Mercado Pago          │
│ pagarme-webhook          │ Receber webhooks Pagar.me              │
│ resend-webhook           │ Receber webhooks Resend (email events) │
│ facebook-capi            │ Enviar eventos CAPI ao Facebook        │
│ fire-webhooks            │ Disparar webhooks customizados (HMAC)  │
│ generate-email-copy      │ Gerar copy de email via Lovable AI     │
│ process-upsell           │ Processar one-click upsell             │
│ send-access-link         │ Enviar link de acesso via Resend       │
│ send-pix-reminder        │ Lembrete de PIX pendente               │
│ resolve-user-destination │ Determinar destino pós-login           │
│ delete-account           │ Deletar conta do usuário               │
│ pwa-manifest             │ Gerar manifest.json dinâmico           │
│ test-push                │ Testar notificação push                │
│ meta-ads                 │ Consultar dados Meta Ads               │
│ meta-ads-alerts          │ Alertas de Meta Ads                    │
│ meta-diagnostics         │ Diagnóstico de pixels                  │
│ meta-emq                 │ Consultar EMQ score                    │
│ meta-emq-monitor         │ Monitorar EMQ automaticamente          │
└──────────────────────────┴────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. SISTEMA DE IA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8.1 IA-01: Gerador de E-mail Copy
  Edge Function: generate-email-copy
  Modelo: Lovable AI (via LOVABLE_API_KEY)
  Objetivo: Gerar copy de e-mails transacionais e marketing
  Inputs: funnel_type, customer_name, product_name, product_price
  Output: Texto HTML de e-mail pronto para envio
  Uso: Botão "Gerar com IA" na tela de Comunicações

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. TELEMETRIA E LOGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9.1 Tabelas de Tracking
  • pixel_events — Eventos de pixel por produto (browser/server)
  • emq_snapshots — Snapshots diários de qualidade de eventos
  • email_logs — Logs completos de e-mails enviados
  • abandoned_carts — Carrinhos abandonados

9.2 Eventos Capturados (pixel_events)
  • PageView, ViewContent, InitiateCheckout
  • AddPaymentInfo, Purchase
  • Source: browser | server (CAPI)

9.3 Métricas de E-mail (email_logs)
  • sent, delivered, opened, clicked, bounced
  • cost_estimate por e-mail
  • Webhook Resend: atualiza status em tempo real

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. PAINEL ADMINISTRATIVO — DETALHAMENTO POR ABA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10.1 Dashboard
  • Métricas: receita, pedidos, aprovação, ticket médio, visitantes live
  • Filtros por período
  • Gráfico temporal de vendas
  • Vendas recentes (últimas 10)

10.2 Vendas (Orders)
  • Lista de pedidos com status, valor, método, cliente
  • Filtros: status, período
  • Ação: visualizar detalhes

10.3 Produtos
  • CRUD de produtos
  • Configurar preço, assinatura, imagem
  • Link para Checkout Builder
  • Link para configurar pixels

10.4 Clientes
  • Lista de compradores
  • Dados: nome, email, CPF, telefone, total gasto
  • Filtro e busca

10.5 Checkouts (Settings)
  • Personalização visual: cor primária, logo, nome da empresa
  • Desconto PIX (%)
  • Countdown (minutos)
  • CSS customizado

10.6 Área de Membros (Courses)
  • CRUD: Cursos → Módulos → Aulas
  • Upload de vídeo/arquivo
  • Materiais complementares
  • Gerenciar alunos com acesso

10.7 Avaliações
  • Moderar reviews dos alunos
  • Aprovar/rejeitar

10.8 Carrinhos Abandonados
  • Lista com dados parciais do comprador
  • Status: recuperado ou não
  • UTM parameters

10.9 Métricas
  • Dashboard de rastreamento avançado
  • EMQ panel
  • UTM Attribution
  • Pixel Events dashboard

10.10 Gateways
  • Configurar credenciais por provedor
  • Ativar/desativar
  • Ambiente sandbox/production

10.11 Notificações
  • Configurar sons, padrões
  • Relatórios automáticos (08h, 12h, 18h, 23h)
  • Filtros: enviar em aprovado, pendente

10.12 App Mobile (PWA)
  • Configurar nome, ícones, cores
  • Splash screen
  • Manifest gerado dinamicamente

10.13 SUPER ADMIN: Painel Plataforma
  • Visão global de produtores
  • Promover/rebaixar roles
  • Platform settings (taxa, nome)

10.14 SUPER ADMIN: Billing
  • Contas de billing por produtor
  • Transações
  • Bloqueio/desbloqueio
  • Tiers de crédito

10.15 SUPER ADMIN: Meta Ads
  • Consultar campanhas Meta
  • Budget calculator
  • Alertas automáticos
  • Funil de conversão

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. BANCO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABELAS PRINCIPAIS (27 tabelas + 2 views)

Core:
  • profiles — Dados do usuário (CPF, telefone, avatar, profile_completed)
  • user_roles — Roles (admin, user, super_admin) com enum app_role
  • products — Produtos digitais
  • orders — Pedidos de compra
  • customers — Compradores

Checkout:
  • checkout_settings — Personalização visual por produtor
  • checkout_builder_configs — Layouts drag-and-drop
  • checkout_templates — Templates pré-prontos
  • coupons — Cupons de desconto
  • order_bumps — Order bumps
  • upsell_offers — Ofertas upsell

Conteúdo:
  • courses — Cursos
  • course_modules — Módulos
  • course_lessons — Aulas
  • lesson_materials — Materiais complementares
  • lesson_progress — Progresso do aluno
  • lesson_reviews — Avaliações
  • member_access — Tokens de acesso

Pagamento:
  • payment_gateways — Configuração de gateways por produtor
  • billing_accounts — Conta de billing da plataforma
  • billing_transactions — Transações de billing

Rastreamento:
  • product_pixels — Configuração de pixels por produto
  • pixel_events — Eventos registrados
  • emq_snapshots — Snapshots de qualidade EMQ
  • abandoned_carts — Carrinhos abandonados
  • email_logs — Logs de e-mail

Infraestrutura:
  • notification_settings — Config de notificações push
  • pwa_settings — Config PWA por produtor
  • webhook_endpoints — Endpoints de webhook customizados
  • facebook_domains — Domínios verificados no Facebook
  • platform_settings — Config global da plataforma
  • internal_tasks — Tarefas internas (super_admin)

Views:
  • active_gateways — Gateways ativos (view)
  • public_product_pixels — Pixels sem CAPI token (view segura)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

12.1 Row Level Security (RLS)
  TODAS as tabelas possuem RLS habilitado.
  Padrão: user_id = auth.uid() OR is_super_admin(auth.uid())
  Tabelas de checkout (products, checkout_settings): leitura pública permitida
  Tabelas sensíveis (billing, internal_tasks): apenas super_admin

12.2 Functions SECURITY DEFINER
  • has_role(_user_id, _role) — Verifica role sem recursão RLS
  • is_super_admin(_user_id)
  • owns_course, owns_module, owns_lesson — Validação de propriedade

12.3 Proteções
  • Validação server-side de preços (Edge Functions)
  • HMAC-SHA256 em webhooks customizados
  • View public_product_pixels oculta capi_token
  • Logins anônimos desabilitados
  • Roles armazenados em tabela separada (não no profile)
  • Service Role usado apenas em Edge Functions

12.4 Secrets (nunca expostos no código)
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_DB_URL, ASAAS_API_KEY, PAGARME_API_KEY,
  RESEND_API_KEY, RESEND_WEBHOOK_SECRET, ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY, META_ACCESS_TOKEN, LOVABLE_API_KEY,
  SUPABASE_PUBLISHABLE_KEY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. PWA E RECURSOS AVANÇADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

13.1 Progressive Web App
  • Manifest gerado dinamicamente (Edge Function: pwa-manifest)
  • Service Worker com cache strategy
  • Instalação como app nativo (banner InstallPrompt)
  • Ícones 192x192 e 512x512

13.2 Push Notifications
  • Via OneSignal
  • Notificação automática a cada venda
  • Sons customizáveis (bell, coin, kaching, magic, success)

13.3 Realtime
  • Checkout presence: visitantes ao vivo via Supabase Realtime
  • Hook: useCheckoutPresence

13.4 Capacitor
  • Configuração para build mobile (capacitor.config.ts)
  • Servidor: paycheckout.lovable.app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. DATABASE TRIGGERS E FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────┬───────────────────────────────────────┐
│ Function                         │ Propósito                             │
├──────────────────────────────────┼───────────────────────────────────────┤
│ handle_new_user()                │ Cria profile ao registrar usuário     │
│ handle_new_user_role()           │ Atribui role 'user' ao novo cadastro  │
│ promote_to_admin_on_profile_     │ Auto-promove para admin quando        │
│   complete()                     │ profile_completed = true              │
│ accrue_platform_fee()            │ Acumula taxa da plataforma ao aprovar │
│                                  │ um pedido (billing_accounts/trans.)   │
│ has_role(_user_id, _role)        │ Verifica role (SECURITY DEFINER)      │
│ is_super_admin(_user_id)         │ Verifica super_admin                  │
│ owns_course/module/lesson()      │ Verifica propriedade de conteúdo      │
└──────────────────────────────────┴───────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CONSIDERAÇÕES FINAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

15.1 Pontos Fortes
  • Multi-tenant com isolamento completo via RLS
  • Multi-gateway (4 provedores) com configuração por produtor
  • Rastreamento avançado (Pixel + CAPI + EMQ)
  • Auto-promoção de produtores (zero fricção)
  • Billing automatizado com tiers de crédito
  • PWA com push notifications
  • Checkout Builder visual drag-and-drop
  • One-click upsell pós-compra

15.2 Pontos de Atenção
  • Recuperação de senha não implementada (reset password flow)
  • Webhook retry/backoff não implementado (fire-and-forget)
  • Rate limiting não implementado nas Edge Functions
  • Busca de clientes limitada a 1000 registros (limite Supabase)
  • Checkout Builder sem preview mobile

15.3 Preparação para Escala
  • Arquitetura serverless (Edge Functions escalam automaticamente)
  • Banco PostgreSQL com RLS otimizado
  • Realtime para features live
  • Capacitor config pronta para mobile nativo

15.4 Roadmap Técnico
  • Recuperação WhatsApp (automação de carrinhos abandonados)
  • Domínios customizados por produtor
  • Pixels Google Ads e GA4
  • Sistema de afiliados (links de indicação + comissões)

═══════════════════════════════════════════════════════════════
  FIM DO MANUAL TÉCNICO
  PayCheckout — Checkout as a Service
  Documento gerado automaticamente em ${new Date().toLocaleDateString("pt-BR")}
═══════════════════════════════════════════════════════════════
`}</pre>
      </div>
    </div>
  );
};

export default TechnicalManual;
