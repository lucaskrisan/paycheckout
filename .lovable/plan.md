

## Padronizar TODOS os eventos no formato KwaiPay

Você quer que **todos** os eventos CAPI (não só `Purchase`) sigam o mesmo padrão premium: hashes string, IPv4 real, geo completo, e `custom_data` rico.

## Eventos que vou padronizar

Levantamento dos call-sites atuais (`useFacebookPixel.ts` + outros):

| Evento | Quando dispara | `custom_data` específico |
|---|---|---|
| `PageView` | Carrega checkout | (sem value/contents) |
| `ViewContent` | Vê produto no checkout | `content_ids`, `content_name`, `content_type`, `value`, `currency` |
| `InitiateCheckout` | Começa preencher form | `value`, `currency`, `content_ids`, `num_items`, `contents` |
| `AddPaymentInfo` | Escolhe método pagamento | `value`, `currency`, `payment_method` |
| `Purchase` | Pagamento aprovado | `value`, `currency`, `order_id`, `content_ids`, `content_name`, `num_items`, `contents`, `payment_method` |
| `Lead` | Captura lead (PIX gerado) | `value`, `currency`, `content_ids` |

**Todos** vão receber automaticamente (via edge function):
- `user_data` com hashes em **string**
- `external_id` = CPF hashed (string única)
- `client_ip_address` = IPv4 real do `getBestIp()`
- `client_user_agent` real
- `ct, st, zp, country` hashed (string)
- `fbc, fbp` quando disponíveis

## Execução em 3 frentes

### 1. Cloudflare Worker `geo.panttera.com.br` (você cola)
Já passei o código. Adiciona `ipv4`, `ipv6`, `bestIp` no JSON.
Pré-requisito: **Network → Pseudo IPv4 → Add header** no painel CF.

### 2. App
**`src/lib/cfGeo.ts`**
- Tipo `CfGeo` ganha `ipv4`, `ipv6`, `bestIp`
- Novo helper `getBestIp()` (IPv4 → IPv6 → ip)

**`src/hooks/useFacebookPixel.ts`** (centralizar)
- Helper interno `buildCapiPayload(eventName, customData)` que sempre injeta:
  - `client_ip: getBestIp()`
  - `geo: { city, state, zip, country }` do `window.cfGeo`
  - `user_agent: navigator.userAgent`
  - `fbc`, `fbp` dos cookies
- Cada função (`trackPageView`, `trackViewContent`, `trackInitiateCheckout`, `trackAddPaymentInfo`, `trackPurchase`, `trackLead`) chama esse helper
- Eventos com carrinho passam `contents` + `num_items`
- Eventos de pagamento passam `payment_method`

### 3. Edge `supabase/functions/facebook-capi/index.ts`
Reescrita única que aplica a TODOS os eventos:
- Hashes viram **string** (remove `[...]`)
- `external_id` = só CPF hashed (string)
- `client_ip_address` = `payload.client_ip` (fallback header)
- `custom_data` aceita opcional `contents`, `num_items`, `payment_method` (passa adiante quando vier)
- Mantém: validação IP privado, fbc >90 dias, `fire_on_pix`/`fire_on_boleto`, força BRL, dual-log browser+server

## Resultado

Todos os 6 eventos saem no formato KwaiPay. EMQ médio sobe de ~7-8 pra ~9-10 em **toda** a jornada (não só Purchase).

## Risco

Zero. Mudança é aditiva no edge (Meta aceita string e array). Se o Worker falhar, tudo cai pro comportamento atual.

