import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function sendPushNotification(title: string, message: string, url?: string) {
  const apiKey = Deno.env.get('PUSHALERT_API_KEY');
  if (!apiKey) {
    console.warn('PUSHALERT_API_KEY not configured, skipping notification');
    return;
  }

  try {
    const body: Record<string, string> = { title, message };
    if (url) body.url = url;

    const response = await fetch('https://api.pushalert.co/rest/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `api_key=${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('PushAlert response:', data);
  } catch (err) {
    console.error('PushAlert error:', err);
  }
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

    const { amount, customer, product_id } = await req.json();

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

    // Send push notification for PIX generated
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Check if any user has send_pending enabled
      const { data: notifSettings } = await supabase
        .from('notification_settings')
        .select('user_id, send_pending, notification_pattern, show_value, show_product_name')
        .eq('send_pending', true);

      if (notifSettings && notifSettings.length > 0) {
        // Get product name if available
        let productName = 'Produto';
        if (product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('name')
            .eq('id', product_id)
            .single();
          if (prod) productName = prod.name;
        }

        const formattedAmount = Number(amount).toFixed(2).replace('.', ',');
        const title = '💠 PIX gerado!';
        const message = `${customer.name} gerou um PIX de R$ ${formattedAmount}${notifSettings[0].show_product_name ? ` • ${productName}` : ''}`;

        await sendPushNotification(title, message);
      }
    } catch (notifErr) {
      console.error('Notification error (non-blocking):', notifErr);
    }

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
