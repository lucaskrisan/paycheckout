# Cloudflare Worker — `worker-fallback` (origem do fallback de domínios customizados)

> Este Worker é o **coração** do sistema de domínios customizados de checkout
> da Panttera. Ele recebe qualquer hostname customizado roteado pelo
> Cloudflare for SaaS via `fallback.panttera.com.br` e encaminha o request
> para a origem canônica (`https://app.panttera.com.br`), reescrevendo o
> `Host` para que o servidor de origem aceite a requisição.
>
> **Sem este Worker, o checkout do produtor retorna 522 / 403.**

---

## 1. Arquitetura

```
[ navegador do cliente ]
       │
       ▼
checkout.paolasemfiltro.com           ← domínio do produtor (CNAME → fallback.panttera.com.br)
       │
       ▼
Cloudflare for SaaS (Custom Hostname)
       │
       ▼
fallback.panttera.com.br              ← hostname interno do Worker
       │
       ▼
Cloudflare Worker  worker-fallback    ← reescreve Host
       │
       ▼
https://app.panttera.com.br           ← origem canônica da SPA
```

---

## 2. Onde colocar este código

1. Acesse `Cloudflare Dashboard → Workers & Pages → Create → Worker`.
2. Nome sugerido: `worker-fallback`.
3. Cole o conteúdo da seção [3. Código do Worker](#3-código-do-worker).
4. Em `Triggers → Custom Domains` adicione: `worker-fallback.panttera.com.br`.
5. No `SSL/TLS → Custom Hostnames → Fallback Origin` da zona `panttera.com.br`,
   aponte para `worker-fallback.panttera.com.br`.
6. Garanta que `fallback.panttera.com.br` (o CNAME público) é apenas um alias
   que entrega o tráfego no mesmo Worker (proxy 🟠 ligado).

---

## 3. Código do Worker

```javascript
// ────────────────────────────────────────────────────────────
// worker-fallback
// Encaminha qualquer hostname customizado para app.panttera.com.br
// preservando path, query, método, body e headers úteis.
// ────────────────────────────────────────────────────────────

const ORIGIN_HOST = "app.panttera.com.br";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const originalHost = incomingUrl.hostname;

    // Constrói a URL final apontando para a origem canônica
    const upstreamUrl = new URL(incomingUrl.toString());
    upstreamUrl.hostname = ORIGIN_HOST;
    upstreamUrl.port = "";
    upstreamUrl.protocol = "https:";

    // Clona headers e força o Host correto
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("Host", ORIGIN_HOST);
    upstreamHeaders.set("x-forwarded-host", originalHost);
    upstreamHeaders.set("x-original-host", originalHost);
    upstreamHeaders.set("x-forwarded-proto", "https");

    // Remove headers que podem confundir o upstream
    upstreamHeaders.delete("cf-connecting-ip");
    upstreamHeaders.delete("cf-ipcountry");
    upstreamHeaders.delete("cf-ray");
    upstreamHeaders.delete("cf-visitor");

    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    let response;
    try {
      response = await fetch(upstreamRequest);
    } catch (err) {
      return new Response(
        `Fallback origin error: ${err && err.message ? err.message : String(err)}`,
        { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }

    // Reescreve possíveis Location absolutos pra manter o usuário no domínio do produtor
    const newHeaders = new Headers(response.headers);
    const location = newHeaders.get("location");
    if (location) {
      try {
        const locUrl = new URL(location, upstreamUrl);
        if (locUrl.hostname === ORIGIN_HOST) {
          locUrl.hostname = originalHost;
          newHeaders.set("location", locUrl.toString());
        }
      } catch {
        /* ignore */
      }
    }

    // Garante CORS aberto para os assets da SPA
    newHeaders.set("x-served-by", "panttera-fallback-worker");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
```

---

## 4. Validação rápida (curl)

Após colocar o Worker em produção, valide assim:

```bash
# 1) A origem canônica está saudável
curl -I https://app.panttera.com.br/ | head -n 1
# esperado: HTTP/2 200

# 2) O Worker direto responde sem o Host customizado
curl -I https://worker-fallback.panttera.com.br/ | head -n 1
# esperado: HTTP/2 200

# 3) O Worker aceita o Host customizado (simulando o cenário real)
curl -I https://worker-fallback.panttera.com.br/ \
  -H "Host: checkout.paolasemfiltro.com" | head -n 1
# esperado: HTTP/2 200

# 4) O domínio do produtor responde a SPA
curl -I https://checkout.paolasemfiltro.com/checkout/qualquer-id | head -n 1
# esperado: HTTP/2 200
```

Se o passo (3) retornar 403, o Worker **não está reescrevendo o Host** —
provavelmente foi colocado um redirect ou um Pages no lugar do Worker real.

---

## 5. Rotas que precisam funcionar via fallback

- `GET /checkout/:productId`
- `GET /checkout/:productId?config=...`
- `GET /checkout/sucesso`
- `GET /recibo/:orderId`
- Assets da SPA (`/assets/*.js`, `/assets/*.css`, fontes, imagens)

Tudo isso é só path pass-through — o Worker não precisa saber de rotas.
A SPA da Panttera resolve sozinha quando recebe o request com `Host: app.panttera.com.br`.

---

## 6. O que NÃO deve passar pelo fallback

- Login / signup → permanecem em `https://app.panttera.com.br`
  (o front já força isso via `getAuthOrigin()` em `src/lib/getAuthOrigin.ts`).
- Painel admin → `https://app.panttera.com.br/admin/*`.
- Webhooks → `https://app.panttera.com.br/...` ou Edge Functions diretas.

O Worker tecnicamente proxia tudo, mas a aplicação só **gera links** de
checkout no domínio do produtor — então nada além disso vaza pra ele.
