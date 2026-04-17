
Problema achado com clareza:

O erro aparece porque o banco está bloqueando o valor `stripe`.

Hoje a tela já oferece Stripe, o formulário já trata Stripe, e as funções de pagamento também procuram `provider = 'stripe'`. Mas a tabela `payment_gateways` foi criada com uma trava antiga que só aceita:

```text
'asaas', 'pagarme'
```

Então quando você clica em salvar, acontece isso:

```text
UI manda provider = 'stripe'
→ banco recebe
→ constraint payment_gateways_provider_check rejeita
→ aparece: violates check constraint
```

## Onde está o problema

- `supabase/migrations/20260310024744_a7670909-52ef-446c-bf5f-750077a42e50.sql`
  - criou `payment_gateways`
  - `provider text NOT NULL CHECK (provider IN ('asaas', 'pagarme'))`

## Onde o sistema já espera Stripe

- `src/pages/admin/GatewayManagement.tsx`
- `src/pages/admin/Gateways.tsx`
- `src/components/admin/GatewayFormDialog.tsx`
- `supabase/functions/validate-gateway/index.ts`
- `supabase/functions/get-stripe-publishable-key/index.ts`
- `supabase/functions/create-stripe-payment/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

Ou seja: o front e as funções já estão prontos para Stripe, mas o banco ficou para trás.

## Plano para corrigir

### 1. Ajustar o banco
Criar uma migration para trocar a constraint do campo `provider` e passar a aceitar:

```text
'asaas', 'pagarme', 'mercadopago', 'stripe'
```

Isso é a correção principal.

### 2. Conferir compatibilidade
Depois da migration, revisar se:
- salvar Stripe cria normalmente
- editar Stripe continua funcionando
- lookup do gateway Stripe por `provider = 'stripe'` continua batendo certo nas funções

### 3. Melhorar a mensagem do formulário
Adicionar tratamento no `GatewayFormDialog.tsx` para mostrar uma mensagem mais humana se o banco rejeitar o provider, em vez de só exibir o erro cru do Postgres.

## Resultado esperado depois
Depois dessa correção:
- Stripe vai salvar normalmente
- Mercado Pago também fica compatível com o schema
- o checkout Stripe poderá usar o gateway salvo
- o webhook Stripe continuará conseguindo localizar a configuração

## Detalhe técnico
Isso não é erro de chave Stripe nem erro de permissão.
É erro de schema do banco:

```text
payment_gateways.provider
```

está com uma regra antiga e não aceita `stripe`.

A correção certa é no banco, não no formulário.
