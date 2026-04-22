

## Plano: migrar domínios raiz para subdomínios `pay.*`

### Problema
Os 3 domínios foram cadastrados na raiz (`paolasemfiltro.com` etc), mas todos têm landing pages ativas. Se ficarem ativos assim, o tráfego das landings é roteado para a Panttera e quebra (`/10habitos`, `/detox`, etc → 404).

### Solução
Substituir os 3 cadastros raiz por subdomínios dedicados `pay.*`, isolando o checkout do resto do site.

```text
ANTES (quebra landings)              DEPOIS (isolado, seguro)
──────────────────────────           ─────────────────────────
paolasemfiltro.com         ❌  →    pay.paolasemfiltro.com   ✅
luanypersico.com           ❌  →    pay.luanypersico.com     ✅
paolasinfitro.com          ❌  →    pay.paolasinfitro.com    ✅

Landings continuam:
paolasemfiltro.com/10habitos   (intacto)
paolasemfiltro.com/detox       (intacto)
```

### Etapas

**1. Limpar registros antigos (raiz)**
- Remover os 3 hostnames raiz do Cloudflare for SaaS (chamada `cloudflare-remove-hostname`)
- Deletar os 3 registros correspondentes da tabela `custom_domains`

**2. Cadastrar os 3 novos subdomínios**
- Para cada um (`pay.paolasemfiltro.com`, `pay.luanypersico.com`, `pay.paolasinfitro.com`):
  - Criar custom hostname na Cloudflare (`cloudflare-add-hostname`)
  - Inserir em `custom_domains` vinculado ao seu `user_id` de admin
  - Status inicial: `pending_validation`

**3. Te entregar a configuração de DNS**
Você (ou quem cuida do DNS) precisa adicionar **1 registro CNAME por domínio** no provedor onde os domínios estão (Registro.br, GoDaddy, Cloudflare, etc):

```text
Tipo:   CNAME
Nome:   pay
Valor:  customers.pantera-saas.workers.dev
Proxy:  desligado (DNS only)
TTL:    Auto / 3600
```

(o destino exato vem da Cloudflare — vou te passar os 3 valores certinhos depois de criar)

**4. Validar**
- Após você apontar o DNS, abrir `/admin/domains` e clicar no 🔄 de cada domínio
- Cloudflare valida (5–30 min) → status muda pra `active`
- A partir daí, links de checkout e Meta CAPI passam a usar `pay.seudominio.com` automaticamente

### O que NÃO muda
- Suas landing pages (`paolasemfiltro.com/10habitos` etc) — totalmente intactas
- A lógica de seleção do domínio no app (já pega o ativo mais recente)
- Edge functions de Meta CAPI (já usam o domínio do dono do produto)

### Detalhes técnicos
- Operações na tabela `custom_domains` via insert tool (DELETE + INSERT)
- Chamadas às edge functions `cloudflare-remove-hostname` e `cloudflare-add-hostname` já existentes
- Não há mudança de código — é só operação de dados + Cloudflare

