
O usuário confirmou que o problema do seletor de moeda era cache. Agora quer validação simples: "tem algum erro? eu ou qualquer produtor com Stripe pode vender em USD?"

Não é tarefa de implementação — é pedido de auditoria/veredito. Não preciso de plano de mudança. Vou responder direto com diagnóstico técnico baseado no que já investiguei nos turnos anteriores:

1. Schema USD: OK (currency aceita BRL/USD)
2. ProductEdit.tsx: chama sync-product-stripe ao salvar produto USD
3. sync-product-stripe: exige gateway Stripe ativo do produtor (multi-tenant)
4. get-stripe-publishable-key: busca pk do produtor ou fallback super_admin
5. StripeCardForm: carrega Stripe.js com pk do produtor
6. Checkout USD: usa create-stripe-payment com chave do produtor

Pré-requisitos para qualquer produtor vender USD:
- Gateway stripe ativo em payment_gateways (active=true, provider='stripe')
- config.api_key (sk_live_... ou sk_test_...)
- config.publishable_key (pk_live_... ou pk_test_...)
- Produto com currency='USD' salvo (gera stripe_product_id e stripe_price_id automaticamente)
- KYC aprovado (verification)

Vou dar veredito direto sem propor mudança. Resposta curta em "baby mode".
