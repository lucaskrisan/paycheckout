

# Remover painel `/admin/pixel` — manter só o disparo automático

## O que você quer

- Remover **completamente** a página "Pixel — Saúde e Retroalimentação" do menu/admin
- Continuar adicionando pixels normalmente em **Configurações do produto → aba Pixel**
- Os pixels seguem disparando automaticamente (browser + CAPI) sem nenhum painel monitorando

## Boa notícia: o disparo já funciona sozinho ✅

O `useFacebookPixel.ts` no checkout já faz exatamente o que você quer:
- Lê todos os pixels cadastrados em `product_pixels` para aquele produto
- Inicializa `fbq("init", pixelId)` para **cada um deles** em loop
- Dispara browser + CAPI em paralelo, deduplicados por `event_id`

Ou seja, **não precisa mexer em lógica nenhuma de disparo**. É só apagar o painel de monitoramento.

## O que vou apagar

### Arquivos
- `src/pages/admin/Pixel.tsx` (a página inteira)
- `src/components/admin/pixel/PixelHealthBanner.tsx`
- `src/components/admin/pixel/PixelComparisonCard.tsx`
- `src/components/admin/pixel/PixelEventsFeed.tsx`
- `src/components/admin/pixel/PixelEMQTable.tsx`
- `src/components/admin/pixel/PixelHealthBadge.tsx`
- `src/components/admin/pixel/UpdateTokenDialog.tsx`
- Pasta inteira `src/components/admin/pixel/` se ficar vazia

### Referências a remover
- `src/App.tsx` (linha 79) → remover `const Pixel = lazy(...)` e a `<Route>` correspondente
- `src/components/admin/AdminSidebar.tsx` (linha 88-91) → remover item "Pixel" do menu

## O que NÃO vou mexer

- ✅ `src/hooks/useFacebookPixel.ts` — segue disparando todos os pixels normalmente
- ✅ `supabase/functions/facebook-capi/index.ts` — segue enviando pra Meta normalmente
- ✅ Tabela `product_pixels` — onde os pixels são cadastrados (continua funcionando)
- ✅ `src/pages/admin/ProductEdit.tsx` aba Pixel — onde você adiciona/remove pixels do produto
- ✅ `src/pages/admin/Tracking.tsx` — outro painel de tracking, mais geral, fora desse escopo
- ✅ Tabelas `pixel_events`, `emq_snapshots` — ficam no banco (apenas param de ser consultadas)
- ✅ Cron de `pixel-token-health` — opcional manter (roda silencioso, não atrapalha)

## Resultado prático

- Menu lateral fica mais limpo (item "Pixel" some)
- Adicionar pixel = abrir produto → aba Pixel → colar ID + token → salvar → **dispara automaticamente**
- Zero painel, zero ruído, zero dado confuso
- Se um dia quiser monitorar, basta usar o **Gerenciador de Eventos do próprio Facebook** (que é a fonte oficial de verdade)

## Custo

- 7 deleções · 2 edits leves · ~2 min

