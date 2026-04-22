
## Objetivo
Parar o ciclo de instruções contraditórias e deixar o fluxo de domínios customizados com uma única verdade: o painel, a documentação e os diagnósticos devem apontar exatamente para a mesma arquitetura de fallback.

## Problema real identificado
Hoje existem 2 camadas misturadas:
1. **Alias público**: `fallback.panttera.com.br`
2. **Origem interna do Worker / fallback origin**: `worker-fallback.panttera.com.br`

O app já orienta o produtor a usar `fallback.panttera.com.br` no CNAME do checkout, mas a operação manual acabou tentando mexer em `worker-fallback.panttera.com.br`, que está preso como **Fallback Origin** na Cloudflare. Por isso apareceu o erro vermelho de “não pode deletar este registro”.

Em resumo: o sistema tem a arquitetura certa, mas a explicação operacional ficou confusa e levou para o lugar errado.

## O que vou ajustar
### 1) Corrigir a orientação funcional do fluxo de domínios
Revisar o conteúdo de:
- `src/pages/admin/Domains.tsx`
- `docs/cloudflare-worker-fallback.md`
- `supabase/functions/domain-health-check/index.ts`

Para separar claramente:
- **o que o produtor configura no DNS**
- **o que só a infraestrutura da Panttera configura**

### 2) Tornar a UI impossível de interpretar errado
No painel de domínios, vou deixar explícito em linguagem simples:
- O produtor deve criar **somente**:
  - Tipo: `CNAME`
  - Nome: subdomínio dele (`checkout`, `pay`, etc.)
  - Valor: `fallback.panttera.com.br`
  - Proxy: `DNS only`
- O produtor **não deve mexer** em:
  - `worker-fallback.panttera.com.br`

Também vou adicionar um aviso visual tipo:
- “Não altere nem exclua `worker-fallback.panttera.com.br`: ele é interno da infraestrutura.”

### 3) Melhorar o diagnóstico automático
A função `domain-health-check` hoje já detecta vários cenários, mas a mensagem pode ser mais precisa.
Vou ajustar o texto de erro para diferenciar:
- DNS do produtor apontando errado
- fallback origin interno quebrado
- Worker aceitando URL direta mas rejeitando `Host` customizado
- erro operacional de Cloudflare por tentar editar/apagar o hostname interno

Assim, em vez de empurrar o usuário para tentativa e erro, o sistema vai dizer exatamente:
- “Seu DNS está certo, o problema é interno”
ou
- “Seu CNAME ainda não aponta para `fallback.panttera.com.br`”

### 4) Padronizar a documentação técnica
Vou alinhar `docs/cloudflare-worker-fallback.md` para bater 100% com o comportamento esperado:
- `checkout.cliente.com` → CNAME para `fallback.panttera.com.br`
- `fallback.panttera.com.br` → alias público
- `worker-fallback.panttera.com.br` → origem interna do Worker / fallback origin
- nada de instrução que leve a deletar o registro interno

### 5) Validar o fluxo final
Depois da implementação, a validação ficará assim:
1. produtor cria CNAME do checkout apontando para `fallback.panttera.com.br`
2. adiciona o domínio no painel
3. painel verifica status do hostname
4. botão “Testar link” mostra diagnóstico correto
5. link final abre com 200

## Resultado esperado para você
Depois disso, a resposta correta deixa de mudar a cada mensagem. A regra passa a ser uma só:

- **Para o cliente/produtor:** mexer apenas no CNAME do subdomínio dele apontando para `fallback.panttera.com.br`
- **Para a infraestrutura interna:** `worker-fallback.panttera.com.br` fica intocado

## Detalhes técnicos
### Estado desejado da arquitetura
```text
checkout.paolasemfiltro.com   -> CNAME -> fallback.panttera.com.br
fallback.panttera.com.br      -> alias público que entrega no Worker
worker-fallback.panttera.com.br -> fallback origin interno do Worker
Worker                        -> reescreve Host para app.panttera.com.br
app.panttera.com.br           -> origem canônica da SPA
```

### Arquivos que serão ajustados
- `src/pages/admin/Domains.tsx`
- `docs/cloudflare-worker-fallback.md`
- `supabase/functions/domain-health-check/index.ts`

## Efeito prático
Isso não muda pagamento, checkout ou banco. É uma correção de:
- instrução operacional
- UX do painel
- mensagens de diagnóstico
- documentação interna

Assim a plataforma para de “andar em círculo” e passa a conduzir o usuário para a ação certa de primeira.
