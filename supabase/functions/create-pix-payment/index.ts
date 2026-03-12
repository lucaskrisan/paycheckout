import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function sendPushNotification(title: string, message: string, url?: string) {
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return;

  try {
    const payload: Record<string, unknown> = {
      app_id: appId,
      included_segments: ['Total Subscriptions'],
      target_channel: 'push',
      headings: { en: title },
      contents: { en: message },
      chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
    };
    if (url) payload.url = url;

    await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[create-pix-payment] OneSignal error:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-pix-payment] request received');

    const PAGARME_API_KEY = Deno.env.get('PAGARME_API_KEY');
    if (!PAGARME_API_KEY) throw new Error('PAGARME_API_KEY not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { amount, customer, product_id, coupon_id } = await req.json();

    if (!amount || !customer?.name || !customer?.email || !customer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email, cpf)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const cleanPhone = customer.phone?.replace(/\D/g, '') || '';

    // Get product info (for user_id / owner)
    let productOwnerId: string | null = null;
    let productName = 'Produto';
    if (product_id) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('name, user_id')
        .eq('id', product_id)
        .maybeSingle();
      if (prod) {
        productName = prod.name;
        productOwnerId = prod.user_id;
      }
    }

    // Upsert customer
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', customer.email)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabaseAdmin
        .from('customers')
        .update({ name: customer.name, phone: customer.phone, cpf: cleanCpf })
        .eq('id', customerId);
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert({ name: customer.name, email: customer.email, phone: customer.phone, cpf: cleanCpf, user_id: productOwnerId })
        .select('id')
        .single();
      customerId = newCustomer!.id;
    }

    // Call Pagar.me API
    const orderPayload = {
      items: [
        {
          amount: Math.round(amount * 100),
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
          pix: { expires_in: 1800 },
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
      console.error('[create-pix-payment] Pagar.me error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Payment creation failed', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const charge = data.charges?.[0];
    const lastTransaction = charge?.last_transaction;

    // Get platform fee
    const { data: platformSettings } = await supabaseAdmin
      .from('platform_settings')
      .select('platform_fee_percent')
      .limit(1)
      .maybeSingle();
    const feePercent = Number(platformSettings?.platform_fee_percent || 0);
    const feeAmount = Math.round(amount * feePercent) / 100;

    // Save order to database
    const { data: orderRecord, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        amount,
        payment_method: 'pix',
        status: 'pending',
        product_id: product_id || null,
        customer_id: customerId,
        user_id: productOwnerId,
        external_id: data.id,
        platform_fee_percent: feePercent,
        platform_fee_amount: feeAmount,
        metadata: {
          gateway: 'pagarme',
          coupon_id: coupon_id || null,
        },
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('[create-pix-payment] Order save error:', orderError);
    } else {
      console.log('[create-pix-payment] Order saved:', orderRecord.id);
    }

    // Increment coupon usage
    if (coupon_id) {
      const { data: couponData } = await supabaseAdmin
        .from('coupons')
        .select('used_count')
        .eq('id', coupon_id)
        .single();
      if (couponData) {
        await supabaseAdmin
          .from('coupons')
          .update({ used_count: couponData.used_count + 1 })
          .eq('id', coupon_id);
      }
    }

    // Push notification
    try {
      const { data: notifSettings } = await supabaseAdmin
        .from('notification_settings')
        .select('send_pending, show_product_name')
        .eq('send_pending', true);

      if (notifSettings && notifSettings.length > 0) {
        const showProductName = notifSettings.some((s) => s.show_product_name);
        const formattedAmount = Number(amount).toFixed(2).replace('.', ',');
        const title = '💠 PIX gerado!';
        const message = `${customer.name} gerou um PIX de R$ ${formattedAmount}${showProductName ? ` • ${productName}` : ''}`;
        await sendPushNotification(title, message, 'https://paycheckout.lovable.app/admin/orders');
      }
    } catch (notifErr) {
      console.error('[create-pix-payment] Notification error:', notifErr);
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
    console.error('[create-pix-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
