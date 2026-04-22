

## Plano: ativar checkouts em domínio próprio dos produtores (Paola e demais)

### Onde estamos
- Origem de fallback no Cloudflare: `worker-fallback.panttera.com.br` ✅ Ativo
- Infra de Custom Hostnames pronta no Cloudflare for SaaS ✅
- App já sabe usar o domínio do dono do produto pra checkout e Meta CAPI ✅

Falta só: **cadastrar os domínios dos produtores e apontar o DNS deles**.

### Estratégia: subdomínio dedicado, nunca raiz

Para cada produtor, usar **um subdomínio só pro checkout**, ex:

```text
pay.paolasemfiltro.com
pay.luanypersico.com
pay.paolasinfitro.com
pay.dominiodequalqueroutroprodutor.com
```

Por que subdomínio e não raiz:
- a raiz (ex: `paolasemfiltro.com`) hospeda landing pages tipo `/10habitos`, `/detox`
- se a raiz vier pro Panttera, essas landings quebram (404)
- subdomínio `pay.` isola o checkout e não toca em nada do site atual

### Passo a passo por produtor (ex: Paola)

**Passo 1 — Cadastrar o hostname no Cloudflare (Panttera)**
- Painel Cloudflare > Custom Hostnames
- Botão **Adicionar nome de host personalizado**
- Digitar exatamente: `pay.paolasemfiltro.com`
- Confirmar
- Repetir para `pay.luanypersico.com` e `pay.paolasinfitro.com`

**Passo 2 — Cadastrar no painel Panttera**
- `/admin/domains`
- Adicionar o mesmo hostname (`pay.paolasemfiltro.com`) vinculado ao usuário da Paola
- Status inicial: pendente

**Passo 3 — Configurar o DNS no provedor da Paola** (Registro.br, GoDaddy, etc)

Para cada domínio, criar **1 CNAME**:

```text
Tipo:   CNAME
Nome:   pay
Valor:  fallback.panttera.com.br
Proxy:  DNS only (nuvem cinza)
TTL:    Auto
```

**Passo 4 — Validar**
- Aguardar 5–30 min de propagação
- No `/admin/domains`, clicar no botão de refresh
- Status muda pra `active` → checkout dela já passa a usar `pay.paolasemfiltro.com`

### Como qualquer produtor novo faz isso sozinho

Mesmo fluxo, 3 perguntas:
1. Qual seu domínio? → ex: `meudominio.com`
2. Qual subdomínio quer pro checkout? → sugerir `pay` (padrão)
3. Mostrar o CNAME pra ele copiar e colar no DNS dele

Tudo isso já é suportado pelo `/admin/domains` que existe. Só precisa garantir que o fluxo apresentado pra ele seja:
- pedir subdomínio (não raiz)
- mostrar o CNAME pra `fallback.panttera.com.br`
- mostrar status (pendente / ativo)

### O que muda no código (mínimo)

Nenhuma mudança obrigatória de funcionalidade — a infra já existe. Mas para deixar o fluxo do produtor leigo à prova de erro, sugiro 2 melhorias pequenas:

1. **No `/admin/domains`**, ao adicionar domínio:
   - Bloquear cadastro de domínio raiz (sem subdomínio) com aviso claro: "Use um subdomínio dedicado, ex: pay.seudominio.com"
   - Mostrar instrução do CNAME pronto pra copiar (Tipo, Nome, Valor, Proxy)

2. **Tooltip/explicação** mostrando exatamente o que o produtor precisa colar no DNS dele.

### O que NÃO muda
- Landing pages dos produtores → intactas
- `app.panttera.com.br` continua sendo o domínio canônico de auth
- Meta CAPI já usa o domínio ativo do dono do produto (`facebook-capi/index.ts` já faz isso)
- Nenhum produtor existente precisa refazer nada

### Próximo passo concreto
1. Você cadastra `pay.paolasemfiltro.com`, `pay.luanypersico.com`, `pay.paolasinfitro.com` na Cloudflare (eu te guio campo por campo)
2. Você (ou ela) coloca o CNAME no DNS de cada domínio
3. Validar status `active` no painel
4. Depois disso, melhorar o fluxo no `/admin/domains` pra qualquer produtor novo se autogerenciar

