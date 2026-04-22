

# Resposta rápida + plano de validação

## Sim, funciona pra qualquer produtor — com 2 ressalvas

Depois que a Etapa 3 do plano anterior estiver feita (Fallback Origin apontando pro Worker), **qualquer produtor** que cadastrar `checkout.dominio-dele.com` vai funcionar automaticamente, desde que:

**1. O hostname esteja cadastrado no Cloudflare for SaaS**
- Feito automaticamente pela edge function `cloudflare-add-hostname` quando o produtor adiciona o domínio em `/admin/domains`
- Cloudflare emite SSL grátis (Let's Encrypt) em 5-30 min
- Status precisa ficar **Active**

**2. O produtor configure o DNS no provedor dele (Registro.br, GoDaddy, etc)**
- Tipo: `CNAME`
- Nome: `checkout`
- Valor: `customers.pantera-saas.workers.dev` (ou o destino que a Cloudflare informar)
- Proxy: desligado

A partir daí, o fluxo é 100% automático:

```text
Visitante → checkout.produtor.com
         ↓ (DNS CNAME)
    Cloudflare for SaaS (SSL)
         ↓ (Host customizado)
    Worker panttera-checkout-fallback
         ↓ (reescreve Host → app.panttera.com.br)
    App PanteraPay serve o checkout certo
```

## Sobre os eventos do Meta (CAPI) — sim, funciona perfeitamente

Olhei o código de `supabase/functions/facebook-capi/index.ts` e ele já está preparado pra isso:

- Resolve o **domínio ativo do produtor** consultando `custom_domains` (linhas que pegam `ownerDomain`)
- Monta o `event_source_url` usando esse domínio: `https://checkout.produtor.com/checkout/{productId}` ou `/obrigado/{orderId}` pra Purchase
- Pixel + CAPI deduplicam pelo `event_id`
- Hashes (em, ph, fn, ln, ct, st, zp, country, external_id) já no formato KwaiPay premium

**Resultado:** EMQ Score ~8+ mantido, atribuição correta no Gerenciador de Anúncios, sem mistura entre produtores.

## Plano de validação pós-Etapa 3

Depois que você fizer a troca da Fallback Origin (plano anterior), eu valido tudo isso pra você:

**Validação 1 — Worker servindo hostname existente**
- Testar `https://checkout.paolasemfiltro.com` em aba anônima
- Conferir que carrega o checkout da Paola (não o app principal)

**Validação 2 — Hostnames pendentes destravam**
- Verificar `checkout.luanypersico.com` e `checkout.paolasinfitro.com`
- Devem sair de "Pendente" pra "Ativo" sozinhos em até 30 min

**Validação 3 — Meta CAPI usando domínio certo**
- Disparar um PageView de teste em `checkout.paolasemfiltro.com`
- Ler logs da edge function `facebook-capi` pra confirmar `event_source_url` = `https://checkout.paolasemfiltro.com/checkout/...`
- Ler logs do Meta Events Manager pra confirmar recebimento

**Validação 4 — Novo produtor (fluxo completo)**
- Te oriento como cadastrar 1 domínio novo de teste
- Acompanho do CNAME até o Active
- Disparamos 1 evento de teste pra confirmar EMQ

## O que eu preciso de você

Aprovar a continuação. Quando aprovar, eu volto pro modo de execução e:
1. Te guio nas Etapas 1-5 do plano anterior (criar Worker hostname, trocar Fallback Origin, limpar DNS)
2. Rodo as 4 validações acima e te entrego os prints/logs de cada uma

