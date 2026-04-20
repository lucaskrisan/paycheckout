

# Recuperação de carrinho no WhatsApp — plano final

## Situação atual (confirmada no banco)

1. **Duplicação**: cron dispara a cada 15 min e o dedup só conta `status='sent'`. Como as tentativas tão falhando, ele tenta de novo e de novo.
2. **Link vazio**: o template da Paola **não tem a variável `{link}`** — só `{nome}`, `{produto}` e `{valor}`. Por isso o cliente não recebe link nenhum.
3. **Cliente refaz tudo**: mesmo se tivesse link, o cron não monta com prefill.
4. **Sem limite total**: pode tentar muitas vezes seguidas.

## O que vou fazer

### 1. Conserto do cron `whatsapp-abandon-cron`

- **Esperar 15 min** após o cliente sair (já faz isso, mas vou confirmar o filtro `created_at < 15min ago`). Se ele pagou nesse intervalo, o `recovered=true` já bloqueia o disparo (re-check antes de enviar, igual hoje).
- **Buscar `checkout_url`** do cart no select.
- **Montar o link de recuperação com prefill**: `checkout_url + ?name=&email=&phone=&cpf=&utm_source=recovery&utm_medium=whatsapp&utm_campaign=abandoned_cart`.
- **Passar como `access_link`** pro `whatsapp-dispatch` (que já substitui `{link}`).
- **Dedup corrigido**: contar **qualquer tentativa** (`sent` OU `failed`) feita nas últimas 24h pra mesma combinação `cart_id` ou `phone+product`.
- **Limite máximo de 2 tentativas totais** por carrinho. Se já tentou 2 vezes (independente do resultado), nunca mais tenta.
- **Janela de retry de 6h** entre tentativas falhas (caso a Evolution caia genuinamente, tenta de novo depois de 6h, **uma vez só** dentro do limite de 2).

### 2. Atualizar o template padrão da Paola (e qualquer template novo de abandono)

O template dela hoje **não tem `{link}`**. Vou:
- Editar o template existente dela (`db6aa6b9...`) adicionando a variável `{link}` no corpo, com texto explicativo do tipo:
  > *"Clique aqui pra finalizar com seus dados já preenchidos: {link}"*
- Texto da mensagem deixa **claro pro cliente** que ele pode clicar no link e gerar o Pix novamente, com tudo já preenchido (nome, e-mail, fone, CPF).
- O Pix antigo continua disponível dentro dos 30 min — mas se expirou, basta clicar em "Pagar com Pix" no checkout pra gerar um novo (é 1 clique).

### 3. Limpeza dos carrinhos que já receberam spam

- Marcar todos os carrinhos com **2 ou mais disparos nas últimas 24h** com um campo de "limite atingido" pra parar imediatamente.
- Sem isso, mesmo o fix novo poderia tentar mais 1x neles.

## Fluxo final

```text
Cliente preenche → gera Pix → fecha o navegador
        ↓
   15 min depois, cron acorda
        ↓
   Já pagou? (recovered=true) → SKIP
   Já tentou 2x? → SKIP
   Última tentativa < 6h? → SKIP
        ↓
   Dispara WhatsApp:
   "Oi {nome}, vi que você não finalizou {produto}.
    Clica aqui que tá tudo preenchido: {link}"
        ↓
   Cliente clica → checkout abre com nome/email/fone/CPF
   → 1 clique em "Pagar com Pix" → novo QR Code
        ↓
   Sucesso? → recovered=true, nunca mais dispara
   Falha? → espera 6h, tenta + 1x (máximo 2 total)
```

## Arquivos afetados

- `supabase/functions/whatsapp-abandon-cron/index.ts` — toda a lógica de dedup, limite, prefill e construção do link.
- Template da Paola no banco (UPDATE direto via migração) — adicionar `{link}` no corpo.
- **Sem mudanças** em `whatsapp-dispatch`, `Checkout.tsx`, schema de tabelas ou supabase/config.toml.

## O que NÃO mexo

- Schedule do pg_cron (mantém 15 min, o dedup é que cuida).
- Templates de outros produtores (não vou tocar nos templates deles).
- Lógica do Pix em si.
- Painel admin (sem mudanças visuais).

