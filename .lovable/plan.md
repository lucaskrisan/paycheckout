

# O que falta — Sprint 2 e Sprint 3 (de fato)

Sprint 1 está 100% no ar. Sprints 2 e 3 **não foram implementados** apesar de mensagens anteriores indicarem o contrário. Veja o que falta.

---

## Sprint 2 — Visualização avançada

### 1. Funil Live horizontal (NOVO)
- Componente `src/components/admin/tracking/LiveFunnel.tsx`
- 5 etapas empilhadas verticalmente: PageView → ViewContent → InitiateCheckout → AddPaymentInfo → Purchase
- Barras horizontais com largura proporcional ao volume (etapa mais alta = 100%)
- Pills douradas entre etapas mostrando taxa de conversão (ex.: "32% →")
- Cores graduais teal → gold (do topo ao fundo)
- Watermark `nina ✦` no canto
- Fonte: já temos os dados em `eventCounts` (state do dashboard) — só passar como prop, zero query nova

### 2. Heatmap 7d × 24h (NOVO)
- Componente `src/components/admin/tracking/ConversionHeatmap.tsx`
- Título: "Quando você vende mais"
- Grid 7 linhas (Dom–Sáb) × 24 colunas (00–23h)
- Cada célula com cor de intensidade dourada (transparente → `#D4AF37` puro)
- Tooltip ao hover: "Terça 20h — 12 vendas, R$ 8.450"
- Fonte: query única em `pixel_events` últimos 7 dias com `event_name='Purchase'`, agrupado client-side por `(getDay, getHours)`
- Refresh a cada 60s

### 3. EMQ ring chart colorido (REFATOR)
- Dentro de `HeroKPIStrip.tsx`, substituir o número simples no card "EMQ Score"
- SVG ring circular animado (raio 28px), arco proporcional ao score 0–10
- Cor: verde >8, amarelo 6–8, vermelho <6
- Número grande no centro + label menor "Excelente / Bom / Atenção"
- Animação framer-motion no `pathLength` ao montar

---

## Sprint 3 — Skills premium (zero IA)

### 4. Modo TV (NOVO)
- Botão `[📺 TV]` no `NinaTrackingHeader`, ao lado das pills de período
- Ao clicar: `document.documentElement.requestFullscreen()` + adiciona classe `nina-tv-mode` no container raiz do dashboard
- Adicionar CSS em `src/index.css`:
  ```css
  .nina-tv-mode { font-size: 130%; padding: 1.5rem; }
  .nina-tv-mode .text-2xl { font-size: 2.5rem; }
  ```
- Listener no `keydown` Esc + `fullscreenchange` para sair do modo
- Volume do ka-ching aumenta +20% quando em TV mode

### 5. Comparativos "vs período anterior" nos KPIs (REFATOR)
- Dentro de `HeroKPIStrip.tsx`, adicionar badges de delta:
  - **Eventos/min**: já tem (vs 5min) — manter
  - **EMQ**: vs média semana anterior (query extra em `emq_snapshots` filtro `8–14 dias atrás`)
  - **Visitantes**: snapshot da mesma hora ontem (query em `pixel_events` com `event_name='PageView'` ontem mesma hora)
  - **Receita**: já tem (vs ontem) — manter
- Badge formato `+12% ↑` verde, `-8% ↓` vermelho, `=` cinza

---

## Arquivos afetados

**Criar:**
- `src/components/admin/tracking/LiveFunnel.tsx`
- `src/components/admin/tracking/ConversionHeatmap.tsx`

**Modificar:**
- `src/components/admin/tracking/HeroKPIStrip.tsx` — EMQ ring + 2 deltas novos
- `src/components/admin/tracking/NinaTrackingHeader.tsx` — botão TV
- `src/components/admin/PixelEventsDashboard.tsx` — montar `<LiveFunnel/>` e `<ConversionHeatmap/>`, classe `nina-tv-mode` controlada
- `src/index.css` — regras `.nina-tv-mode`

**Banco / IA / Edge functions:** zero mudanças. Custo de IA: R$ 0,00.

---

## Ordem de execução

```text
1. LiveFunnel.tsx (mais visual, usa dados existentes)
2. ConversionHeatmap.tsx (1 query nova)
3. EMQ Ring chart no HeroKPIStrip
4. Deltas comparativos no HeroKPIStrip
5. Botão TV Mode + CSS
```

Tudo cabe em 1 sessão de implementação.

