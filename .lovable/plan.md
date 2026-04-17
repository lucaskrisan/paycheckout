

## Aplicar Stripe embutido (Payment Intents + Elements) usando o que já existe

Confirmado: vou usar a infra que já temos (`payment_gateways` BYOK, `process-order-paid.ts`, `stripe-webhook` com HMAC) e só trocar o fluxo hospedado por embutido.

## O que vou fazer

### 1. Instalar dependências
- `@stripe/stripe-js`
- `@stripe/react-stripe-js`

### 2. Nova edge: `get-stripe-publishable-key`
- Recebe `product_id`
- Lê `payment_gateways.config.publishable_key` do dono do produto (RLS-safe via service role + filtro por `user_id` do produto)
- Retorna **só** `pk_…` (nunca `sk_`)

### 3. Reescrever `create-stripe-payment` (modo Payment Intent)
- Substitui `stripe.checkout.sessions.create` por `stripe.paymentIntents.create`:
  - `amount`, `currency: 'usd'`, `customer` (get-or-create por email)
  - `payment_method` vindo do frontend, `confirm: true`
  - `automatic_payment_methods: { enabled: true, allow_redirects: 'never' }`
  - `setup_future_usage: 'off_session'` (pra 1-clique upsell USD)
  - `metadata: { product_id, user_id, customer_id, customer_cpf, order_id }`
- Cria `orders` com `external_id = payment_intent.id`, status `pending`
- Retorna `{ payment_intent_id, client_secret, order_id, status, requires_action }`

### 4. Novo componente `src/components/checkout/StripeCardForm.tsx`
- Wrapper `<Elements stripe={loadStripe(pk)}>` (lazy via `get-stripe-publishable-key`)
- `<CardElement>` estilizado no padrão Amazon Teal (matching `CreditCardForm`)
- Ao submit: `stripe.createPaymentMethod({ type:'card', card, billing_details })` → manda `payment_method_id` pro `create-stripe-payment`
- Se backend devolve `requires_action` → `stripe.confirmCardPayment(client_secret)` (3DS automático)
- Em sucesso → redireciona pra `/checkout/sucesso` (mesmo fluxo BRL)

### 5. Ajustar `Checkout.tsx`
- Condicional: `isUSD ? <StripeCardForm /> : <CreditCardForm />`
- Remove o `window.location.href = data.url` (não vai mais sair do site)

### 6. Webhook (`stripe-webhook`)
- Já trata `payment_intent.succeeded` ✅
- Mantém `checkout.session.completed` pra retrocompat (se algum produtor antigo)
- Nada muda em HMAC/dedup/`process-order-paid.ts`

## Resultado

- Cliente nunca sai de `checkout.panterapay.com.br`
- 3DS automático via `confirmCardPayment`
- 1-clique upsell USD funciona (graças ao `setup_future_usage: 'off_session'`)
- Tracking Meta CAPI completo (Purchase dispara no nosso lado, formato KwaiPay já implementado)
- Mantém HMAC signature + dedup que já temos

## Pré-requisito pra testar

Você precisa ter num produto USD de teste:
- `pk_test_…` cadastrado em `payment_gateways.config.publishable_key`
- `sk_test_…` cadastrado em `payment_gateways.config.secret_key`

Se ainda não tiver `publishable_key` salvo (só tem `secret_key`), eu adapto o cadastro do gateway pra aceitar os dois campos. Me avisa se precisa.

## Risco

Médio-baixo. Tudo aditivo, fluxo BRL não é tocado. Se algo quebrar, rollback é trivial (volta pro `checkout.sessions.create`).

