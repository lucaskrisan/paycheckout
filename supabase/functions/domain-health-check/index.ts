import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * domain-health-check
 *
 * Faz uma checagem REAL de disponibilidade do domínio customizado do produtor:
 * - Resolve via fetch (HEAD/GET) https://{hostname}/checkout/__health
 * - Mede latência
 * - Verifica se a SPA da Panttera realmente está sendo servida (procura por marcador HTML)
 * - Diagnostica erros típicos: 522 (origem inacessível), 525 (handshake SSL), 530 (1016 - DNS),
 *   403 (Host bloqueado pelo fallback), 404 (rota não roteada), etc.
 *
 * Esse endpoint é o que o /admin/domains usa pra mostrar o badge
 * "Link funcionando" — independente do status reportado pela Cloudflare.
 */

interface HealthResult {
  ok: boolean;
  hostname: string;
  status_code: number | null;
  latency_ms: number | null;
  served_by_panttera: boolean;
  diagnosis: string;
  hint: string | null;
  checked_at: string;
}

function diagnose(statusCode: number | null, error: string | null): { diagnosis: string; hint: string | null } {
  if (error) {
    if (/ENOTFOUND|getaddrinfo|dns/i.test(error)) {
      return {
        diagnosis: 'DNS não resolve',
        hint: 'O CNAME do subdomínio ainda não está apontando para fallback.panttera.com.br ou ainda está propagando.',
      };
    }
    if (/timeout|timed out/i.test(error)) {
      return {
        diagnosis: 'Timeout ao conectar',
        hint: 'A origem do fallback (Worker) não respondeu a tempo. Pode ser propagação ou Worker fora do ar.',
      };
    }
    if (/certificate|ssl|tls/i.test(error)) {
      return {
        diagnosis: 'Falha de SSL/TLS',
        hint: 'O certificado SSL ainda não foi emitido pela Cloudflare. Aguarde 5–30 min.',
      };
    }
    return { diagnosis: 'Erro de rede', hint: error };
  }

  if (statusCode === null) {
    return { diagnosis: 'Sem resposta', hint: 'Não foi possível conectar ao domínio.' };
  }
  if (statusCode === 200) {
    return { diagnosis: 'OK', hint: null };
  }
  if (statusCode === 403) {
    return {
      diagnosis: 'Host rejeitado pelo fallback (403)',
      hint: 'O Worker da Cloudflare não está reescrevendo o Host. Verifique o código do Worker fallback.panttera.com.br.',
    };
  }
  if (statusCode === 404) {
    return {
      diagnosis: 'Rota não encontrada (404)',
      hint: 'O fallback respondeu, mas a rota /checkout não foi encontrada na origem.',
    };
  }
  if (statusCode === 522 || statusCode === 523 || statusCode === 524) {
    return {
      diagnosis: `Origem inacessível (${statusCode})`,
      hint: 'O Custom Hostname Cloudflare está ativo, mas a origem (Worker fallback) não respondeu. Verifique o Worker.',
    };
  }
  if (statusCode === 525 || statusCode === 526) {
    return {
      diagnosis: `Falha de handshake SSL (${statusCode})`,
      hint: 'A Cloudflare não conseguiu negociar SSL com a origem do fallback.',
    };
  }
  if (statusCode === 530) {
    return {
      diagnosis: 'Erro 1016 (DNS interno)',
      hint: 'O fallback.panttera.com.br não resolve internamente. Verifique o Worker/CNAME.',
    };
  }
  if (statusCode >= 500) {
    return { diagnosis: `Erro do servidor (${statusCode})`, hint: 'Origem retornou erro 5xx.' };
  }
  if (statusCode >= 400) {
    return { diagnosis: `Erro do cliente (${statusCode})`, hint: null };
  }
  return { diagnosis: `HTTP ${statusCode}`, hint: null };
}

async function probeHostname(hostname: string): Promise<HealthResult> {
  const url = `https://${hostname}/`;
  const startedAt = Date.now();
  let statusCode: number | null = null;
  let bodySnippet = '';
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PantteraDomainHealthCheck/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeoutId);
    statusCode = res.status;
    try {
      const text = await res.text();
      bodySnippet = text.slice(0, 4000).toLowerCase();
    } catch {
      // ignore body read errors
    }
  } catch (err: any) {
    errorMsg = err?.message || String(err);
  }

  const latency = Date.now() - startedAt;
  const { diagnosis, hint } = diagnose(statusCode, errorMsg);

  // Marcadores que indicam que a SPA da Panttera está sendo servida
  const servedByPanttera =
    bodySnippet.includes('panttera') ||
    bodySnippet.includes('paycheckout') ||
    bodySnippet.includes('id="root"') ||
    bodySnippet.includes('vite');

  return {
    ok: statusCode === 200 && servedByPanttera,
    hostname,
    status_code: statusCode,
    latency_ms: latency,
    served_by_panttera: servedByPanttera,
    diagnosis,
    hint,
    checked_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    let hostnameInput: string | undefined = body?.hostname;

    if (!id && !hostnameInput) {
      return new Response(JSON.stringify({ error: 'id or hostname is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (id) {
      const { data: domain, error: fetchError } = await supabase
        .from('custom_domains')
        .select('hostname,user_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !domain) {
        return new Response(JSON.stringify({ error: 'Domínio não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      hostnameInput = domain.hostname as string;
    }

    const cleanHost = String(hostnameInput)
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();

    if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(cleanHost)) {
      return new Response(JSON.stringify({ error: 'hostname inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await probeHostname(cleanHost);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[domain-health-check] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
