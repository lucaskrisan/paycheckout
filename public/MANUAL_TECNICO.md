# Manual Técnico Completo — PayCheckout

> **Versão:** 1.0  
> **Data:** 13 de março de 2026  
> **Classificação:** Documentação técnica oficial do sistema

---

## 1. Visão Geral do Sistema

### 1.1 Propósito
O **PayCheckout** é uma plataforma SaaS de vendas digitais que permite a produtores criarem produtos (digitais ou assinaturas), gerarem checkouts personalizáveis, processarem pagamentos via PIX e cartão de crédito, e entregarem conteúdo via área de membros com cursos estruturados.

### 1.2 Público-alvo
| Perfil | Descrição |
|---|---|
| **Produtor (Admin)** | Usuário que cria produtos, configura checkouts, gerencia pedidos e cursos |
| **Super Admin** | Administrador da plataforma com visão global de todos os produtores |
| **Cliente final** | Comprador que acessa checkout, efetua pagamento e consome conteúdo na área de membros |

### 1.3 Modelo de Negócio
- Cobrança de taxa por transação (padrão: **4.99%**) configurável na tabela `platform_settings`
- O campo `platform_fee_amount` é calculado e armazenado em cada `order`

---

## 2. Arquitetura Técnica

### 2.1 Stack
| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | Tailwind CSS + shadcn/ui + Framer Motion |
| **Estado** | React Query (TanStack) + useState local |
| **Roteamento** | React Router DOM v6 |
| **Backend** | Supabase (Lovable Cloud) — PostgreSQL + Auth + Edge Functions + Storage |
| **Gateways de pagamento** | Asaas, Pagar.me |
| **Tracking** | Facebook Pixel (browser + CAPI) |
| **Notificações push** | OneSignal |
| **PWA** | vite-plugin-pwa + manifest dinâmico via Edge Function |
| **E-mail** | Resend (via Edge Functions) |

### 2.2 Fluxo Geral da Aplicação
```
Login → Painel Admin → Criar Produto → Configurar Checkout → Compartilhar Link
                                          ↓
                            Cliente acessa /checkout/:productId
                                          ↓
                            Preenche dados → Escolhe pagamento (PIX/Cartão)
                                          ↓
                            Edge Function processa pagamento no gateway
                                          ↓
                            Webhook confirma → Order atualizada → Acesso liberado
                                          ↓
                            Cliente acessa /membros?token=xxx
```

### 2.3 Organização do Código
```
src/
├── pages/               # Páginas/rotas
│   ├── admin/           # Todas as páginas do painel admin
│   ├── Checkout.tsx     # Checkout público
│   ├── MemberArea.tsx   # Área de membros
│   ├── CustomerPortal.tsx # Portal do cliente
│   ├── Login.tsx        # Autenticação
│   └── Index.tsx        # Landing page
├── components/
│   ├── admin/           # Componentes do painel admin
│   ├── checkout/        # Componentes do checkout
│   ├── checkout-builder/# Builder visual de checkout
│   ├── member/          # Componentes da área de membros
│   └── ui/              # Design system (shadcn/ui)
├── hooks/               # Hooks customizados
├── integrations/        # Cliente Supabase + tipos
└── lib/                 # Utilitários

supabase/
├── config.toml          # Configuração do projeto
└── functions/           # Edge Functions (backend serverless)
```

---

## 3. Estrutura de Navegação e Rotas

| Rota | Módulo | Acesso | Descrição |
|---|---|---|---|
| `/` | Index | Público | Landing page |
| `/login` | Login | Público | Login e cadastro |
| `/checkout/:productId` | Checkout | Público | Página de pagamento do produto |
| `/checkout/sucesso` | CheckoutSuccess | Público | Confirmação pós-compra |
| `/membros` | MemberArea | Token (query `?token=`) | Área de membros com cursos |
| `/minha-conta` | CustomerPortal | Token (query `?token=`) | Portal do cliente (pedidos, cursos, perfil) |
| `/admin` | Dashboard | Admin autenticado | Dashboard com métricas de vendas |
| `/admin/orders` | Orders | Admin | Gestão de pedidos |
| `/admin/products` | Products | Admin | CRUD de produtos |
| `/admin/products/:id/edit` | ProductEdit | Admin | Edição detalhada de produto |
| `/admin/products/:id/checkout-builder` | CheckoutBuilder | Admin | Builder visual de checkout |
| `/admin/customers` | Customers | Admin | Lista de clientes |
| `/admin/gateways` | Gateways | Admin | Configuração de gateways de pagamento |
| `/admin/courses` | Courses | Admin | Gestão de cursos, módulos e aulas |
| `/admin/coupons` | Coupons | Admin | Gestão de cupons de desconto |
| `/admin/abandoned` | AbandonedCarts | Admin | Carrinhos abandonados |
| `/admin/integrations` | Integrations | Admin | Integrações futuras |
| `/admin/settings` | Settings | Admin | Configurações do checkout |
| `/admin/notifications` | Notifications | Admin | Sons e padrões de notificação |
| `/admin/tracking` | Tracking | Admin | Pixels, UTM, diagnósticos Meta |
| `/admin/reviews` | Reviews | Admin | Moderação de avaliações |
| `/admin/health` | SystemHealth | Admin | Saúde do sistema |
| `/admin/webhooks` | Webhooks | Admin | Endpoints de webhook |
| `/admin/emails` | Emails | Admin | Logs e métricas de e-mail |
| `/admin/pwa` | PwaSettings | Admin | Configuração do PWA |
| `/admin/platform` | SuperAdminDashboard | Super Admin | Dashboard da plataforma |

---

## 4. Módulos Funcionais

### 4.1 Checkout (`/checkout/:productId`)

**Objetivo:** Permitir que clientes comprem produtos via PIX ou cartão de crédito.

**Fluxo:**
1. Carrega produto por `productId` da tabela `products`
2. Carrega configurações de checkout (`checkout_settings` e `checkout_builder_configs`)
3. Carrega order bumps ativos para o produto
4. Carrega pixels do produto (`public_product_pixels`)
5. Cliente preenche dados pessoais (nome, e-mail, CPF, telefone)
6. Escolhe método de pagamento (PIX ou cartão)
7. Aplica cupom de desconto (opcional)
8. Seleciona order bumps (opcional)
9. Submete pagamento

**Campos de entrada (CustomerForm):**
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `customer_name` | text | Sim | Mínimo 3 caracteres |
| `customer_email` | email | Sim | Formato e-mail válido |
| `customer_cpf` | text | Sim | 11 dígitos (formatado como CPF) |
| `customer_phone` | text | Sim | Formato telefone BR |

**Integrações ativas no checkout:**
- **Facebook Pixel:** PageView, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase
- **Abandoned Cart:** Salva dados parciais na tabela `abandoned_carts` ao preencher campos
- **Checkout Presence:** Contagem de visitantes em tempo real via Supabase Realtime
- **UTM Tracking:** Captura `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

**Processamento de pagamento:**
- **PIX:** Edge Function `create-pix-payment` → gera QR code via gateway → exibe modal
- **Cartão:** Edge Function `create-asaas-payment` → processa cobrança direta

### 4.2 Área de Membros (`/membros`)

**Objetivo:** Entregar conteúdo digital (cursos com módulos e aulas) aos compradores.

**Autenticação:** Via `access_token` (UUID) passado como query parameter `?token=xxx`

**Estrutura hierárquica:**
```
Curso → Módulos (ordenados por sort_order) → Aulas (ordenadas por sort_order)
```

**Tipos de conteúdo suportados (content_type):**
| Tipo | Descrição |
|---|---|
| `video` | Vídeo embutido (iframe responsivo 16:9) |
| `text` | Conteúdo textual/HTML |
| `file` | Arquivo para download |

**Funcionalidades:**
- Progresso por aula (`lesson_progress`) — marca como concluída
- Materiais complementares por aula (`lesson_materials`)
- Avaliações por aula (`lesson_reviews`) com sistema de estrelas
- Layout mobile-first com drawer lateral para navegação
- Gamificação visual (progresso por módulo, troféu ao completar)

### 4.3 Portal do Cliente (`/minha-conta`)

**Objetivo:** Permitir ao cliente visualizar pedidos, acessar cursos e editar perfil.

**Abas:**
- **Pedidos:** Lista de compras com status e valores
- **Cursos:** Cursos com acesso ativo, link direto para área de membros
- **Perfil:** Edição de nome e telefone

### 4.4 Dashboard Admin (`/admin`)

**Objetivo:** Visão consolidada de vendas e métricas.

**Métricas exibidas:**
- Receita total (pedidos pagos/aprovados)
- Total de pedidos
- Ticket médio
- Pedidos pendentes
- Visitantes ao vivo no checkout (Realtime)

**Filtros de período:** Hoje, Ontem, Últimos 7 dias, Mês atual, Mês passado, Total

**Gráfico:** AreaChart (Recharts) com evolução de receita ao longo do tempo

### 4.5 Produtos (`/admin/products`)

**Objetivo:** CRUD completo de produtos.

**Campos:**
| Campo | Tipo | Obrigatório | Padrão |
|---|---|---|---|
| `name` | text | Sim | — |
| `description` | text | Não | null |
| `price` | numeric | Sim | 0 |
| `original_price` | numeric | Não | null (preço riscado) |
| `image_url` | text | Não | null |
| `active` | boolean | Sim | true |
| `is_subscription` | boolean | Sim | false |
| `billing_cycle` | text | Sim | "monthly" |
| `show_coupon` | boolean | Sim | true |

**Ações disponíveis:**
- Criar (tipo único ou assinatura)
- Editar
- Excluir
- Copiar link de checkout
- Abrir checkout builder

### 4.6 Pedidos (`/admin/orders`)

**Objetivo:** Gestão e visualização de todos os pedidos.

**Status possíveis:**
| Status | Label PT | Cor |
|---|---|---|
| `paid` | Pago | Verde |
| `approved` | Aprovado | Verde |
| `confirmed` | Confirmado | Verde |
| `pending` | Aguardando pagamento | Amarelo |
| `refunded` | Reembolso | Azul |
| `refused` | Recusado | Vermelho |
| `failed` | Recusado | Vermelho |
| `chargeback` | Chargeback | Vermelho |
| `cancelled` | Cancelado | Cinza |

**Filtros:** Status, método de pagamento, busca por nome/e-mail, paginação (20 por página)

### 4.7 Cursos (`/admin/courses`)

**Objetivo:** Gestão de cursos, módulos e aulas.

**Estrutura:**
- Criar/editar cursos vinculados a produtos
- Adicionar/remover módulos
- Adicionar/remover aulas com tipo de conteúdo
- Reordenação manual via setas ↑↓ (sort_order)
- Gerenciamento de materiais complementares por aula
- Visualização de alunos matriculados

### 4.8 Cupons (`/admin/coupons`)

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| `code` | text | Código do cupom (unique) |
| `discount_type` | "percent" \| "fixed" | Tipo de desconto |
| `discount_value` | numeric | Valor do desconto |
| `max_uses` | integer | Limite de usos (null = ilimitado) |
| `used_count` | integer | Contador de usos |
| `expires_at` | timestamp | Data de expiração |
| `min_amount` | numeric | Valor mínimo do pedido |
| `product_id` | uuid | Vincular a produto específico |
| `active` | boolean | Ativo/inativo |

### 4.9 Gateways de Pagamento (`/admin/gateways`)

**Gateways suportados:**
- **Asaas** — PIX e Cartão de crédito
- **Pagar.me** — PIX e Cartão de crédito

**Configuração por gateway:**
| Campo | Descrição |
|---|---|
| `provider` | "asaas" \| "pagarme" |
| `name` | Nome identificador |
| `environment` | "sandbox" \| "production" |
| `active` | Ativo/inativo |
| `payment_methods` | Array de métodos habilitados |
| `config` | JSON com API keys (armazenado de forma segura) |

### 4.10 Configurações do Checkout (`/admin/settings`)

| Campo | Tipo | Padrão |
|---|---|---|
| `primary_color` | hex | #22c55e |
| `logo_url` | text | null |
| `company_name` | text | "Minha Empresa" |
| `countdown_minutes` | integer | 15 |
| `show_countdown` | boolean | true |
| `pix_discount_percent` | numeric | 5 |
| `custom_css` | text | null |

### 4.11 Notificações (`/admin/notifications`)

**Configurações:**
- Som de notificação ao receber venda (kaching, coin, bell, magic, success)
- Notificar vendas aprovadas e/ou pendentes
- Exibir valor bruto ou comissão
- Exibir nome do produto e UTM campaign
- Relatórios automáticos nos horários: 08h, 12h, 18h, 23h

**Push via OneSignal:** Configurado para super admin com appId `5ba5218a-...`

### 4.12 Tracking e Pixels (`/admin/tracking`)

**Funcionalidades:**
- Configuração de Facebook Pixel por produto
- Token CAPI (Conversions API) por pixel
- Domínio personalizado por pixel
- Dashboard de eventos disparados
- Tabela de atribuição UTM
- Gerador de scripts de tracking
- Diagnóstico de integração Meta
- Gerenciamento de domínios Facebook (`facebook_domains`)

### 4.13 Webhooks (`/admin/webhooks`)

**Eventos disponíveis:**
- `order.paid` — Venda aprovada
- `order.refunded` — Reembolso
- `order.cancelled` — Cancelamento

**Configuração:**
- URL do endpoint
- Seleção de eventos
- Ativação/desativação
- Secret gerado automaticamente (32 bytes hex)

### 4.14 E-mails (`/admin/emails`)

**Tipos de e-mail rastreados:**
| Tipo | Descrição |
|---|---|
| `pix_generated` | PIX gerado no checkout |
| `pix_reminder` | Lembrete de pagamento PIX |
| `access_link` | Link de acesso à área de membros |
| `payment_confirmed` | Confirmação de pagamento |

**Métricas:** Enviados, entregues, abertos, clicados, bounced. Estimativa de custo.

### 4.15 Checkout Builder (`/admin/products/:id/checkout-builder`)

**Objetivo:** Editor visual drag-and-drop para personalizar o layout do checkout.

**Componentes disponíveis:** Definidos em `BuilderComponent[]` com layout JSON armazenado em `checkout_builder_configs`.

### 4.16 Carrinhos Abandonados (`/admin/abandoned`)

**Dados capturados:**
- Dados do cliente (nome, e-mail, CPF, telefone)
- Produto
- Método de pagamento selecionado
- UTMs
- Timestamp
- Flag `recovered`

### 4.17 Order Bumps

**Objetivo:** Ofertas adicionais exibidas no checkout antes do pagamento.

**Campos:**
- `title`, `description`, `call_to_action`
- `bump_product_id` — produto adicional
- `use_product_image` — usar imagem do produto bump
- `sort_order`, `active`

### 4.18 PWA (`/admin/pwa`)

**Configurações:**
- Nome do app, nome curto, descrição
- Cores de tema e background
- Ícones (192x192, 512x512)
- Imagem de splash
- Template de notificação push (título e corpo)

**Manifest:** Gerado dinamicamente pela Edge Function `pwa-manifest`.

### 4.19 Super Admin Dashboard (`/admin/platform`)

**Acesso:** Apenas `super_admin`

**Funcionalidades:**
- Lista de todos os produtores com métricas
- Total de receita da plataforma
- Total de taxas coletadas
- Configuração da taxa da plataforma
- Ações: bloquear/desbloquear produtores (gerenciamento de roles)

---

## 5. Sistema de Autenticação

### 5.1 Método
- E-mail + senha via Supabase Auth
- Login com Google (OAuth) via `lovable` integration

### 5.2 Fluxo
1. Usuário acessa `/login`
2. Escolhe login ou cadastro
3. Cadastro: nome + e-mail + senha → `supabase.auth.signUp()`
4. Login: e-mail + senha → `supabase.auth.signInWithPassword()`
5. Após autenticação, `AuthProvider` verifica roles na tabela `user_roles`
6. Redireciona: admin → `/admin`, não-admin → `/minha-conta`

### 5.3 Persistência
- Sessão persistida em `localStorage`
- Auto-refresh de token habilitado
- `onAuthStateChange` listener ativo

### 5.4 Contexto (`useAuth`)
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;      // role = admin OU super_admin
  isSuperAdmin: boolean;  // role = super_admin
  loading: boolean;
  signIn(email, password): Promise<void>;
  signUp(email, password, fullName): Promise<void>;
  signOut(): Promise<void>;
}
```

---

## 6. Sistema de Acesso e Roles

### 6.1 Enum `app_role`
```sql
'admin' | 'user' | 'super_admin'
```

### 6.2 Tabela `user_roles`
| Campo | Tipo |
|---|---|
| `id` | uuid (PK) |
| `user_id` | uuid (FK → auth.users) |
| `role` | app_role |

**Constraint:** UNIQUE(user_id, role)

### 6.3 Função de segurança
```sql
has_role(_user_id uuid, _role app_role) RETURNS boolean
-- SECURITY DEFINER — evita recursão RLS
```

### 6.4 Hierarquia de acesso
| Nível | Permissões |
|---|---|
| **Anônimo/Público** | Checkout, leitura de produtos ativos, inserção de orders/abandoned_carts |
| **Autenticado (user)** | Portal do cliente |
| **Admin** | Painel admin completo, gestão de dados próprios |
| **Super Admin** | Tudo do admin + visão global + gestão de produtores + configuração de taxas |

### 6.5 Acesso à Área de Membros
- Baseado em `access_token` (UUID) na tabela `member_access`
- Token passado via header `x-access-token` ou query param `?token=`
- RLS verifica token em todas as tabelas de conteúdo (modules, lessons, progress, reviews, materials)
- Expiração opcional via `expires_at`

---

## 7. Edge Functions (Backend Serverless)

### 7.1 Listagem completa

| Função | Objetivo |
|---|---|
| `create-pix-payment` | Gera pagamento PIX no gateway, cria order, envia e-mail |
| `create-asaas-payment` | Processa pagamento com cartão via Asaas |
| `asaas-webhook` | Recebe webhooks do Asaas, atualiza status de orders |
| `pagarme-webhook` | Recebe webhooks do Pagar.me, atualiza status de orders |
| `check-order-status` | Verifica status de order no gateway |
| `facebook-capi` | Envia eventos server-side para Facebook Conversions API |
| `fire-webhooks` | Dispara webhooks configurados pelo produtor |
| `send-access-link` | Envia e-mail com link de acesso à área de membros |
| `send-pix-reminder` | Envia lembrete de pagamento PIX pendente |
| `resend-webhook` | Recebe webhooks do Resend (tracking de e-mail) |
| `generate-email-copy` | Gera copy de e-mail via IA |
| `meta-diagnostics` | Diagnóstico de integração com Meta/Facebook |
| `pwa-manifest` | Gera manifest.json dinâmico para PWA |
| `test-push` | Testa notificação push via OneSignal |

---

## 8. Banco de Dados

### 8.1 Tabelas principais

| Tabela | Descrição | RLS |
|---|---|---|
| `products` | Produtos à venda | Admin: ALL próprios; Público: SELECT ativos |
| `orders` | Pedidos/transações | Admin: ALL próprios; Público: INSERT |
| `customers` | Clientes compradores | Admin: ALL próprios; Público: INSERT |
| `courses` | Cursos de conteúdo | Admin: ALL próprios; Público: SELECT |
| `course_modules` | Módulos dos cursos | Admin: ALL; Membros: SELECT via token |
| `course_lessons` | Aulas dos módulos | Admin: ALL; Membros: SELECT via token |
| `lesson_progress` | Progresso do aluno | Admin: ALL; Membros: CRUD via token |
| `lesson_materials` | Materiais complementares | Admin: ALL; Membros: SELECT via token |
| `lesson_reviews` | Avaliações de aulas | Admin: ALL; Membros: INSERT/UPDATE via token |
| `member_access` | Tokens de acesso à área de membros | Admin: ALL; SELECT via token |
| `checkout_settings` | Configurações visuais do checkout | Admin: ALL; Público: SELECT |
| `checkout_builder_configs` | Layouts do checkout builder | Admin: ALL; Público: SELECT |
| `payment_gateways` | Gateways de pagamento configurados | Admin: ALL próprios |
| `coupons` | Cupons de desconto | Admin: ALL; Público: SELECT ativos |
| `order_bumps` | Ofertas adicionais no checkout | Admin: ALL; Público: SELECT ativos |
| `abandoned_carts` | Carrinhos abandonados | Admin: ALL próprios; Público: INSERT |
| `product_pixels` | Pixels de tracking por produto | Admin: ALL próprios |
| `pixel_events` | Eventos de pixel registrados | Admin: SELECT; Público: INSERT |
| `notification_settings` | Config. de notificações | Usuário: ALL próprio |
| `webhook_endpoints` | Endpoints de webhook | Admin: ALL próprios |
| `email_logs` | Logs de e-mails enviados | Admin: ALL próprios |
| `facebook_domains` | Domínios verificados no Facebook | Admin: ALL próprios |
| `pwa_settings` | Configurações do PWA | Admin: ALL; Público: SELECT |
| `platform_settings` | Configurações da plataforma | Super Admin: ALL; Público: SELECT |
| `profiles` | Perfis de usuários | Próprio: SELECT/UPDATE; Admin: SELECT all |
| `user_roles` | Roles de acesso | Admin: SELECT/INSERT/DELETE; Próprio: SELECT |

### 8.2 Views
| View | Descrição |
|---|---|
| `active_gateways` | Gateways ativos (sem config sensível) |
| `public_product_pixels` | Pixels sem token CAPI (seguro para frontend) |

### 8.3 Functions SQL
| Função | Retorno | Descrição |
|---|---|---|
| `has_role(_user_id, _role)` | boolean | Verifica se usuário tem role (SECURITY DEFINER) |
| `is_super_admin(_user_id)` | boolean | Verifica se é super admin |

---

## 9. Segurança

### 9.1 Row-Level Security (RLS)
- **Todas as tabelas** possuem RLS habilitado
- Padrão multi-tenant: cada produtor só acessa seus próprios dados (`user_id = auth.uid()`)
- Super admin tem acesso via `is_super_admin(auth.uid())`
- Tabelas públicas (checkout) permitem INSERT com validação mínima
- Área de membros usa token UUID em vez de autenticação

### 9.2 Proteções
- Roles armazenados em tabela separada (`user_roles`), nunca no perfil
- Função `has_role` usa `SECURITY DEFINER` para evitar recursão RLS
- API keys de gateways armazenadas na coluna `config` (JSON) com RLS
- Secrets de Edge Functions via variáveis de ambiente (nunca no código)
- Webhook secrets gerados com `gen_random_bytes(32)`

### 9.3 Autenticação
- Sessão persistida via localStorage
- Auto-refresh de token JWT
- Redirecionamento para `/login` quando não autenticado no admin

---

## 10. Realtime

### Uso atual:
- **Checkout Presence:** Contagem de visitantes ao vivo no checkout via Supabase Realtime presence
- **Orders channel:** Admin recebe atualizações em tempo real de novos pedidos (som de notificação)

---

## 11. PWA

### Configuração:
- `vite-plugin-pwa` para service worker
- Manifest dinâmico gerado pela Edge Function `pwa-manifest`
- OneSignal para notificações push (super admin)
- Ícones e splash configuráveis via `/admin/pwa`
- `InstallPrompt` component para prompt de instalação

---

## 12. Hooks Customizados

| Hook | Arquivo | Função |
|---|---|---|
| `useAuth` | `src/hooks/useAuth.tsx` | Contexto de autenticação + roles |
| `useFacebookPixel` | `src/hooks/useFacebookPixel.ts` | Disparo de eventos do Facebook Pixel |
| `useAbandonedCart` | `src/hooks/useAbandonedCart.ts` | Salvamento de carrinho abandonado |
| `useCheckoutPresence` | `src/hooks/useCheckoutPresence.ts` | Contagem de visitantes em tempo real |
| `useIsMobile` | `src/hooks/use-mobile.tsx` | Detecção de viewport mobile (<768px) |
| `useToast` | `src/hooks/use-toast.ts` | Sistema de toasts |

---

## 13. Design System

### Tokens CSS (index.css)
- Cores HSL via CSS custom properties
- Tema único (light) com variantes para:
  - **Admin sidebar:** Dark (`--sidebar-*`)
  - **Checkout:** Dark surface (`--checkout-*`)
  - **Área de membros:** Netflix-dark (`--member-*`)
- Cor primária: `hsl(145 65% 42%)` (verde)
- Border radius: `0.75rem`

### Componentes UI
- Baseados em shadcn/ui (Radix primitives)
- 40+ componentes no `src/components/ui/`

---

## 14. Gamificação (Header Admin)

- Barra de progresso no header do admin (`HeaderGamification`)
- Baseada na receita total do produtor
- Marcos de faturamento com badges visuais
- Som de notificação ao atingir nova venda

### Sales Gamification (`SalesGamification`)
- Componente de gamificação de vendas

---

## 15. Considerações Finais

### Pontos fortes
- Arquitetura multi-tenant com RLS robusto
- Checkout altamente personalizável (builder visual + CSS custom)
- Tracking completo (Pixel browser + CAPI server-side)
- Área de membros responsiva e mobile-first
- PWA com notificações push
- Sistema de webhooks para integrações externas
- Suporte a múltiplos gateways de pagamento

### Pontos de atenção
- Tabela `integrations` ainda placeholder (página vazia)
- Sem sistema de assinatura recorrente real (billing_cycle presente mas sem integração de cobrança recorrente)
- OneSignal configurado apenas para super admin
- Sem rate limiting explícito nas Edge Functions
- Sem testes automatizados abrangentes

### Preparação para escala
- Banco relacional normalizado
- RLS granular permite multi-tenancy seguro
- Edge Functions stateless e escaláveis
- Design system componentizado e reutilizável
- Separação clara entre frontend público e admin

---

*Documento gerado em 13/03/2026. Reflete o estado atual do sistema em produção.*
