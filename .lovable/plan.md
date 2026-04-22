

## Correção emergencial: destravar o preview

### O problema (em baby mode)
O preview está quebrado porque o `package.json` está com `vite ^8.0.9` (versão inexistente/instável) e faltam dependências do Radix. Isso quebrou o servidor que carrega os arquivos do app — por isso aparece "Failed to fetch dynamically imported module: AdminLayout.tsx".

### O que vou fazer (mínimo necessário, sem riscos)

**1. Reverter `vite` para versão estável**
- Em `package.json`, voltar `vite` para `^5.4.10` (versão estável e compatível com `@vitejs/plugin-react-swc` que o projeto já usa).

**2. Garantir Radix Dialog instalado**
- Adicionar `@radix-ui/react-dialog` em versão estável (`^1.1.2`) — usado por `sheet.tsx`, `dialog.tsx` e `command.tsx`.

**3. Reverter o "patch manual" no sheet.tsx**
- Remover o `// @ts-nocheck` e o `className?: string` que foram adicionados como gambiarra. Voltar ao código original do shadcn (a tipagem do Radix já cobre `className` quando o pacote está instalado de verdade).

### O que NÃO vou tocar
- Nenhum arquivo de feature (checkout, pixels, webhooks, área de membros).
- Nenhuma migração de banco.
- Nenhuma Edge Function.
- Nada do plano dos pixels — fica intacto, esperando.

### Arquivos que vão mudar
- `package.json` (apenas linhas de `vite` e `@radix-ui/react-dialog`)
- `src/components/ui/sheet.tsx` (reverter para versão limpa do shadcn)

### Validação após o fix
- Preview carrega sem o erro de "Failed to fetch dynamically imported module"
- `/admin` abre normal
- Sem erro de Vite no console sobre `@radix-ui/react-dialog`

### Depois disso
Confirmamos que voltou ao normal e você decide se quer seguir com o plano dos pixels (que continua intacto e aprovado mentalmente, só esperando execução).

