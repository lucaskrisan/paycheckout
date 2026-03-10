const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAGARME_API_KEY = Deno.env.get('PAGARME_API_KEY');
    if (!PAGARME_API_KEY) {
      throw new Error('PAGARME_API_KEY not configured');
    }

    const { amount, customer } = await req.json();

    if (!amount || !customer?.name || !customer?.email || !customer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email, cpf)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean CPF - remove formatting
    const cleanCpf = customer.cpf.replace(/\D/g, '');
    // Clean phone
    const cleanPhone = customer.phone?.replace(/\D/g, '') || '';

    const orderPayload = {
      items: [
        {
          amount: Math.round(amount * 100), // Pagar.me expects amount in cents
          description: 'Pagamento via PIX',
          quantity: 1,
          code: 'pix-payment',
        },
      ],
      customer: {
        name: customer.name,
        email: customer.email,
        document: cleanCpf,
        document_type: 'CPF',
        type: 'individual',
        phones: cleanPhone
          ? {
              mobile_phone: {
                country_code: '55',
                area_code: cleanPhone.slice(0, 2),
                number: cleanPhone.slice(2),
              },
            }
          : undefined,
      },
      payments: [
        {
          payment_method: 'pix',
          pix: {
            expires_in: 1800, // 30 minutes
          },
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

    if (!response.ok) {
      console.error('Pagar.me error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Payment creation failed', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract PIX data from response
    const charge = data.charges?.[0];
    const lastTransaction = charge?.last_transaction;

    return new Response(
      JSON.stringify({
        order_id: data.id,
        status: data.status,
        qr_code: lastTransaction?.qr_code,
        qr_code_url: lastTransaction?.qr_code_url,
        expires_at: lastTransaction?.expires_at,
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
