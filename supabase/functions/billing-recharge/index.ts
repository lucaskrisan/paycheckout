import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const body = await req.json();
    const amount = Number(body.amount);
    const method = body.method || 'pix'; // 'pix' or 'card'
    if (!amount || amount < 10) {
      return new Response(JSON.stringify({ error: 'Valor mínimo de recarga é R$10' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const name = user.user_metadata?.full_name || user.email!.split('@')[0];
    const email = user.email!;
    // ─────────────────────────────────────────
    // PIX via Pagar.me
    // ─────────────────────────────────────────
    if (method === 'pix') {
      const PAGARME_API_KEY = Deno.env.get('PAGARME_API_KEY');
      if (!PAGARME_API_KEY) {
        return new Response(JSON.stringify({ error: 'Gateway PIX não configurado' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const externalRef = `recharge_${user.id}_${Date.now()}`;
      const orderPayload = {
        code: externalRef,
        items: [
          {
            amount: Math.round(amount * 100), // centavos
            description: `Recarga PanteraPay — R$${amount.toFixed(2).replace('.', ',')}`,
            quantity: 1,
            code: 'billing-recharge',
          },
        ],
        customer: {
          name,
          email,
          type: 'individual',
        },
        payments: [
          {
            payment_method: 'pix',
            pix: { expires_in: 3600 },
          },
        ],
      };
      const response = await fetch('https://api.pagar.me/core/v5/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(PAGARME_API_KEY + ':')}`,
        },
        body: JSON.stringify(orderPayload),
      });
      const data = await response.json();
      if (!response.ok || data.status === 'failed') {
        console.error('[billing-recharge] Pagar.me error:', JSON.stringify(data));
        return new Response(JSON.stringify({ error: 'Erro ao gerar PIX. Tente novamente.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const charge = data.charges?.[0];
      const pixData = charge?.last_transaction;
      // Save pending recharge
      await supabaseAdmin.from('billing_recharges').insert({
        user_id: user.id,
        amount,
        external_id: data.id,
        status: 'pending',
      });
      return new Response(JSON.stringify({
        success: true,
        method: 'pix',
        payment_id: data.id,
        pix_code: pixData?.qr_code || null,
        qr_code_url: pixData?.qr_code_url || null,
        expires_at: pixData?.expires_at || null,
        amount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // ─────────────────────────────────────────
    // Card via Asaas
    // ─────────────────────────────────────────
    if (method === 'card') {
      const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
      if (!ASAAS_API_KEY) {
        return new Response(JSON.stringify({ error: 'Gateway cartão não configurado' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || 'sandbox';
      const baseUrl = ASAAS_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';
      // Find or create Asaas customer by email
      const searchRes = await fetch(
        `${baseUrl}/customers?email=${encodeURIComponent(email)}`,
        { headers: { 'access_token': ASAAS_API_KEY } }
      );
      const searchData = await searchRes.json();
      let asaasCustomerId: string;
      if (searchData.data?.[0]?.id) {
        asaasCustomerId = searchData.data[0].id;
      } else {
        const createRes = await fetch(`${baseUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
          body: JSON.stringify({ name, email }),
        });
        const createData = await createRes.json();
        if (!createData.id) {
          console.error('[billing-recharge] Asaas customer error:', createData);
          return new Response(JSON.stringify({ error: 'Erro ao criar cliente no gateway' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        asaasCustomerId = createData.id;
      }
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const externalRef = `recharge_${user.id}_${Date.now()}`;
      // Create card payment link (tokenized)
      const chargeRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: 'CREDIT_CARD',
          value: amount,
          dueDate,
          description: `Recarga PanteraPay — R$${amount.toFixed(2).replace('.', ',')}`,
          externalReference: externalRef,
        }),
      });
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok || !chargeData.id) {
        console.error('[billing-recharge] Asaas card error:', chargeData);
        return new Response(JSON.stringify({ error: 'Erro ao gerar cobrança no cartão' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Save pending recharge
      await supabaseAdmin.from('billing_recharges').insert({
        user_id: user.id,
        amount,
        external_id: chargeData.id,
        status: 'pending',
      });
      return new Response(JSON.stringify({
        success: true,
        method: 'card',
        payment_id: chargeData.id,
        payment_link: chargeData.invoiceUrl || null,
        amount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Método inválido. Use pix ou card.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[billing-recharge] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
