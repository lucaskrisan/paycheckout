

# Auditoria Completa: Área de Membros e Acessos

## Resumo da Arquitetura Atual

A área de membros usa um sistema de acesso baseado em **tokens UUID** (`access_token`) na tabela `member_access`. O token é passado via query string (`?token=xxx`) e injetado como header `x-access-token` em um cliente Supabase customizado. As políticas RLS validam o acesso comparando esse header com o `access_token` armazenado.

---

## Problemas Encontrados

### 1. Token de Acesso Exposto na URL (Risco Médio)
O `access_token` é um UUID passado como query parameter na URL (`/membros?token=xxx`). Isso significa:
- Fica salvo no histórico do navegador
- Pode vazar em logs de servidor, analytics, referrers
- Qualquer pessoa com o link tem acesso completo ao curso

**Recomendação**: Este é um trade-off de design aceitável para compradores sem conta, mas deve-se considerar:
- Adicionar rotação de tokens periódica
- Implementar revogação de tokens no painel admin (já existe via delete de `member_access`)

### 2. CustomerPortal Busca `member_access` sem Validação de Token (Risco Alto)
No `CustomerPortal.tsx` (linha 100-103), a consulta em modo token faz:
```typescript
.from("member_access")
.select("*, courses(*)")
.eq("customer_id", accessData.customer_id)
```
Isso lista **todos os acessos de um customer** usando o cliente `supabase` padrão (sem header `x-access-token`). A RLS da `member_access` permite SELECT por token OU por owner do curso OU super_admin. Como o cliente padrão não envia token, essa query pode falhar silenciosamente ou retornar vazio para compradores.

**Correção**: Usar o `tokenClient` com header `x-access-token` ou ajustar a RLS para permitir leitura por `customer_id` quando autenticado via token válido.

### 3. CustomerPortal Lê Dados de `customers` sem RLS Adequada (Risco Médio)
Na linha 89-93, busca `customers.*` usando o token do comprador, mas a tabela `customers` só permite SELECT para `authenticated` com `user_id = auth.uid()`. Para visitantes anônimos com token, essa query falha silenciosamente.

**Correção**: Adicionar política RLS que permita leitura do próprio registro de customer quando acessado via token válido de `member_access`.

### 4. Catálogo de Cursos Exibe Todos os Cursos para Membros (Risco Baixo)
No `MemberArea.tsx` (linha 214-246), a query `courses.select(*)` com token busca todos os cursos visíveis. Como a RLS de `courses` para `anon` mostra cursos com `product.active = true`, isso é adequado para o catálogo, mas expõe metadados de cursos de outros produtores.

**Status**: Comportamento intencional (catálogo de upsell).

### 5. Storage Buckets Públicos (Risco Alto)
Os buckets `product-images` e `course-materials` estão configurados como **públicos**. Isso significa que qualquer pessoa com a URL direta pode acessar materiais de curso (PDFs, arquivos) sem autenticação.

**Correção**: O bucket `course-materials` deveria ser **privado** com políticas de storage que validem o acesso. O `product-images` pode permanecer público (são imagens de marketing).

### 6. Sem Validação de `expires_at` na RLS de `lesson_progress` (Risco Baixo)
As políticas de INSERT e UPDATE na `lesson_progress` validam o token mas **não verificam `expires_at`** da `member_access`. Um aluno com acesso expirado ainda pode marcar aulas como concluídas.

**Correção**: Adicionar verificação `(ma.expires_at IS NULL OR ma.expires_at > now())` nas policies de INSERT/UPDATE da `lesson_progress`.

### 7. Rotas Públicas sem Proteção (Info)
`/membros` e `/minha-conta` são rotas públicas no React Router. A proteção é feita via validação de token no componente. Isso é aceitável mas vale documentar.

---

## Plano de Correções

### Migração SQL
1. **Adicionar validação de expiração nas policies de `lesson_progress`** (INSERT e UPDATE) para verificar `expires_at`
2. **Tornar o bucket `course-materials` privado** com policies de storage apropriadas

### Código Frontend
3. **CustomerPortal**: Usar `tokenClient` (com header x-access-token) para queries em modo token, garantindo que as RLS sejam respeitadas
4. **CustomerPortal**: Adicionar fallback para quando queries falham por falta de permissão RLS

### Itens Já Seguros
- RLS de `course_lessons`, `course_modules`, `lesson_materials`: validam token + expiração corretamente
- RLS de `lesson_reviews`: valida token + expiração corretamente
- `member_access`: acesso por token ou owner do curso
- Edge function `send-access-link`: valida JWT + ownership do curso
- Edge function `resolve-user-destination`: usa service_role para operações admin

---

## Resumo de Prioridades

| # | Problema | Risco | Ação |
|---|----------|-------|------|
| 1 | Storage `course-materials` público | Alto | Tornar privado + policies |
| 2 | `lesson_progress` sem check de expiração | Médio | Atualizar RLS policies |
| 3 | CustomerPortal queries sem token header | Médio | Usar tokenClient |
| 4 | Token na URL | Baixo | Aceitar (trade-off) |

