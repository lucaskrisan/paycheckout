

Beleza, então vamos limpar. Você só usa `app.panttera.com.br`.

## O que muda

**Worker (você cola no Cloudflare):**
```js
const allowed = ['https://app.panttera.com.br'];
```
Só isso. Resto do Worker fica igual.

## Passo a passo pra você

1. Cloudflare → Workers & Pages → seu Worker de geo
2. Clica em **Edit Code**
3. Acha a linha do `const allowed = [...]`
4. Substitui por: `const allowed = ['https://app.panttera.com.br'];`
5. Clica **Deploy**

## No código do app

Nada muda. O `cfGeo.ts` não tem essa lista — ela só existe no Worker.

## Sobre o `window.cfGeo` ainda undefined

Esse é outro problema (provavelmente Service Worker antigo em cache). Depois que você atualizar o Worker, faz:
1. DevTools → Application → Service Workers → **Unregister**
2. Application → Storage → **Clear site data**
3. **Ctrl+Shift+R**
4. Console: `window.cfGeo`

Se ainda não aparecer, me manda print do Console filtrando por `[cfGeo]` que eu investigo.

