

## Plano Final Consolidado — Geo via Cloudflare Worker

### Decisões aprovadas
- ✅ Worker em `app.panttera.com.br/*` (já no ar)
- ✅ Sem fallback ipapi.co (100% Cloudflare)
- ✅ CEP 100% silencioso (usa só `window.cfGeo.postal`)
- ✅ Campos DB mínimos: `customer_city`, `customer_zip`, `customer_country`
- ✅ **País dinâmico** do Cloudflare em todos os pontos onde hoje está hardcoded `"BR"`/`"br"`

### Onde o país está hardcoded hoje (vou trocar por `cfGeo.country`)

Auditoria rápida no código:

| Arquivo | Hardcode atual | Vira |
|---|---|---|
| `useFacebookPixel.ts` (advanced matching) | telefone forçado `+55` | usa `cfGeo.country`; só prefixa `+55` se BR |
| `useFacebookPixel.ts` (custom_data) | `currency: "BRL"` fixo | usa `cfGeo.currency` ou moeda do produto |
| `facebook-capi/index.ts` | `country: "br"` hasheado fixo | usa `cfGeo.country.toLowerCase()` |
| `useGeoCountry.ts` | fallback "US" + ipapi.co | **deletado**, substituído por `useGeo()` |
| `CustomerForm.tsx` / checkout intl | detecção país via ipapi | usa `cfGeo.country` síncrono |

### Execução em 3 fases

**Fase 1 — Infra base (síncrona, zero rede)**
- `src/vite-env.d.ts` — declarar tipo global `Window.cfGeo`
- `src/lib/cfGeo.ts` — helper síncrono (`getCfGeo`, `getCountry`, `getCurrency`, `getCity`, `getState`, `getZip`)
- `src/hooks/useGeo.ts` — hook que retorna `{ geo, country, currency, city, state, zip }` sync
- **Deletar** `src/hooks/useGeoCountry.ts`
- Remover qualquer fetch a `ipapi.co` / `ip-api.com` no projeto
- Migration DB: adicionar `customer_city`, `customer_zip`, `customer_country` em `orders` e `abandoned_carts`

**Fase 2 — CAPI dinâmico (EMQ 9+)**
- `supabase/functions/facebook-capi/index.ts`:
  - Aceitar `geo: { city, state, zip, country }` no body
  - Hashear `ct/st/zp/country` com SHA-256 lowercase no `user_data`
  - Remover hardcode `country: "br"` — agora vem do request

**Fase 3 — Integração no app**
- `src/hooks/useFacebookPixel.ts`: 
  - Aceitar geo no advanced matching
  - País do telefone dinâmico (só força `+55` se `country === "BR"`)
  - Propagar geo nos 4 eventos (PageView, InitiateCheckout, AddPaymentInfo, Purchase)
- `src/pages/Checkout.tsx`: chama `useGeo()`, passa pro pixel + salva nos inserts de `orders`
- `src/hooks/useCheckoutPresence.ts`: heartbeat com `city/state` real
- `src/hooks/useAbandonedCart.ts`: salva geo nos inserts
- Substituir `useGeoCountry` por `useGeo` em todos os imports do projeto

### Resultado esperado
- EMQ Score Meta: 6-7 → **9+** (ct/st/zp/country reais hasheados)
- País dinâmico em telefone, moeda, mapa e CAPI
- Mapa BR preciso por município no dashboard
- Bundle -1KB (zero fetch externo)
- Zero fricção UX

### Aviso sobre preview Lovable
No preview `*.lovable.app` o Worker NÃO roda → `cfGeo` será `undefined` → código gracioso (sem geo, sem quebrar). Para testar de verdade, sempre acessar via `https://app.panttera.com.br/...`.

Ao aprovar este plano, executo Fases 1+2+3 numa única passada e te aviso pra testar:
1. Console em prod: `window.cfGeo` deve mostrar geo completo
2. Meta Events Manager: ver `ct/st/zp/country` chegando hasheados
3. Dashboard mapa BR: novas vendas no município correto

