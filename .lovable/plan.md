

# Ajustes finais — Cadastro direto + Verificação automática do pixel órfão

## Resposta às suas perguntas

### 1. Cadastrar direto em Produtos funciona automático?
**Sim.** Cola Pixel ID + Token na aba Pixels do produto → próximo evento já dispara dual fire (browser + servidor) → painel `/admin/pixel` reflete sozinho. Os 2 crons rodam em background mantendo `token_status` e `last_event_at` atualizados.

### 2. Por que o pixel órfão tá sem verificação se já tem token?
Investiguei o banco e descobri 2 problemas:

**Problema A — Cron de health check nunca rodou ainda.**
Os 3 pixels existentes estão com `token_status = 'unknown'` e `last_health_check_at = NULL`. Significa que o cron diário foi agendado pra rodar **8h da manhã**, mas como ele acabou de ser criado, ainda não chegou o horário. **Só vai verificar amanhã às 8h.**

**Problema B — Você tá vendo pixel de outro produtor.**
Tem 3 pixels no banco:
- `4374452939493191` (seu pixel órfão, produto `35621f66...`)
- `25118489994495137` (de outro produtor, em 2 produtos)

A RPC `get_pixel_feedback_metrics` retorna **todos** sem filtrar por dono, então seu painel mostra os 3 misturados.

## Plano dos ajustes

### Ajuste 1 — Verificação imediata no momento do cadastro
Quando você (ou qualquer produtor) salva token novo na aba Pixels do produto, em vez de esperar o cron das 8h:
- Chama na hora a Edge Function `pixel-token-health` filtrada pra aquele pixel específico
- Em ~2 segundos a coluna `token_status` vira `'healthy'` ou `'invalid'`
- Card no painel já mostra ✅ ou ❌ imediatamente

**Implementação:**
- Edge Function `pixel-token-health` ganha parâmetro opcional `pixel_row_id` — se vier, testa só esse, senão testa todos (mantém comportamento do cron)
- Frontend da aba Pixels (em `ProductEdit.tsx` ou similar) chama `supabase.functions.invoke('pixel-token-health', { body: { pixel_row_id } })` após salvar

### Ajuste 2 — Botão "Verificar agora" no card do painel
No `PixelComparisonCard.tsx`, ao lado do badge de saúde, adicionar botão pequeno `[🔄 Verificar agora]` que dispara a mesma função e atualiza o painel. Útil quando você quer testar manualmente sem esperar o cron.

### Ajuste 3 — Filtrar painel pra mostrar só seus pixels
Atualizar a RPC `get_pixel_feedback_metrics` pra retornar **apenas pixels de produtos cujo dono é super admin** (ou seja, seus produtos). Pixels de produtores comuns continuam funcionando nos painéis deles, só somem do seu painel exclusivo.

**Filtro SQL:** `WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.user_id AND role = 'super_admin')` no JOIN com `products`.

**Resultado:** painel passa a mostrar **só seu pixel órfão `4374452939493191`** (1 card) em vez dos 3 atuais.

### Ajuste 4 — Disparar verificação retroativa dos pixels existentes
Logo após a migration, chamar a Edge Function uma vez pra processar os 3 pixels já cadastrados, pra eles saírem do estado `unknown` imediatamente sem esperar 8h.

## Arquivos a editar

**Backend:**
- **Migration:** atualizar `get_pixel_feedback_metrics` com filtro de super admin
- **Edge Function** `pixel-token-health/index.ts`: aceitar parâmetro opcional `pixel_row_id`

**Frontend:**
- `src/components/admin/pixel/PixelComparisonCard.tsx`: adicionar botão "Verificar agora"
- `src/pages/admin/ProductEdit.tsx` (ou componente da aba Pixels): chamar verificação automática após salvar token

**Pós-deploy (manual via Edge Function):**
- Trigger único de `pixel-token-health` sem parâmetro pra testar todos os 3 pixels existentes

## O que NÃO vou mexer

- ❌ Cron schedule (continua diário 8h pra manutenção contínua)
- ❌ Cron `pixel-activity-monitor` (continua a cada 30min)
- ❌ `useFacebookPixel.ts` e `facebook-capi/index.ts`
- ❌ Painel Tracking dos produtores

## Resultado prático após executar

1. Você abre `/admin/pixel` → vê **só o seu pixel órfão** (1 card limpo, sem confusão)
2. Em ~5 segundos após executar, o card mostra `Token: ✅ Healthy` (ou ❌ se tiver problema real)
3. Próxima vez que cadastrar pixel novo em qualquer produto → **verificação acontece na hora do salvar**, sem esperar 24h
4. Botão `[🔄 Verificar agora]` disponível no painel pra checagem manual a qualquer momento

## Custo

- Lovable AI: R$ 0,00
- Migrations: 1 (atualiza 1 RPC)
- Edge Functions: 1 (atualizar `pixel-token-health`)
- Componentes: 2 edits
- Tempo: ~4 min

