

## Worker está vivo e funcionando

Acabei de testar `https://geo.panttera.com.br` e ele respondeu certinho:
- HTTP 200, JSON válido
- CORS liberado pra `app.panttera.com.br`
- Geo populado (`country`, `city`, `currency`, etc.)

Agora falta a **Fase 2**: fazer o app consumir esse endpoint.

## O que vou implementar (com sua aprovação)

### 1. `src/lib/cfGeo.ts` — adicionar função `bootGeo()`
- Faz `fetch('https://geo.panttera.com.br')` com timeout de 1.5s
- Cacheia o resultado em `sessionStorage` (chave `cfGeo`) — só busca 1x por aba
- Seta `window.cfGeo` com o JSON recebido
- Se falhar/timeout → fica `null`, app continua funcionando (degradação graciosa que já existe)

### 2. `src/main.tsx` — chamar no boot
- Antes do `createRoot().render()`, chama `bootGeo()` com `Promise.race` + timeout 1.5s
- Não bloqueia a renderização: se demorar, React monta sem geo e os hooks (`useGeo`) re-leem depois

### 3. Resto do código — **zero mudanças**
- `useGeo`, `useFacebookPixel`, `facebook-capi`, `Checkout` já consomem `window.cfGeo`
- Vão começar a funcionar automaticamente

## Como vou validar

1. Abrir `app.panttera.com.br` no console:
   - `window.cfGeo` retorna objeto com `country`, `city`, etc.
2. Aba Network: 1 request pra `geo.panttera.com.br` no boot, ~50-100ms
3. Pixel Helper / CAPI: eventos começam a sair com geo dinâmico

## Risco

Praticamente zero. Se o Worker cair ou der timeout:
- App roda igual hoje (sem geo, mas funcional)
- Sem white screen, sem erro pro usuário

