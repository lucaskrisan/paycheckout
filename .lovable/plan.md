
O usuário quer validação: "Hotmart e Kiwify fazem assim? Esse plano está correto?"

Resposta honesta baseada em como Hotmart e Kiwify realmente funcionam:

**Como Hotmart faz:**
- Aluno compra → recebe e-mail com link para a "Área de Membros Hotmart" (klickart/sparkle)
- Aluno faz LOGIN com e-mail + senha (ou Google) — não usa token na URL
- Acesso é vitalício enquanto tiver login
- Tem botão "Esqueci minha senha" e "Reenviar acesso"
- Painel central: minhasvendas.hotmart.com mostra TODOS os produtos comprados

**Como Kiwify faz:**
- Igual: aluno cria senha no primeiro acesso
- Login em dashboard.kiwify.com.br/area-de-membros
- Acesso vitalício, mostra todos os cursos comprados
- Self-service para recuperar senha

**Diferença com PanteraPay hoje:**
- Hoje usamos token na URL (mais frágil — link some, expira, perde no PWA)
- Hotmart/Kiwify usam login (mais robusto — funciona sempre)

**Conclusão honesta:**
O plano de 4 camadas vai NA DIREÇÃO CERTA mas a **Camada 1 (Portal do Aluno com login)** é exatamente o modelo Hotmart/Kiwify — e deveria ser a PRINCIPAL, não uma das 4. O resto vira complemento de transição.

Vou refinar o plano deixando isso claro: priorizar Camada 1 como solução-padrão (igual mercado), e as outras 3 como rede de segurança.
