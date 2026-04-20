

# Limpeza do painel `/admin/pixel` — corrigida com bug encontrado

## 🐛 Bug crítico descoberto na varredura

A tabela `pixel_events` **NÃO tem coluna `pixel_id`** — só tem `product_id`. Isso significa que **é tecnicamente impossível** atribuir eventos a um pixel específico quando há 2 pixels no mesmo produto. Os eventos são gravados sem saber pra qual pixel pertencem.

**Implicação:** o plano original (de agrupar eventos por `pixel_id` na RPC) **não funciona** sem antes adicionar essa coluna.

## Estado real do banco hoje

| Pixel | Produto | Token | Último evento |
|-------|---------|-------|--------------|
| `25118489994495137` | Produto A | ❌ invalid | 7 dias |
| `25118489994495137` | Produto B | ❌ invalid | 5 dias |
| `4374452939493191` | Desafio 14 Dias | ❌ invalid | nunca registrado |
| `26487693714174431` | Desafio 14 Dias | ❌ invalid | nunca registrado |

**4 de 4 pixels com token inválido** (consequência confirmada da desabilitação da conta Meta). E o `last_event_at` está vazio nos novos porque o backend ainda não atualiza esse campo no insert de eventos.

## Plano corrigido (3 fases)

### Fase 1 — Banco: adicionar `pixel_id` em `pixel_events`

**Migration:**
1. `ALTER TABLE pixel_events ADD COLUMN pixel_id text` (nullable)
2. Backfill: para eventos antigos onde o produto tem **só 1 pixel**, popular `pixel_id` com o pixel daquele produto. Onde tem 2+ pixels, deixar `NULL` (ambíguo).
3. Índice: `CREATE INDEX idx_pixel_events_pixel_id ON pixel_events(pixel_id, created_at DESC)`
4. Atualizar `get_pixel_feedback_metrics` para agrupar por `pixel_id` em vez de `product_id`. Eventos com `pixel_id NULL` (legacy) ficam num bucket "não atribuído".
5. Atualizar `get_pixel_feedback_metrics` para calcular `last_event_at` em tempo real via `MAX(pe.created_at)`.

### Fase 2 — Backend: passar `pixel_id` ao gravar evento

Locais que inserem em `pixel_events`:
- `facebook-capi/index.ts` — já recebe `pixel_id` no payload, só falta gravar
- `useFacebookPixel.ts` (frontend) — já tem o `pixel_id` em mãos quando dispara

Adicionar `pixel_id` em ambos os inserts.

### Fase 3 — Frontend: limpar os componentes confusos

- **`PixelHealthBanner.tsx`** → vira **"Diagnóstico de saúde geral"** consolidado:
  ```text
  🔴 Saúde geral: AÇÃO NECESSÁRIA
  ❌ 4 de 4 pixels com token inválido
  ⚠️  1 produto com pixels duplicados
  📭 12 produtos ativos sem pixel cadastrado
  ```
- **`PixelSuggestions.tsx`** → removido (texto vai pro banner consolidado)
- **`PixelBalanceCard.tsx`** → quando 2+ pixels apontam pro mesmo produto, mostrar aviso amarelo em vez de barras enganosas
- **`PixelComparisonChart.tsx`** → esconder quando todos os pixels compartilham o mesmo produto (não há comparação válida)
- **`src/pages/admin/Pixel.tsx`** → reordenar:
  ```text
  1. 🩺 Diagnóstico de saúde geral
  2. ⚙️  Pixels cadastrados (cards individuais)
  3. 📊 Comparação visual (só se aplicável)
  4. 📭 Produtos sem pixel
  5. 📡 Feed ao vivo
  ```

## Outros bugs menores encontrados

- `PixelHealthBanner.tsx` (linha 11): cálculo de "stale" usa `last_event_at` que está sempre `null` para os pixels novos → sempre vai mostrar 0 stale mesmo quando real. Será corrigido na Fase 1 (RPC calcula `last_event_at` em runtime).
- `PixelComparisonChart.tsx`: trunca o `pixel_id` em 14 chars + `…` (linha 36) — ok, mas com 2 pixels iguais no mesmo produto fica idêntico visualmente. Será resolvido junto com Fase 3.

## Arquivos editados

- **Migration:** adicionar coluna `pixel_id`, backfill, índice, atualizar RPC
- `supabase/functions/facebook-capi/index.ts` — gravar `pixel_id` no insert
- `src/hooks/useFacebookPixel.ts` — gravar `pixel_id` no insert browser
- `src/components/admin/pixel/PixelHealthBanner.tsx` — virar diagnóstico consolidado
- `src/components/admin/pixel/PixelBalanceCard.tsx` — detectar duplicatas
- `src/components/admin/pixel/PixelComparisonChart.tsx` — esconder se irrelevante
- `src/pages/admin/Pixel.tsx` — reordenar e remover `PixelSuggestions`
- `src/components/admin/pixel/PixelSuggestions.tsx` — apagar (consolidado no banner)

## O que NÃO vou mexer

- ❌ Lógica de envio do CAPI pra Meta (`facebook-capi` envia normal pra Meta — só adiciona uma coluna no log local)
- ❌ Cron `pixel-token-health`
- ❌ Componentes fora do `/admin/pixel`

## Resultado prático

- Cada card vai mostrar **eventos reais e separados** do pixel certo (eventos novos a partir do deploy)
- O painel vai dizer **com clareza** que os 4 tokens estão inválidos por causa da Meta — sem barras enganosas
- "Último evento" passa a mostrar tempo real
- Aviso amarelo te alerta sobre o produto com 2 pixels duplicados
- Topo da página vira **1 card resumo** em vez de 3 componentes soltos

## Custo

- 1 migration · 2 edge/hook edits · 4 component edits · 1 component deletion · ~7 min

