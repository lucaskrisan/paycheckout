import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { product_id } = await req.json();

    // Get all Facebook pixels for this product
    const { data: pixels } = await supabase
      .from('product_pixels')
      .select('pixel_id, capi_token, domain')
      .eq('product_id', product_id)
      .eq('platform', 'facebook')
      .eq('user_id', user.id);

    if (!pixels || pixels.length === 0) {
      return new Response(JSON.stringify({
        results: [],
        summary: { total: 0, passed: 0, warnings: 0, errors: 0 },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: any[] = [];

    for (const pixel of pixels) {
      const checks: any[] = [];

      // Check 1: Pixel ID format
      const pixelIdValid = /^\d{10,20}$/.test(pixel.pixel_id);
      checks.push({
        name: 'Formato do Pixel ID',
        status: pixelIdValid ? 'pass' : 'error',
        detail: pixelIdValid ? `ID ${pixel.pixel_id} válido` : `ID "${pixel.pixel_id}" inválido — deve ter 10-20 dígitos`,
      });

      // Check 2: Domain configured
      checks.push({
        name: 'Domínio first-party',
        status: pixel.domain ? 'pass' : 'warning',
        detail: pixel.domain ? `Usando ${pixel.domain}` : 'Sem domínio configurado — rastreamento pode ser bloqueado no iOS 14+',
      });

      // Check 3: CAPI token exists
      const hasCapiToken = !!pixel.capi_token && pixel.capi_token.length > 20;
      checks.push({
        name: 'Token CAPI configurado',
        status: hasCapiToken ? 'pass' : 'warning',
        detail: hasCapiToken ? 'Token CAPI presente' : 'Sem Conversions API — eventos dependem apenas do browser',
      });

      // Check 4: If CAPI token exists, validate it against Facebook API
      if (hasCapiToken) {
        try {
          // Send a test event to validate the token
          const testEvent = {
            data: [{
              event_name: 'PageView',
              event_time: Math.floor(Date.now() / 1000),
              event_id: `diag_${Date.now()}`,
              event_source_url: 'https://paycheckout.lovable.app/diagnostics',
              action_source: 'website',
              user_data: {
                client_ip_address: '0.0.0.0',
                client_user_agent: 'PayCheckout-Diagnostics/1.0',
              },
            }],
            access_token: pixel.capi_token,
            test_event_code: 'TEST_DIAG', // Uses test mode — won't affect real data
          };

          const capiRes = await fetch(
            `https://graph.facebook.com/v21.0/${pixel.pixel_id}/events`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testEvent),
            }
          );

          const capiData = await capiRes.json();

          if (capiRes.ok && capiData.events_received) {
            checks.push({
              name: 'Conexão CAPI → Meta',
              status: 'pass',
              detail: `Conexão OK — ${capiData.events_received} evento(s) aceito(s)`,
            });
          } else {
            const errorMsg = capiData.error?.message || JSON.stringify(capiData);
            checks.push({
              name: 'Conexão CAPI → Meta',
              status: 'error',
              detail: `Erro na API: ${errorMsg}`,
            });
          }
        } catch (capiErr) {
          checks.push({
            name: 'Conexão CAPI → Meta',
            status: 'error',
            detail: `Falha de conexão: ${capiErr.message}`,
          });
        }
      }

      // Check 5: Verify domain DNS (if configured)
      if (pixel.domain) {
        try {
          const dnsCheck = await fetch(`https://pixels.${pixel.domain}`, {
            method: 'HEAD',
            redirect: 'manual',
          });
          // Any response (even redirect) means DNS resolves
          checks.push({
            name: `DNS pixels.${pixel.domain}`,
            status: dnsCheck.status < 500 ? 'pass' : 'warning',
            detail: dnsCheck.status < 500
              ? `pixels.${pixel.domain} respondendo (status ${dnsCheck.status})`
              : `pixels.${pixel.domain} com erro (status ${dnsCheck.status})`,
          });
          await dnsCheck.text(); // consume body
        } catch {
          checks.push({
            name: `DNS pixels.${pixel.domain}`,
            status: 'error',
            detail: `pixels.${pixel.domain} não respondeu — verifique o CNAME no DNS`,
          });
        }
      }

      results.push({
        pixel_id: pixel.pixel_id,
        checks,
      });
    }

    // Summary
    const allChecks = results.flatMap((r: any) => r.checks);
    const summary = {
      total: allChecks.length,
      passed: allChecks.filter((c: any) => c.status === 'pass').length,
      warnings: allChecks.filter((c: any) => c.status === 'warning').length,
      errors: allChecks.filter((c: any) => c.status === 'error').length,
    };

    return new Response(JSON.stringify({ results, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[meta-diagnostics] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
