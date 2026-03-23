import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
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

    // ── Input ─────────────────────────────────────────────────────────────────
    const body = await req.json();
    const { cardNumber, holderName, expiryMonth, expiryYear, cvv, cpf, postalCode } = body;

    if (!cardNumber || !holderName || !expiryMonth || !expiryYear || !cvv || !cpf || !postalCode) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: cardNumber, holderName, expiryMonth, expiryYear, cvv, cpf, postalCode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanCpf = String(cpf).replace(/\D/g, '');
    const cleanPostalCode = String(postalCode).replace(/\D/g, '');
    const email = user.email!;
    const name = user.user_metadata?.full_name || holderName;

    // ── Asaas setup ───────────────────────────────────────────────────────────
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

    // ── Find or create Asaas customer ─────────────────────────────────────────
    let asaasCustomerId: string;

    const searchRes = await fetch(
      `${baseUrl}/customers?email=${encodeURIComponent(email)}`,
      { headers: { 'access_token': ASAAS_API_KEY } }
    );
    const searchData = await searchRes.json();

    if (searchData.data?.[0]?.id) {
      asaasCustomerId = searchData.data[0].id;
    } else {
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({ name, email, cpfCnpj: cleanCpf }),
      });
      const createData = await createRes.json();
      if (!createData.id) {
        console.error('[billing-validate-card] Asaas customer error:', createData);
        return new Response(JSON.stringify({ error: 'Erro ao criar cliente no gateway' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      asaasCustomerId = createData.id;
    }

    // ── Charge R$5.00 to tokenize card ────────────────────────────────────────
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'CREDIT_CARD',
        value: 5,
        dueDate,
        description: 'Validação de cartão PanteraPay',
        creditCard: {
          holderName,
          number: String(cardNumber).replace(/\s/g, ''),
          expiryMonth: String(expiryMonth),
          expiryYear: String(expiryYear),
          ccv: String(cvv),
        },
        creditCardHolderInfo: {
          name,
          email,
          cpfCnpj: cleanCpf,
          postalCode: cleanPostalCode,
          addressNumber: '0',
          phone: '',
        },
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok || !paymentData.id) {
      console.error('[billing-validate-card] Asaas charge error:', JSON.stringify(paymentData));
      const errDesc = paymentData?.errors?.[0]?.description || '';
      let userMsg = 'Cartão recusado. Verifique os dados e tente novamente.';
      if (/invalid|expired|expir/i.test(errDesc)) userMsg = 'Cartão inválido ou expirado. Verifique os dados.';
      else if (/cvv|ccv/i.test(errDesc)) userMsg = 'CVV inválido. Verifique o código de segurança.';
      else if (/cpf|cnpj/i.test(errDesc)) userMsg = 'CPF inválido. Verifique o número.';
      return new Response(JSON.stringify({ error: userMsg }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (paymentData.status === 'DECLINED' || paymentData.status === 'REFUSED') {
      return new Response(JSON.stringify({ error: 'Cartão recusado pela operadora. Tente outro cartão.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cardToken: string = paymentData.creditCard?.creditCardToken || '';
    const cardLast4: string = paymentData.creditCard?.creditCardNumber || '';
    const cardBrand: string = paymentData.creditCard?.creditCardBrand || '';

    // ── Refund R$5.00 (with one retry after 3 s) ──────────────────────────────
    const refundRes = await fetch(`${baseUrl}/payments/${paymentData.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({ value: 5 }),
    });
    const refundData = await refundRes.json();

    if (!refundRes.ok) {
      console.error(`[billing-validate-card] Refund failed for payment ${paymentData.id}:`, refundData);
      // Retry refund once after 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      const retryRefundRes = await fetch(`${baseUrl}/payments/${paymentData.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({ value: 5 }),
      });
      const retryRefundData = await retryRefundRes.json();
      if (!retryRefundRes.ok) {
        console.error(`[billing-validate-card] CRITICAL: Refund retry ALSO failed for payment ${paymentData.id}. Manual refund required.`, retryRefundData);
      } else {
        console.log(`[billing-validate-card] Refund retry succeeded for payment ${paymentData.id}`);
      }
    } else {
      console.log(`[billing-validate-card] Refund succeeded for payment ${paymentData.id}`);
    }

    // ── Save card token to billing_accounts ───────────────────────────────────
    const { error: upsertErr } = await supabaseAdmin
      .from('billing_accounts')
      .upsert(
        {
          user_id: user.id,
          card_token: cardToken,
          card_last4: cardLast4,
          card_brand: cardBrand,
        },
        { onConflict: 'user_id' }
      );

    if (upsertErr) {
      console.error('[billing-validate-card] billing_accounts upsert error:', upsertErr);
      return new Response(JSON.stringify({ error: 'Cartão validado mas não foi possível salvar. Tente novamente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[billing-validate-card] Card validated and saved for user ${user.id}: ${cardBrand} ****${cardLast4}`);

    return new Response(JSON.stringify({
      success: true,
      card_last4: cardLast4,
      card_brand: cardBrand,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[billing-validate-card] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
