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
    if (!amount || amount < 10) {
      return new Response(JSON.stringify({ error: 'Valor mínimo de recarga é R$10' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gateway não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || 'sandbox';
    const baseUrl = ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
    // externalReference encodes user_id so webhook knows who to credit
    const externalRef = `recharge_${user.id}_${Date.now()}`;
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    // Get or create Asaas customer using producer's email
    // Try to find existing customer by email first
    const searchRes = await fetch(
      `${baseUrl}/customers?email=${encodeURIComponent(user.email!)}`,
      { headers: { 'access_token': ASAAS_API_KEY } }
    );
    const searchData = await searchRes.json();
    let asaasCustomerId: string;
    if (searchData.data?.[0]?.id) {
      asaasCustomerId = searchData.data[0].id;
    } else {
      // Create new customer with email only (name from user_metadata)
      const name = user.user_metadata?.full_name || user.email!.split('@')[0];
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({ name, email: user.email }),
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
    // Create PIX charge
    const chargeRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: amount,
        dueDate,
        description: `Recarga PanteraPay — R$${amount.toFixed(2).replace('.', ',')}`,
        externalReference: externalRef,
      }),
    });
    const chargeData = await chargeRes.json();
    if (!chargeRes.ok || !chargeData.id) {
      console.error('[billing-recharge] Asaas charge error:', chargeData);
      return new Response(JSON.stringify({ error: 'Erro ao gerar cobrança PIX' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Get PIX QR Code
    const pixRes = await fetch(`${baseUrl}/payments/${chargeData.id}/pixQrCode`, {
      headers: { 'access_token': ASAAS_API_KEY },
    });
    const pixData = await pixRes.json();
    // Save pending recharge
    const { error: insertErr } = await supabaseAdmin
      .from('billing_recharges')
      .insert({
        user_id: user.id,
        amount,
        external_id: chargeData.id,
        status: 'pending',
      });
    if (insertErr) {
      console.error('[billing-recharge] Insert error:', insertErr);
    }
    return new Response(JSON.stringify({
      success: true,
      payment_id: chargeData.id,
      pix_code: pixData.payload || null,
      qr_code_url: pixData.encodedImage
        ? `data:image/png;base64,${pixData.encodedImage}`
        : null,
      expires_at: dueDate,
      amount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[billing-recharge] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
