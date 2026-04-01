
# 🔧 Plano de Refatoração e Otimização — PanteraPay

## Etapa 1: Code Splitting & Bundle Size (Prioridade Crítica)
**Objetivo:** Reduzir o bundle inicial (~2.2MB) para < 500KB

- **Separar AdminLayout.tsx (359 linhas)** em módulos menores:
  - `AdminHeader.tsx` — Barra superior com gamificação e menu do usuário
  - `useAdminOrders.ts` — Hook para realtime de pedidos e revenue
  - `useVisitorToasts.ts` — Hook para toasts de atividade de visitantes
  - `useOneSignalInit.ts` — Hook já existente, extrair para arquivo próprio
  - `AdminAccessRedirect.tsx` — Componente de redirecionamento
- **Lazy load de componentes pesados do checkout:** `CreditCardForm`, `PixPayment`, `OrderSummary`
- **Dynamic import de bibliotecas pesadas:** `recharts`, `framer-motion`, `dnd-kit` (só quando necessário)

## Etapa 2: Otimização de Queries & Cache (Prioridade Alta)
**Objetivo:** Reduzir latência e chamadas redundantes ao banco

- **Migrar queries do Dashboard para `useQuery`** com `staleTime` adequado (já configurado 5min global)
- **Adicionar `.select()` específicos** em vez de `select("*")` — buscar apenas colunas necessárias
- **Implementar paginação server-side** em Orders e Customers (substituir `.limit(1000)` por cursor pagination)
- **Consolidar queries paralelas** com `Promise.all()` onde já não estiver implementado
- **Adicionar índice composto** em `orders(user_id, status, created_at)` para queries de dashboard

## Etapa 3: Redução de Re-renders (Prioridade Alta)
**Objetivo:** Eliminar renderizações desnecessárias

- **Memoizar componentes de listagem** (Orders, Products, Customers) com `React.memo`
- **Extrair callbacks estáveis** com `useCallback` nos formulários de checkout
- **Usar `useMemo` para cálculos derivados** (totais, filtros, agrupamentos)
- **Separar contextos do `useAuth`** — `AuthStateContext` (user/loading) e `AuthActionsContext` (signIn/signOut) para evitar re-render cascata

## Etapa 4: Edge Functions & Backend (Prioridade Média)
**Objetivo:** Melhorar resiliência e performance do backend

- **Adicionar input validation (Zod)** nas edge functions que ainda não têm: `create-pix-payment`, `create-asaas-payment`, `billing-recharge`
- **Implementar rate limiting em código** para endpoints sensíveis: `create-pix-payment`, `billing-recharge`, `delete-account`
- **Padronizar error handling** — respostas genéricas ao cliente, logs detalhados no servidor
- **Revisar timeouts** de chamadas a APIs externas (Asaas, Pagar.me, Evolution)

## Etapa 5: UX & Acessibilidade (Prioridade Média)
**Objetivo:** Melhorar experiência e conformidade

- **Skeleton loading** em todas as tabelas admin (substituir Loader2 spinner)
- **Implementar `ErrorBoundary`** em cada rota admin para isolar crashes
- **Adicionar `aria-label` e `role`** nos componentes interativos do checkout
- **Otimizar imagens** — lazy loading com `loading="lazy"` e formatos WebP

## Etapa 6: Monitoramento & Observabilidade (Prioridade Baixa)
**Objetivo:** Detectar problemas antes dos usuários

- **Adicionar logging estruturado** nas edge functions com correlation IDs
- **Implementar health checks** automatizados para gateways de pagamento
- **Dashboard de métricas de email** — taxas de entrega, bounce, abertura (já tem dados em `email_logs`)
- **Alertas de saldo negativo** — notificação automática quando billing_accounts.blocked = true

---

### Estimativa de Impacto
| Etapa | Impacto Performance | Esforço | Risco |
|-------|-------------------|---------|-------|
| 1. Code Splitting | ⬆⬆⬆ | Médio | Baixo |
| 2. Queries & Cache | ⬆⬆⬆ | Médio | Baixo |
| 3. Re-renders | ⬆⬆ | Baixo | Baixo |
| 4. Edge Functions | ⬆ (resiliência) | Alto | Médio |
| 5. UX & Acessibilidade | ⬆ (percepção) | Médio | Baixo |
| 6. Monitoramento | ⬆ (preventivo) | Alto | Baixo |

**Recomendação:** Executar Etapas 1→2→3 em sequência para máximo impacto com menor risco. Etapas 4-6 podem ser paralelizadas.
