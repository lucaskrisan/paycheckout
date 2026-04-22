

## Plano: corrigir Origem de Fallback pro Worker

### Problema
A Origem de Fallback ficou com `fallback.panttera.com.br` (IP direto do Lovable, sem reescrita de Host) em vez de `worker-fallback.panttera.com.br` (Worker que reescreve Host). Resultado: checkouts customizados não funcionam de verdade — vão direto pro Lovable que não reconhece o hostname.

### Solução
Trocar a Origem de Fallback pro hostname correto do Worker.

### Etapas

**1. Validar antes (eu faço via terminal)**
- Confirmar que `worker-fallback.panttera.com.br` continua respondendo HTTP 200
- Confirmar que a reescrita de Host ainda funciona (mesmo SHA256 do `app.panttera.com.br`)

**2. Te guio na troca da Origem de Fallback**
- Ir em **SSL/TLS → Nomes de host personalizados**
- Editar **Origem de fallback**
- Apagar `fallback.panttera.com.br`
- Digitar **exatamente**: `worker-fallback.panttera.com.br`
- Atenção: o campo aceita autocompletar pra `fallback` — tem que digitar o nome inteiro e conferir antes de salvar
- Print da tela de edição **antes** de clicar Atualizar

**3. Validação final (eu faço via terminal)**
- Aguardar 1-2 min de propagação
- Testar `curl https://checkout.paolasemfiltro.com` → deve retornar HTML do checkout PanteraPay
- Conferir que os hostnames pendentes (`luanypersico`, `paolasinfitro`) destravaram
- Te entregar prints/logs de cada teste

**4. Limpeza opcional (depois que tudo estiver verde)**
- Avaliar se removemos o registro `fallback` antigo (A → 185.158.133.1) da DNS, já que ninguém mais usa
- Decisão fica pra depois — não mexemos agora pra não introduzir variável

### O que NÃO muda
- Registro `app` (CNAME → paycheckout.pages.dev) — intacto, continua servindo `app.panttera.com.br`
- Registro `ck` (A → 185.158.133.1) — intacto
- Worker `panttera-checkout-fallback` e sua rota — já configurados corretamente
- Landing pages dos produtores (`paolasemfiltro.com/10habitos` etc) — intactas

### Risco
Baixo. Durante 1-2 min de propagação, `checkout.paolasemfiltro.com` pode oscilar. Como hoje ele já não tá servindo o checkout certo (tá indo direto pro Lovable sem reescrita), na prática estamos saindo de "quebrado" pra "funcionando" — não há regressão possível.

