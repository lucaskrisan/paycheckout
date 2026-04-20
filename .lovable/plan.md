

# O que falta — Sprints 2 e 3 do Nina Tracking™

Sprint 1 está completo (header, KPIs, alerts, feed enriquecido, toasts Nina). Restam **Sprint 2** (visualização avançada) e **Sprint 3** (skills premium).

---

## Sprint 2 — Visualização avançada

### 1. Funil Live horizontal
- 5 etapas: PageView → ViewContent → InitiateCheckout → AddPaymentInfo → Purchase
- Barras horizontais com largura proporcional ao volume
- Pills douradas entre etapas mostrando % de conversão
- Cores graduais teal → gold do topo ao fundo
- Watermark `nina ✦` no canto
- Fonte: agregação de `pixel_events` por `event_name` no período selecionado
- Componente: `src/components/admin/tracking/LiveFunnel.tsx`

### 2. Heatmap 7d × 24h "Quando vendemos mais"
- Grid 7 linhas (dias S/T/Q/Q/S/S/D) × 24 colunas (horas 00–23)
- Escala dourada de intensidade (do bg escuro até gold puro)
- Tooltip ao hover: "Terça 20h — 12 vendas, R$ 8.450"
- Fonte: `pixel_events` filtrados por `event_name=Purchase` últimos 7 dias
- Componente: `src/components/admin/tracking/ConversionHeatmap.tsx`

### 3. EMQ Score ring chart colorido (refinamento)
- Substitui o número simples atual no card EMQ do hero
- Ring SVG circular animado 0–10
- Verde (>8) / amarelo (6–8) / vermelho (<6)
- Número grande no centro + label "Excelente/Bom/Atenção"
- Refatorar dentro de `HeroKPIStrip.tsx`

---

## Sprint 3 — Skills premium (zero IA)

### 4. Modo TV
- Botão `[📺 TV Mode]` no header (ao lado das pills de período)
- Ao clicar: `requestFullscreen()` + classe `tv-mode` no root do dashboard
- CSS: fonte +30%, padding maior, ka-ching com volume +20%
- Esc sai do modo
- Ideal pra deixar num monitor da sala da equipe

### 5. Comparativo "vs período anterior" nos KPIs
- Cada um dos 4 cards do hero ganha badge de delta colorido
- Eventos/min: já tem (vs 5min) — manter
- EMQ: vs média da semana anterior
- Visitantes: vs mesma hora ontem
- Receita: vs ontem (já tem) — manter
- Verde se ↑, vermelho se ↓, cinza se igual
- Refatorar dentro de `HeroKPIStrip.tsx`

---

## O que NÃO entra (mantido descartado)

- ❌ Sidebar nova
- ❌ Card "Nina AI Insight" com IA real
- ❌ Botão "Aplicar Estratégia"
- ❌ Rodapé com "Node BRA-01" / versão fake

---

## Ordem sugerida

```text
Sprint 2 (1 sessão) — Funil + Heatmap + EMQ ring
Sprint 3 (1 sessão) — Modo TV + Comparativos
```

**Custo de IA: R$ 0,00 — tudo client-side, zero migrations, zero edge functions.**

**Posso executar o Sprint 2 agora?**

