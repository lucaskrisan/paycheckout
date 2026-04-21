

## Recibo do Cliente padrão CartPanda + Logo Panttera + Imagem do Produto + Prova de E-mail

### Onde fica
A tela continua sendo `/recibo/:orderId` — o link público que o cliente recebe no e-mail de confirmação. **Nada muda na rota**, só o visual e a estrutura do conteúdo.

### Layout final

```text
┌─────────────────────────────────────────┐
│            🐆 Logo Panttera              │
│                                          │
│         Pedido #ABC12345                 │
│        Obrigado, V******a                │
│                                          │
│              ✅ (verde)                   │
│      Seu pedido foi Confirmado           │
│  Aparecerá na fatura como PANTTERA       │
│                                          │
│       [ Gerenciar meu pedido ]           │
├─────────────────────────────────────────┤
│ Detalhes do pedido                       │
│ ┌──────┐                                 │
│ │ IMG  │  Nome do Produto                │
│ │ 64px │  1× R$ 197,00                   │
│ └──────┘  [⬇ Acessar produto]            │
│                                          │
│ ✉️ Enviamos seu acesso para               │
│ ver*****@gmail.com em 21/04 às 14:17.    │
│ ✓ Entregue · Verifique a caixa de        │
│ entrada ou pasta de spam.                │
├─────────────────────────────────────────┤
│ Subtotal                      R$ 197,00  │
│ Total                  4× R$ 54,75       │
├─────────────────────────────────────────┤
│ Informações do cliente                   │
│ E-mail: ver*****@gmail.com               │
│ Pagamento: 💳 Visa final 3418            │
├─────────────────────────────────────────┤
│ ▸ Detalhes técnicos e selo de            │
│   autenticidade  (colapsado)             │
├─────────────────────────────────────────┤
│ Documento eletrônico válido —            │
│ MP 2.200-2/2001 · Recibo nº XXXX         │
└─────────────────────────────────────────┘
```

### Mudanças no `src/pages/Receipt.tsx` (único arquivo frontend)

**1. Header com logo Panttera**
- Importar `pantera-mascot.png` de `@/assets/`
- Logo centralizado 64×64px no topo
- "Pedido #XXXX" pequeno cinza
- "Obrigado, V******a" grande em bold (nome mascarado por LGPD)
- Ícone verde ✅ + "Seu pedido foi Confirmado" como heading
- Subtexto: "Aparecerá na fatura como PANTTERA"
- Botão azul "Gerenciar meu pedido" → `/minha-conta`

**2. Card do produto COM IMAGEM (estilo CartPanda)**
- Layout horizontal: thumbnail 64×64px à esquerda + info à direita
- Thumbnail com `rounded-lg` + `object-cover` + borda sutil
- Fallback: se não tiver imagem, mostrar ícone 📦 em placeholder cinza
- Nome do produto em bold + linha "1× R$ 197,00"
- Botão "Acessar produto" abaixo (quando houver área de membros)

**3. Prova de envio do e-mail integrada (texto humano)**
- Logo abaixo do card do produto, no mesmo bloco:
  > "✉️ Enviamos seu acesso para **ver\*\*\*\*@gmail.com** em 21/04/2026 às 14:17. ✓ Entregue. Se não encontrar, verifique a pasta de spam ou promoções."
- Status visual sutil: ✓ Entregue (verde) / ✓ Aberto (azul) quando o Resend confirmar

**4. Resumo financeiro tabular**
- Subtotal, Envio (se houver), Total
- Mostrar parcelamento quando aplicável ("4× R$ 54,75")
- **Remover** "Taxa da plataforma" e "Líquido ao vendedor"

**5. Informações do cliente (mínimo)**
- E-mail mascarado
- Método de pagamento (bandeira + final do cartão, ou "PIX")
- **Remover** cidade/estado/CEP (redundante)

**6. Detalhes técnicos colapsáveis** (`<details>` HTML nativo)
- Label clicável: "▸ Ver detalhes técnicos e selo de autenticidade"
- Conteúdo escondido por padrão:
  - Hash SHA-256 de autenticidade
  - IP do pagador, dispositivo
  - Ref. gateway, ID interno do pedido
  - CPF/CNPJ do vendedor
  - IDs Resend dos e-mails enviados (auditoria)
- CSS `@media print` força `details[open]` ao imprimir/salvar PDF

**7. Footer reduzido a 1 linha**
- "Panttera Tecnologia — Documento eletrônico válido conforme MP 2.200-2/2001 · Recibo nº XXXX"

### Mudança mínima no backend `supabase/functions/get-receipt/index.ts`

- Adicionar `image_url` no SELECT do produto (atualmente já busca `name` e `price` — falta a imagem)
- Retornar `product.image_url` no payload da response
- **Nada mais muda no edge function** — `emails_sent` e `authenticity_hash` já existem

### O que continua igual

- Hash SHA-256 continua gerado e exibido (apenas dentro do colapsável)
- E-mail e nome mascarados (LGPD)
- Suporte BRL/USD
- Botão "Baixar PDF" (imprimir como PDF)
- Rota `/recibo/:orderId` inalterada

### Arquivos editados

- `src/pages/Receipt.tsx` — redesign visual completo
- `supabase/functions/get-receipt/index.ts` — incluir `image_url` do produto na resposta

