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
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const { amount, customer, payment_method, installments } = await req.json();

    if (!amount || !customer?.name || !customer?.email || !customer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email, cpf)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch gateway config server-side
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: gatewayData } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, environment')
      .eq('provider', 'asaas')
      .eq('active', true)
      .limit(1)
      .single();

    const gateway_config = gatewayData?.config as Record<string, any> || {};
    const environment = gatewayData?.environment || 'sandbox';

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // 1. Create or find customer in Asaas
    const customerPayload = {
      name: customer.name,
      email: customer.email,
      cpfCnpj: cleanCpf,
      mobilePhone: customer.phone?.replace(/\D/g, '') || undefined,
    };

    const customerRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(customerPayload),
    });

    const customerData = await customerRes.json();
    
    if (!customerRes.ok && !customerData.id) {
      const searchRes = await fetch(`${baseUrl}/customers?cpfCnpj=${cleanCpf}`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const searchData = await searchRes.json();
      if (searchData.data?.[0]?.id) {
        customerData.id = searchData.data[0].id;
      } else {
        console.error('Asaas customer error:', JSON.stringify(customerData));
        return new Response(
          JSON.stringify({ error: 'Failed to create customer', details: customerData }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Create payment
    const billingType = payment_method === 'credit_card' ? 'CREDIT_CARD' : 'PIX';

    const dueDate = new Date();
    if (payment_method === 'pix') {
      dueDate.setDate(dueDate.getDate() + (gateway_config.pix_validity_days || 1));
    }

    const paymentPayload: any = {
      customer: customerData.id,
      billingType,
      value: amount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: gateway_config.billing_description || 'Pagamento',
    };

    if (payment_method === 'credit_card') {
      const installmentCount = parseInt(installments) || 1;
      if (installmentCount > 1) {
        paymentPayload.installmentCount = installmentCount;
        paymentPayload.installmentValue = Math.round((amount / installmentCount) * 100) / 100;
      }

      if (customer.creditCard) {
        paymentPayload.creditCard = customer.creditCard;
        paymentPayload.creditCardHolderInfo = {
          name: customer.name,
          email: customer.email,
          cpfCnpj: cleanCpf,
          phone: customer.phone?.replace(/\D/g, '') || '',
          postalCode: customer.postalCode || '00000000',
          addressNumber: customer.addressNumber || '0',
        };
      }
    }

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('Asaas payment error:', JSON.stringify(paymentData));
      return new Response(
        JSON.stringify({ error: 'Payment creation failed', details: paymentData }),
        { status: paymentRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. For PIX, get QR code
    if (payment_method === 'pix' && paymentData.id) {
      const pixRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const pixData = await pixRes.json();

      return new Response(
        JSON.stringify({
          payment_id: paymentData.id,
          status: paymentData.status,
          qr_code: pixData.payload,
          qr_code_url: pixData.encodedImage,
          expires_at: paymentData.dueDate,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        payment_id: paymentData.id,
        status: paymentData.status,
        invoice_url: paymentData.invoiceUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});