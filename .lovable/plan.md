

## Voltando ao Worker Cloudflare — Próximo passo

Pelo histórico, a gente parou no diagnóstico de que o **Worker não estava injetando `window.cfGeo`** porque o `HTMLRewriter` procurava `<head>` (que não existe no HTML cru do Vite). A correção proposta foi trocar para `'html'`.

Antes de continuar, preciso saber em que pé está:

### Ponto de status

Você precisa me dizer:

1. **Atualizou o Worker?** Se sim, no console de `app.panttera.com.br` (aba anônima), o que aparece quando digita `window.cfGeo`?
   - Objeto com `country`, `city`, etc → Worker OK, posso seguir pra Fase final
   - `undefined` → Worker ainda não injeta, precisa ajustar
   - Não atualizou ainda → te passo o código novamente

2. **Quer mudar a abordagem?** Opções:
   - **A)** Continuar com Worker injetando `window.cfGeo` (plano atual)
   - **B)** Trocar pra Edge Function própria que retorna geo via header `CF-IPCountry` (sem depender de Worker no Cloudflare)
   - **C)** Outra coisa que você tem em mente

### O que eu já tenho pronto no código (do lado do app)
- ✅ `src/lib/cfGeo.ts` lê `window.cfGeo` síncrono
- ✅ `src/hooks/useGeo.ts` exporta `{ country, currency, city, state, zip }`
- ✅ `useFacebookPixel.ts` usa geo dinâmico (telefone, currency, CAPI)
- ✅ `facebook-capi/index.ts` hasheia `ct/st/zp/country` dinâmicos
- ✅ `Checkout.tsx` propaga geo pros pagamentos
- ✅ Migration DB com `customer_city/zip/country`

Tudo do lado app está pronto e gracioso (não quebra se `cfGeo` for undefined). **Falta só o Worker injetar de verdade.**

### Me responde uma das duas:
- "Worker atualizado, `cfGeo` aparece assim: `{...}`" → eu finalizo derivação automática de currency (BR→BRL, US→USD, PT→EUR) e fechamos
- "Worker não funciona / quero abordagem diferente" → te mando o plano alternativo

