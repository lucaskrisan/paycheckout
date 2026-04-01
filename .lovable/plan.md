## Plano de Segurança Real

### 1. Rate Limiting no Banco de Dados
- Criar tabela `rate_limit_hits` para rastrear requisições por IP/identificador
- Criar função `check_rate_limit(identifier, action, max_hits, window_seconds)` que retorna `true` se bloqueado
- Auto-limpeza de registros expirados via trigger

### 2. Rate Limiting nas Edge Functions Sensíveis
Adicionar verificação de rate limit no início de cada função:
- **create-pix-payment**: 5 tentativas por IP/email a cada 5 minutos
- **create-asaas-payment**: 5 tentativas por IP/email a cada 5 minutos  
- **create-stripe-payment**: 5 tentativas por IP/email a cada 5 minutos
- **verify-turnstile**: 10 tentativas por IP a cada 1 minuto

### 3. Painel de Monitoramento de Anomalias (Super Admin)
Nova aba "Segurança" no dashboard com:
- Tabela de rate limit violations (quem foi bloqueado, quando, qual endpoint)
- KPIs: total de bloqueios hoje, tentativas suspeitas, IPs mais bloqueados
- Alertas automáticos para picos incomuns

### Arquivos afetados:
- Nova migration: `rate_limit_hits` table + `check_rate_limit` function
- `supabase/functions/create-pix-payment/index.ts`
- `supabase/functions/create-asaas-payment/index.ts`
- `supabase/functions/create-stripe-payment/index.ts`
- `supabase/functions/verify-turnstile/index.ts`
- `src/pages/admin/SuperAdminDashboard.tsx` (nova aba Segurança)
