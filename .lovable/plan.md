

# Painel `/admin/pixel` minimalista — só o essencial

## O que fica

```text
┌─────────────────────────────────────────────────┐
│ 🩺 Diagnóstico de saúde geral                   │
│    - X tokens inválidos                         │
│    - Y produtos com pixels duplicados           │
└─────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────────┐
│ Card por pixel       │ Card por pixel           │
│ - ID                 │ - ID                     │
│ - Produto            │ - Produto                │
│ - Status do token    │ - Status do token        │
│ - Eventos REAIS (7d) │ - Eventos REAIS (7d)     │
│ - Purchases (7d)     │ - Purchases (7d)         │
│ - [Verificar][Token] │ - [Verificar][Token]     │
└──────────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────────┐
│ 📡 Feed de eventos ao vivo                      │
└─────────────────────────────────────────────────┘
```

## O que sai

- ❌ "Produtos sem pixel cadastrado" (componente `ProductsWithoutPixel.tsx`)
- ❌ Linha "Z produtos sem pixel" do banner de saúde geral
- ❌ Card "Equilíbrio entre pixels" (`PixelBalanceCard.tsx`)
- ❌ Gráfico "Comparação visual entre pixels" (`PixelComparisonChart.tsx`)
- ❌ Barra "Learning Phase" dentro dos cards (`PixelLearningProgress.tsx`)
- ❌ Tabela EMQ vazia (só mostrar quando houver dados reais)

## Correção crítica de dado (mantida do plano anterior)

Atualizar a RPC `get_pixel_feedback_metrics` com **JOIN estrito** por `pe.pixel_id = pp.pixel_id`. Eventos órfãos legacy (com `pixel_id NULL`) deixam de inflar os cards individuais. O pixel novo `26487693714174431` passa a mostrar **12 eventos reais** em vez dos 73 mil herdados.

## Arquivos editados

- **1 migration** — RPC com JOIN estrito por `pixel_id`, sem fallback por produto
- `src/pages/admin/Pixel.tsx` — remover `ProductsWithoutPixel`, `PixelBalanceCard`, `PixelComparisonChart`
- `src/components/admin/pixel/PixelHealthBanner.tsx` — remover linha "produtos sem pixel"
- `src/components/admin/pixel/PixelComparisonCard.tsx` — remover Learning Phase + esconder EMQ vazia

## Apagar

- `src/components/admin/pixel/ProductsWithoutPixel.tsx`
- `src/components/admin/pixel/PixelBalanceCard.tsx`
- `src/components/admin/pixel/PixelComparisonChart.tsx`
- `src/components/admin/pixel/PixelLearningProgress.tsx`

## O que NÃO vou mexer

- ❌ Lógica de disparo CAPI / pixel
- ❌ Botões Verificar / Token
- ❌ Feed ao vivo
- ❌ Cron de health check

## Resultado

- 3 seções enxutas: **Diagnóstico → Cards → Feed**
- Cards mostram **só a verdade** daquele pixel específico
- Zero ruído visual, zero dado inflado

## Custo

- 1 migration · 2 edits · 4 deleções · ~3 min

