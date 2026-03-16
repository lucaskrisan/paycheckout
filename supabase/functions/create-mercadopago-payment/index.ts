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
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { customer, product_id, coupon_id, config_id, bump_product_ids, checkout_url, utms, payment_method } = body;
    const amount = Math.round(Number(body.amount) * 100) / 100;

    if (!amount || !customer?.name || !customer?.email || !customer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email, cpf)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');

    // Get product info and validate price server-side
    let productOwnerId: string | null = null;
    let productName = 'Produto';
    let serverPrice = amount;
    if (product_id) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('name, user_id, price, show_coupon')
        .eq('id', product_id)
        .maybeSingle();
      if (prod) {
        productName = prod.name;
        productOwnerId = prod.user_id;
        serverPrice = prod.price;

        if (config_id) {
          const { data: config } = await supabaseAdmin
            .from('checkout_builder_configs')
            .select('price')
            .eq('id', config_id)
            .eq('product_id', product_id)
            .maybeSingle();
          if (config?.price != null && config.price > 0) {
            serverPrice = config.price;
          }
        }

        // PIX discount
        const isPix = payment_method === 'pix';
        const pixDiscount = isPix ? Math.round(serverPrice * 0.05 * 100) / 100 : 0;
        const basePrice = serverPrice - pixDiscount;

        // Coupon
        let couponDiscount = 0;
        if (coupon_id && prod.show_coupon !== false) {
          const { data: couponData } = await supabaseAdmin
            .from('coupons')
            .select('discount_type, discount_value, active')
            .eq('id', coupon_id)
            .eq('active', true)
            .maybeSingle();
          if (couponData) {
            couponDiscount = couponData.discount_type === 'percent'
              ? serverPrice * (couponData.discount_value / 100)
              : couponData.discount_value;
          }
        }

        // Bumps
        let bumpTotal = 0;
        if (bump_product_ids && Array.isArray(bump_product_ids) && bump_product_ids.length > 0) {
          const { data: bumpProducts } = await supabaseAdmin
            .from('products')
            .select('price')
            .in('id', bump_product_ids)
            .eq('active', true);
          if (bumpProducts) {
            bumpTotal = bumpProducts.reduce((sum: number, bp: any) => sum + Number(bp.price), 0);
          }
        }

        const validatedAmount = Math.round((Math.max(basePrice - couponDiscount, 0) + bumpTotal) * 100) / 100;
        if (Math.abs(amount - validatedAmount) > 0.02) {
          return new Response(
            JSON.stringify({ error: 'Valor inválido. Recarregue a página e tente novamente.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Anti-fraud: detect duplicate purchase (same email + product in last 5 min)
    if (product_id && customer.email) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentOrder } = await supabaseAdmin
        .from('orders')
        .select('id, status, customer_id')
        .eq('product_id', product_id)
        .in('status', ['pending', 'paid', 'approved'])
        .gte('created_at', fiveMinAgo)
        .limit(1);

      if (recentOrder && recentOrder.length > 0) {
        const { data: recentCustomer } = await supabaseAdmin
          .from('customers')
          .select('email')
          .eq('id', recentOrder[0].customer_id)
          .maybeSingle();

        if (recentCustomer?.email?.toLowerCase() === customer.email.toLowerCase()) {
          console.warn(`[create-mercadopago-payment] Duplicate purchase blocked: ${customer.email} for product ${product_id}`);
          return new Response(
            JSON.stringify({ error: 'Compra já em processamento. Aguarde alguns minutos antes de tentar novamente.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check if producer is blocked
    if (productOwnerId) {
      const { data: billingAccount } = await supabaseAdmin
        .from('billing_accounts')
        .select('blocked')
        .eq('user_id', productOwnerId)
        .maybeSingle();
      if (billingAccount?.blocked) {
        return new Response(
          JSON.stringify({ error: 'Este checkout está temporariamente indisponível. O produtor precisa regularizar sua conta.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

    // Create Mercado Pago payment
    const mpPayload: any = {
      transaction_amount: amount,
      description: productName,
      payment_method_id: 'pix',
      payer: {
        email: customer.email,
        first_name: customer.name.split(' ')[0],
        last_name: customer.name.split(' ').slice(1).join(' ') || customer.name.split(' ')[0],
        identification: {
          type: 'CPF',
          number: cleanCpf,
        },
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[create-mercadopago-payment] MP error:', JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: 'Falha ao criar pagamento no Mercado Pago', details: mpData }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Platform fee
    const { data: platformSettings } = await supabaseAdmin
      .from('platform_settings')
      .select('platform_fee_percent')
      .limit(1)
      .maybeSingle();
    const feePercent = Number(platformSettings?.platform_fee_percent || 0);
    const feeAmount = Math.round(amount * feePercent) / 100;

    // Save order
    const { data: orderRecord } = await supabaseAdmin
      .from('orders')
      .insert({
        amount,
        payment_method: 'pix',
        status: 'pending',
        product_id: product_id || null,
        customer_id: customerId,
        user_id: productOwnerId,
        external_id: String(mpData.id),
        platform_fee_percent: feePercent,
        platform_fee_amount: feeAmount,
        metadata: {
          gateway: 'mercadopago',
          coupon_id: coupon_id || null,
          checkout_url: checkout_url || null,
          bump_product_ids: (bump_product_ids && bump_product_ids.length > 0) ? bump_product_ids : null,
          ...(utms || {}),
        },
      })
      .select('id')
      .single();

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

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;

    return new Response(
      JSON.stringify({
        order_id: String(mpData.id),
        status: mpData.status,
        qr_code: qrCode,
        qr_code_url: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
        expires_at: mpData.date_of_expiration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-mercadopago-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
