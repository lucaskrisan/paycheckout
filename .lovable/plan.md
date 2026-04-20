

# Briefing Completo — Nina Tracking™ Dashboard

Painel `/admin/tracking` será reconstruído com visual premium assinado pela Nina (branding puro, zero IA). Tudo client-side, zero migrations, zero custo de tokens.

---

## Sprint 1 — Esqueleto premium + Branding Nina

### Header Nina Tracking™
- Avatar circular da Nina (40px, borda dourada com glow sutil)
- Nome "Nina Tracking™" em SF Pro Display, gradiente teal `#14B8A6` → gold `#D4AF37`
- Tagline "Inteligência de conversão ao vivo" em cinza claro
- Badge ● LIVE pulsante verde
- Período pills (1h / 6h / 24h / 7d) à direita
- Filtro de produto dropdown

### Hero strip — 4 KPIs reais com watermark `nina ✦`
1. **Eventos/min** — número grande, seta tendência ↑↓ vs 5min anteriores, sparkline de fundo
2. **EMQ Score Live** — ring chart 0–10 (verde >8, amarelo 6–8, vermelho <6) — fonte: `emq_snapshots`
3. **Visitantes Ativos** — count em tempo real com pulse verde — fonte: `useCheckoutPresence`
4. **Receita Hoje** — R$ formatado, delta % vs ontem em badge — fonte: agregação `orders` paid

Cada card tem `nina ✦` em 10px no canto inferior direito (opacity 30%) — selo de marca.

### Fluxo de Eventos enriquecido
- Cards com bandeira do país emoji (🇧🇷) + cidade — fonte: `window.cfGeo` via `useGeo()`
- Nome do cliente + evento colorido + produto + valor
- Cards entram do topo com animação framer-motion (200ms ease-out)
- Purchase events: glow dourado + ka-ching automático (`notificationSounds.ts`)
- Toast Nina no Purchase: "Nina detectou uma venda 🎉 R$ {valor}"

### Smart Alerts (3 regras)
- 🔴 Queda >50% no volume vs hora anterior
- 🟡 CAPI offline >5min (sem `pixel_events` server_count recente)
- 🟢 Tudo operacional
- Dismissable com X

### Toast de boas-vindas (1ª visita do dia)
- "Bem-vindo de volta. Hoje já registrei {N} eventos pra você." — Nina
- Avatar Nina no toast via wrapper `sonner`

### Rodapé com selo Nina
- Avatar mini + "Nina Tracking™ • Realtime ativo • {N} eventos na última hora"

---

## Sprint 2 — Visualização avançada

5. **Funil Live horizontal** — PageView → ViewContent → InitiateCheckout → AddPaymentInfo → Purchase, com % de conversão entre etapas em pills douradas
6. **Heatmap 7d × 24h** — "Quando vendemos mais", escala dourada de intensidade, tooltip com count exato
7. **EMQ ring chart colorido** no hero (refinamento visual)

---

## Sprint 3 — Skills premium (sem IA)

8. **Modo TV** — botão fullscreen + fonte +30%, ka-ching mais alto, ideal pra monitor de sala
9. **Comparativo "vs período anterior"** nos KPIs — delta % colorido em todos os cards do hero

---

## O que foi descartado (decisões finais)

- ❌ Sidebar "Live Feed / Analytics / Ledger / Vault" — features inexistentes
- ❌ Card "Nina AI Insight" com IA real — Nina vira só branding visual
- ❌ Botão "Aplicar Estratégia" — risco de mexer em Meta Ads
- ❌ Rodapé "Node: BRA-01" e versão "v2.4.0-TacticalLive" — marketing falso
- ❌ Qualquer chamada à edge function `nina-chat` neste painel — zero IA, zero custo

---

## Detalhes técnicos

**Arquivo principal:**
- `src/components/admin/PixelEventsDashboard.tsx` — substitui conteúdo atual

**Componentes novos:**
- `src/components/admin/tracking/NinaTrackingHeader.tsx` — header com avatar + gradiente
- `src/components/admin/tracking/NinaWatermark.tsx` — selo `nina ✦` reutilizável
- `src/components/admin/tracking/NinaToast.tsx` — wrapper `sonner` com avatar custom
- `src/components/admin/tracking/HeroKPIStrip.tsx` — 4 KPIs
- `src/components/admin/tracking/LiveFunnel.tsx` — Sprint 2
- `src/components/admin/tracking/ConversionHeatmap.tsx` — Sprint 2
- `src/components/admin/tracking/SmartAlertsPanel.tsx` — Sprint 1
- `src/components/admin/tracking/EventFeedCard.tsx` — card individual com bandeira/glow

**Asset novo:**
- `src/assets/nina-avatar.png` — foto/ilustração da Nina (já existe na identidade)

**Reutilizado (zero código novo):**
- `src/lib/notificationSounds.ts` — ka-ching pronto
- `src/hooks/useGeo.ts` + `window.cfGeo` — geo pronto
- `src/hooks/useCheckoutPresence.ts` — visitantes ativos
- `sonner` (já em uso) — toasts

**Banco de dados:**
- Zero migrations novas
- Tabelas usadas: `pixel_events`, `emq_snapshots`, `orders`, `products`
- Realtime via `postgres_changes` (já em uso)

**Rota:** `/admin/tracking` (sem mudança)

**Tema:** Tactical Glassmorphism — bg `#0F172A`, accents teal `#14B8A6` + gold `#D4AF37`

**Custo de IA:** R$ 0,00

---

## Ordem de execução sugerida

```text
Sprint 1 (1 sessão) — funcional + Nina branding
  └─ Entrega 80% do visual do mockup Stitch com dados reais
Sprint 2 (1 sessão) — funil + heatmap + EMQ ring
Sprint 3 (1 sessão) — modo TV + comparativos
```

**Começamos pelo Sprint 1?**

