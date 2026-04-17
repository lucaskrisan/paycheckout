
Trocar `hidePostalCode: false` por `hidePostalCode: true` em `src/components/checkout/StripeCardForm.tsx` (linha 56).

Resultado: o campo de ZIP/postal code some do formulário de cartão Stripe no checkout USD. Fica só Número do cartão · Validade · CVV.

Risco: zero. Stripe não exige ZIP para autorizar cartão internacional — `billing_details` (name + email) já é suficiente. Não afeta BRL nem 3DS nem Radar.
