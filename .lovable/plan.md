

Vou olhar o `GatewayFormDialog.tsx` pra confirmar exatamente o que está renderizando hoje pra Stripe.
<lov-tool-use id="toolu_vrtx_01NJ77NfNAu52PJLDpuWtBEx" name="code--search_files" integration-id="code" data="{\"query\": \"stripe\", \"include_patterns\": \"src/components/admin/GatewayFormDialog.tsx\", \"case_sensitive\": false}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018s9ZLh2fsF5xxkAUfQqyi7" name="code--search_files" integration-id="code" data="{\"query\": \"stripe|publishable|api_key|secret_key\", \"include_patterns\": \"src/components/admin/GatewayFormDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_019yok18kwxGYbVYXa1QAWuM" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/GatewayFormDialog.tsx\", \"lines\": \"50-220\"}">
</lov-tool-use>
Tenho contexto suficiente. O usuário confirmou: o form só tem 1 campo (Secret Key) pra Stripe. Preciso adicionar o campo Publishable Key.

<lov-plan>

## Adicionar campo "Publishable Key" no cadastro do gateway Stripe

### Diagnóstico
O `GatewayFormDialog.tsx` (linhas 186-208) tem **um único campo "API Key"** que serve pra todos os gateways. Pra Stripe, ele coleta só a `sk_…` (Secret Key) e salva em `config.api_key`. Falta a `pk_…` (Publishable Key) que o frontend Stripe Elements precisa pra renderizar o cartão.

### O que vou fazer (3 mudanças cirúrgicas)

**1. `GatewayFormDialog.tsx` — adicionar campo condicional pra Stripe**
- Logo abaixo do campo "API Key" (Secret Key), quando `form.provider === "stripe"`, renderizar:
  - Novo input **"Publishable Key (pk_…) *"** salvando em `config.publishable_key`
  - Helper text: "Encontre em: Stripe Dashboard → Developers → API Keys → Publishable key"
  - Validação: deve começar com `pk_test_` ou `pk_live_`
- Atualizar título do campo existente pra **"Secret Key (sk_…) *"** quando provider for Stripe (mais claro)
- Validação no `handleSave`: se `provider === "stripe"`, exigir `config.publishable_key` começando com `pk_`
- Validação cruzada: alertar se usuário colar `pk_` no campo Secret Key ou `sk_` no campo Publishable

**2. `validate-gateway` (edge) — opcional, leve**
- Aceitar campo extra `publishable_key` no body (só pra Stripe)
- Verificar que começa com `pk_` e que ambiente bate (`pk_test_` ↔ sandbox, `pk_live_` ↔ produção)
- Se não bater, retorna erro claro

**3. `StripeCardForm.tsx` — mensagem de erro mais clara**
- Quando `get-stripe-publishable-key` retorna 404 (chave não cadastrada), mostrar:
  > "Stripe não está configurado. O produtor precisa cadastrar a Publishable Key em Admin → Gateways → Stripe."
- Adicionar `console.error` detalhado pra debug

### Resultado
Depois de aplicar você vai em **Admin → Gateways → editar Stripe** (ou criar novo) e verá:
- **Secret Key (sk_…)** ← já existia
- **Publishable Key (pk_…)** ← novo

Cola as duas, salva, recarrega o checkout USD → o campo de cartão Stripe Elements aparece.

### Risco
Zero. Só adiciona um input + validação. Nada é removido.

