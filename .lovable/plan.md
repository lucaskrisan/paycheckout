

# Painel "Pixel" — Versão Final + 2 ajustes finais

## Os 2 ajustes que faltaram

### Ajuste 1 — Botão "Recadastrar token" direto no card
Quando o cron detectar token inválido (ex: você renovou na BM e esqueceu de atualizar aqui), em vez de você ter que ir no produto → editar → aba pixels → trocar token, aparece **botão direto no card vermelho**:

```text
🔴 Token inválido há 2h
[Atualizar token agora →]
```
Clica → modal pequeno → cola token novo → salvo. **30 segundos resolve.**

### Ajuste 2 — Exportar relatório (PDF/CSV)
Botão `[📥 Exportar]` no canto superior. Gera relatório com snapshot do dia: métricas dos pixels, EMQ por evento, eventos disparados, status do token. Útil pra:
- Mandar pro gestor de tráfego
- Anexar em reuniões
- Histórico mensal de saúde

## Plano consolidado completo

### Localização no menu (Super Admin only)
```text
ANÁLISE
├── Analytics
├── Métricas
├── 🎯 Pixel              ← NOVO
└── Financeiro
```
Rota: `/admin/pixel`

### Layout final da página
```text
┌──────────────────────────────────────────────────────┐
│ 🎯 Pixel — Saúde e Retroalimentação  [📺 TV] [📥 PDF]│
├──────────────────────────────────────────────────────┤
│ 🟢 TUDO SAUDÁVEL · 2 pixels · 396 Purchases (7d)     │
├──────────────────────────────────────────────────────┤
│ 💡 SUGESTÕES INTELIGENTES                             │
├──────────────────────────────────────────────────────┤
│ ⚖️ EQUILÍBRIO ENTRE PIXELS (24h)                      │
├──────────────────────────────────────────────────────┤
│ ┌─ PIXEL ÓRFÃO ─┐  ┌─ PIXEL NOVO ─┐                  │
│ │ Token: ✅      │  │ Token: ✅      │                  │
│ │ EMQ por evento│  │ EMQ por evento│                  │
│ │ [Atualizar]   │  │ [Atualizar]   │ ← Ajuste 1       │
│ └───────────────┘  └───────────────┘                  │
├──────────────────────────────────────────────────────┤
│ 📊 COMPARAÇÃO VISUAL (barras lado a lado)            │
├──────────────────────────────────────────────────────┤
│ 📦 PRODUTOS SEM PIXEL (12)                            │
├──────────────────────────────────────────────────────┤
│ 📡 FEED AO VIVO                                       │
└──────────────────────────────────────────────────────┘
```

### Restrição de acesso
- Sidebar: item visível só se `isSuperAdmin === true`
- Página: redireciona pra `/admin` se não-super-admin
- RPC e Edge Functions: validam `is_super_admin(auth.uid())` no backend

### Arquivos novos

**Página:** `src/pages/admin/Pixel.tsx`

**Componentes (11):**
- `PixelHealthBanner.tsx` — semáforo verde/vermelho topo
- `PixelSuggestions.tsx` — sugestões inteligentes
- `PixelBalanceCard.tsx` — equilíbrio entre pixels (add-on 3)
- `PixelComparisonCard.tsx` — card individual lado a lado
- `PixelEMQTable.tsx` — EMQ granular por evento (add-on 2)
- `PixelHealthBadge.tsx` — badge ✅/❌ token
- `PixelLearningProgress.tsx` — barra saída learning
- `PixelComparisonChart.tsx` — barras visuais
- `ProductsWithoutPixel.tsx` — tabela 12 produtos
- `PixelEventsFeed.tsx` — feed ao vivo
- `UpdateTokenDialog.tsx` — modal de atualização de token (ajuste 1)

**Editar:**
- `AdminSidebar.tsx` — adicionar item "Pixel" abaixo de Métricas
- `App.tsx` — registrar rota `/admin/pixel`

### Backend

**Migration:**
- 3 colunas em `product_pixels`: `token_status`, `last_health_check_at`, `last_event_at`

**RPCs novas (2):**
- `get_pixel_feedback_metrics(p_pixel_id, p_product_id, p_days)` — agregação completa server-side
- `update_pixel_token(p_pixel_id, p_new_token)` — validação super admin + update seguro (ajuste 1)

**Edge Functions novas (3):**
- `pixel-token-health` — cron diário 8h (testa tokens)
- `pixel-activity-monitor` — cron 30min (detecta pixel parado, add-on 1)
- `pixel-export-report` — gera PDF/CSV sob demanda (ajuste 2)

**Cron jobs:** 2 novos via `pg_cron` + `pg_net`

### O que NÃO vou mexer
- ❌ `useFacebookPixel.ts` (já suporta multi-pixel)
- ❌ `facebook-capi/index.ts` (já suporta multi-pixel)
- ❌ `/admin/tracking` atual (segue intacto)
- ❌ ProductEdit > aba Pixels (cadastro continua igual)

### Custo
- Lovable AI: **R$ 0,00**
- Migrations: 1
- Edge Functions novas: 3
- Cron jobs novos: 2
- Componentes novos: 11
- Tempo: ~12 min de execução

### Sequência após aprovar
1. Migration (3 colunas + 2 RPCs)
2. 3 Edge Functions + 2 cron jobs
3. 11 componentes + página + rota + sidebar
4. Painel `/admin/pixel` aparece (só pra você)
5. Mostra inicialmente o pixel órfão com métricas reais + EMQ + status
6. Quando você criar o pixel novo na BM, me passa ID + token
7. Cadastro no produto âncora pelo painel ProductEdit normal
8. Painel automaticamente mostra 2 cards lado a lado
9. Crons começam a rodar diário + a cada 30min

### Recapitulando tudo que o painel terá
1. Semáforo geral ✅
2. Sugestões inteligentes ✅
3. Equilíbrio entre pixels (add-on 3) ✅
4. Cards comparativos lado a lado ✅
5. EMQ granular por evento (add-on 2) ✅
6. Health check de token (cron diário) ✅
7. Detector de pixel parado (cron 30min, add-on 1) ✅
8. Barra de progresso learning ✅
9. Gráfico de barras visual ✅
10. Lista produtos sem pixel ✅
11. Feed ao vivo de eventos ✅
12. Modo TV ✅
13. Botão atualizar token direto (ajuste 1) ✅
14. Exportar relatório PDF/CSV (ajuste 2) ✅
15. Restrito Super Admin ✅

**Sem mais sugestões — esse é o pacote completo. Pode aprovar.**

