import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const extractErrorMessages = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(extractErrorMessages);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = [record.description, record.message, record.error]
      .flatMap(extractErrorMessages);

    if (preferred.length > 0) return preferred;

    return Object.values(record).flatMap(extractErrorMessages);
  }

  return [String(value)];
};

const getGatewayErrorMessage = (data: Record<string, unknown>, fallback: string) => {
  const messages = extractErrorMessages(data.errors);
  if (messages.length > 0) return messages.join(' ');

  const fallbackMessages = extractErrorMessages(data.message ?? data.error);
  return fallbackMessages.length > 0 ? fallbackMessages.join(' ') : fallback;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      return jsonResponse({ success: false, error: 'Gateway de cartão não configurado' });
    }

    const ASAAS_ENV = Deno.env.get('ASAAS_ENV') || 'production';
    const baseUrl = ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { card_number, card_name, card_expiry_month, card_expiry_year, card_cvv, card_cpf, card_cep } = body;

    // Validate required fields
    if (!card_number || !card_name || !card_expiry_month || !card_expiry_year || !card_cvv || !card_cpf || !card_cep) {
      return jsonResponse({ success: false, error: 'Todos os campos do cartão são obrigatórios' });
    }

    // Sanitize inputs
    const cleanNumber = card_number.replace(/\D/g, '');
    const cleanCpf = card_cpf.replace(/\D/g, '');
    const cleanCep = (card_cep || '').replace(/\D/g, '');
    const cleanMonth = String(card_expiry_month).padStart(2, '0');
    const cleanYear = String(card_expiry_year).length === 2 
      ? `20${card_expiry_year}` 
      : String(card_expiry_year);

    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return jsonResponse({ success: false, error: 'Número do cartão inválido' });
    }
    if (cleanCpf.length !== 11) {
      return jsonResponse({ success: false, error: 'CPF inválido' });
    }
    if (card_cvv.length < 3 || card_cvv.length > 4) {
      return jsonResponse({ success: false, error: 'CVV inválido' });
    }
    if (cleanCep.length !== 8) {
      return jsonResponse({ success: false, error: 'CEP inválido' });
    }

    const name = user.user_metadata?.full_name || user.email!.split('@')[0];
    const email = user.email!;

    // Get phone from profile or latest customer record
    const [{ data: profile }, { data: recentCustomer }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('customers')
        .select('phone')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const phone = profile?.phone || recentCustomer?.phone || '';

    // 1. Find or create Asaas customer
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
        body: JSON.stringify({
          name: card_name,
          email,
          cpfCnpj: cleanCpf,
          phone: phone || undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createData.id) {
        console.error('[billing-validate-card] Asaas customer error:', createData);
        return jsonResponse({ success: false, error: 'Erro ao criar cliente no gateway' });
      }
      asaasCustomerId = createData.id;
    }

    const dueDate = new Date().toISOString().split('T')[0];
    // 2. Make validation charge with card data and capture token for future charges
    const validationPayload = {
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: 5.00,
      dueDate,
      description: 'Validação de cartão PanteraPay (será estornada automaticamente)',
      creditCard: {
        holderName: card_name,
        number: cleanNumber,
        expiryMonth: cleanMonth,
        expiryYear: cleanYear,
        ccv: card_cvv,
      },
      creditCardHolderInfo: {
        name: card_name,
        email,
        cpfCnpj: cleanCpf,
        phone: phone || cleanNumber.slice(-11),
        postalCode: '00000000',
        addressNumber: '0',
        addressComplement: '',
      },
      remoteIp: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '0.0.0.0',
    };

    const validationRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(validationPayload),
    });

    const validationData = await validationRes.json();
    const failedStatuses = new Set(['REFUSED', 'FAILED', 'CANCELLED']);

    if (!validationRes.ok || !validationData.id || failedStatuses.has(validationData.status)) {
      console.error('[billing-validate-card] Validation charge error:', JSON.stringify(validationData));
      return jsonResponse({
        success: false,
        error: getGatewayErrorMessage(validationData, 'Cartão recusado. Verifique os dados e tente novamente.'),
      });
    }

    const creditCardToken = validationData.creditCard?.creditCardToken;
    if (!creditCardToken) {
      console.error('[billing-validate-card] Missing token after validation:', JSON.stringify(validationData));
      return jsonResponse({
        success: false,
        error: 'Não foi possível ativar cobranças automáticas com este cartão. Tente outro cartão ou use outro método.',
      });
    }

    // 3. Immediately refund the validation charge — CRITICAL: must always refund
    try {
      const refundRes = await fetch(`${baseUrl}/payments/${validationData.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({ value: 5.00, description: 'Estorno automático de validação de cartão' }),
      });
      const refundData = await refundRes.json();
      console.log('[billing-validate-card] Refund result for', validationData.id, ':', JSON.stringify(refundData));
      
      if (!refundRes.ok) {
        console.error('[billing-validate-card] Refund FAILED — manual refund needed for payment:', validationData.id);
      }
    } catch (refundErr) {
      console.error('[billing-validate-card] Refund exception — manual refund needed for payment:', validationData.id, refundErr);
    }

    // 4. Save token to billing_accounts
    const last4 = validationData.creditCard?.creditCardNumber?.slice(-4) || cleanNumber.slice(-4);
    const brand = validationData.creditCard?.creditCardBrand || 'unknown';

    await supabaseAdmin
      .from('billing_accounts')
      .upsert({
        user_id: user.id,
        card_token: creditCardToken,
        card_last4: last4,
        card_brand: brand,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Also save CPF to profile if not set
    if (cleanCpf) {
      await supabaseAdmin
        .from('profiles')
        .update({ cpf: cleanCpf })
        .eq('id', user.id)
        .is('cpf', null);
    }

    return jsonResponse({
      success: true,
      card_last4: last4,
      card_brand: brand,
    });
  } catch (error: unknown) {
    console.error('[billing-validate-card] Error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno ao validar cartão',
    }, 500);
  }
});
