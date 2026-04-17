
Situação:
- Eu conferi o código e a busca da geo já existe de verdade em `src/main.tsx` e `src/lib/cfGeo.ts`.
- O app deveria chamar `https://geo.panttera.com.br` antes de montar o React.
- Como você testou em outro computador e ainda falhou, o problema não parece ser só cache do navegador.
- Também não apareceu evidência clara da chamada `geo.panttera.com.br` nos logs/requisições atuais, então hoje o mais provável é: o domínio publicado não está usando o código mais novo, ou o `bootGeo()` está falhando cedo sem diagnóstico suficiente.

O que vou fazer quando você aprovar:
1. Confirmar de onde vem a falha
   - comparar preview, publicado e domínio customizado
   - verificar se `app.panttera.com.br` está mesmo servindo a versão com `bootGeo()`

2. Colocar diagnóstico simples e visível
   - adicionar um debug global, por exemplo `window.__cfGeoDebug`
   - guardar: iniciou, buscou, sucesso, falhou, motivo e horário

3. Fortalecer o `cfGeo`
   - registrar melhor início/fim da busca
   - mostrar se foi timeout, CORS, HTTP ruim ou JSON inválido
   - manter o app funcionando mesmo se a geo cair

4. Deixar a validação fácil pra você
   - no console, você vai poder rodar:
```js
window.__cfGeoDebug
window.cfGeo
```
   - isso vai dizer na hora se tentou buscar e por que deu certo ou errado

5. Validar ponta a ponta
   - abrir `app.panttera.com.br`
   - confirmar 1 request para `geo.panttera.com.br`
   - confirmar `window.cfGeo` preenchido
   - confirmar checkout/CAPI/abandono usando país/cidade/CEP reais

Detalhes técnicos:
- `src/main.tsx` já chama `bootGeo()` antes do React renderizar.
- `src/lib/cfGeo.ts` já faz fetch com timeout de 1.5s e cache em `sessionStorage`.
- `public/sw.js` está praticamente vazio; então o problema principal não parece ser esse arquivo.
- O erro de OneSignal no preview é separado e não explica essa falha da geo no domínio real.

Resultado esperado:
- a gente vai parar de “achar” e passar a ver exatamente onde quebra
- se for publicação antiga, vai ficar óbvio
- se for CORS/timeout/fetch, vai ficar óbvio
- se estiver tudo certo, `window.cfGeo` aparece no domínio real
