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
    // --- Rate Limiting ---
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip') || 'unknown';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rlData } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: clientIp,
      p_action: 'create-stripe-payment',
      p_max_hits: 5,
      p_window_seconds: 300,
    });

    if (rlData === true) {
      console.warn(`[create-stripe-payment] Rate limited IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // API key will be resolved per-producer below
    let STRIPE_SECRET_KEY: string | null = null;

    // supabaseAdmin already created above for rate limiting

    const body = await req.json();
    const { customer, product_id, coupon_id, config_id, bump_product_ids, checkout_url, utms, payment_method, installments } = body;
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const amountCents = Math.round(amount * 100);

    if (!amount || !customer?.name || !customer?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product info and VALIDATE price server-side
    let productOwnerId: string | null = null;
    let productName = 'Produto';
    if (product_id) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('name, user_id, price, show_coupon')
        .eq('id', product_id)
        .maybeSingle();
      if (prod) {
        productName = prod.name;
        productOwnerId = prod.user_id;
        let serverPrice = prod.price;

        // Check if a config with custom price was used
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

        // Apply coupon if provided and allowed
        let couponDiscount = 0;
        if (coupon_id && prod.show_coupon !== false) {
          const { data: couponData } = await supabaseAdmin
            .from('coupons')
            .select('discount_type, discount_value, active, max_uses, used_count')
            .eq('id', coupon_id)
            .eq('active', true)
            .maybeSingle();
          if (couponData) {
            if (couponData.max_uses != null && couponData.used_count >= couponData.max_uses) {
              return new Response(
                JSON.stringify({ error: 'Cupom atingiu o limite de usos.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            couponDiscount = couponData.discount_type === 'percent'
              ? serverPrice * (couponData.discount_value / 100)
              : couponData.discount_value;
          }
        }

        // Calculate bump total server-side
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

        const validatedAmount = Math.round((Math.max(serverPrice - couponDiscount, 0) + bumpTotal) * 100) / 100;
        // Allow small rounding tolerance (R$ 0.02)
        if (Math.abs(amount - validatedAmount) > 0.02) {
          console.warn(`[create-stripe-payment] Price mismatch: client=${amount}, server=${validatedAmount} (product=${serverPrice}, coupon=${couponDiscount}, bumps=${bumpTotal})`);
          return new Response(
            JSON.stringify({ error: 'Valor inválido. Recarregue a página e tente novamente.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Anti-fraud: check blacklist (CPF + Email)
    {
      const cleanCpfCheck = customer.cpf?.replace(/\D/g, '') || '';
      const checks = [];
      if (customer.email) checks.push(supabaseAdmin.from('fraud_blacklist').select('id').eq('type', 'email').eq('value', customer.email.toLowerCase()).maybeSingle());
      if (cleanCpfCheck) checks.push(supabaseAdmin.from('fraud_blacklist').select('id').eq('type', 'cpf').eq('value', cleanCpfCheck).maybeSingle());
      const results = await Promise.all(checks);
      if (results.some(r => r.data)) {
        console.warn(`[create-stripe-payment] Blacklisted customer blocked: ${customer.email}`);
        return new Response(
          JSON.stringify({ error: 'Não foi possível processar este pagamento. Entre em contato com o suporte.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
          console.warn(`[create-stripe-payment] Duplicate purchase blocked: ${customer.email} for product ${product_id}`);
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

    // Resolve Stripe key from producer's gateway config
    if (productOwnerId) {
      const { data: gw } = await supabaseAdmin
        .from('payment_gateways')
        .select('config')
        .eq('user_id', productOwnerId)
        .eq('provider', 'stripe')
        .eq('active', true)
        .maybeSingle();
      if (gw?.config && typeof gw.config === 'object' && (gw.config as any).api_key) {
        STRIPE_SECRET_KEY = (gw.config as any).api_key;
      }
    }
    // Fallback to global env key ONLY for super_admin producers
    if (!STRIPE_SECRET_KEY && productOwnerId) {
      const { data: ownerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', productOwnerId)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (ownerRoles) {
        STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || null;
      }
    }
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gateway de pagamento não configurado. O produtor precisa configurar o Stripe.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert customer
    const cleanCpf = customer.cpf?.replace(/\D/g, '') || '';
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

    // Create or find Stripe customer
    const stripeHeaders = {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Search for existing Stripe customer
    const searchRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(customer.email)}'`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const searchData = await searchRes.json();
    await searchRes.text().catch(() => {});

    let stripeCustomerId: string;
    if (searchData.data?.length > 0) {
      stripeCustomerId = searchData.data[0].id;
    } else {
      const createCustRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: stripeHeaders,
        body: new URLSearchParams({
          email: customer.email,
          name: customer.name,
        }),
      });
      const custData = await createCustRes.json();
      stripeCustomerId = custData.id;
    }

    // Create PaymentIntent
    const piParams = new URLSearchParams({
      amount: String(amountCents),
      currency: 'brl',
      customer: stripeCustomerId,
      description: productName,
      'payment_method_types[]': 'card',
      'metadata[product_id]': product_id || '',
      'metadata[customer_id]': customerId,
    });

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: stripeHeaders,
      body: piParams,
    });
    const piData = await piRes.json();

    if (!piRes.ok) {
      console.error('[create-stripe-payment] Stripe error:', JSON.stringify(piData));
      return new Response(
        JSON.stringify({ error: 'Falha ao criar pagamento no Stripe', details: piData }),
        { status: piRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    await supabaseAdmin
      .from('orders')
      .insert({
        amount,
        payment_method: 'credit_card',
        status: 'pending',
        product_id: product_id || null,
        customer_id: customerId,
        user_id: productOwnerId,
        external_id: piData.id,
        platform_fee_percent: feePercent,
        platform_fee_amount: feeAmount,
        metadata: {
          gateway: 'stripe',
          coupon_id: coupon_id || null,
          checkout_url: checkout_url || null,
          client_secret: piData.client_secret,
          bump_product_ids: (bump_product_ids && bump_product_ids.length > 0) ? bump_product_ids : null,
          ...(utms || {}),
        },
      });

    return new Response(
      JSON.stringify({
        payment_id: piData.id,
        client_secret: piData.client_secret,
        status: piData.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-stripe-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
