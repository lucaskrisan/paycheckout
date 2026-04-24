import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

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
        JSON.stringify({ error: 'Too many attempts. Please wait a few minutes before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let STRIPE_SECRET_KEY: string | null = null;

    const body = await req.json();
    const {
      customer,
      product_id,
      coupon_id,
      config_id,
      bump_product_ids,
      checkout_url,
      utms,
      customer_country,
      payment_method_id, // NEW: stripe PM token from frontend Elements
      payment_intent_id, // NEW: when retrying after 3DS
    } = body;
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
    let productName = 'Product';
    let productCurrency = 'usd';
    let productIsSubscription = false;
    if (product_id) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('name, user_id, price, show_coupon, currency, is_subscription')
        .eq('id', product_id)
        .maybeSingle();
      if (prod) {
        productName = prod.name;
        productOwnerId = prod.user_id;
        productCurrency = (prod as any).currency === 'USD' ? 'usd' : 'brl';
        productIsSubscription = (prod as any).is_subscription === true;
        let serverPrice = prod.price;

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
                JSON.stringify({ error: 'Coupon usage limit reached.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            couponDiscount = couponData.discount_type === 'percent'
              ? serverPrice * (couponData.discount_value / 100)
              : couponData.discount_value;
          }
        }

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
        if (Math.abs(amount - validatedAmount) > 0.02) {
          console.warn(`[create-stripe-payment] Price mismatch: client=${amount}, server=${validatedAmount}`);
          return new Response(
            JSON.stringify({ error: 'Invalid amount. Please reload the page and try again.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Anti-fraud: blacklist
    {
      const cleanCpfCheck = customer.cpf?.replace(/\D/g, '') || '';
      const checks = [];
      if (customer.email) checks.push(supabaseAdmin.from('fraud_blacklist').select('id').eq('type', 'email').eq('value', customer.email.toLowerCase()).maybeSingle());
      if (cleanCpfCheck) checks.push(supabaseAdmin.from('fraud_blacklist').select('id').eq('type', 'cpf').eq('value', cleanCpfCheck).maybeSingle());
      const results = await Promise.all(checks);
      if (results.some(r => r.data)) {
        console.warn(`[create-stripe-payment] Blacklisted: ${customer.email}`);
        return new Response(
          JSON.stringify({ error: 'Unable to process this payment. Please contact support.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Anti-fraud: duplicate purchase (skip when retrying via payment_intent_id)
    if (!payment_intent_id && product_id && customer.email) {
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
          console.warn(`[create-stripe-payment] Duplicate purchase blocked: ${customer.email}`);
          return new Response(
            JSON.stringify({ error: 'Purchase already in progress. Please wait a few minutes.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Producer blocked check
    if (productOwnerId) {
      const { data: billingAccount } = await supabaseAdmin
        .from('billing_accounts')
        .select('blocked')
        .eq('user_id', productOwnerId)
        .maybeSingle();
      if (billingAccount?.blocked) {
        return new Response(
          JSON.stringify({ error: 'This checkout is temporarily unavailable.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Resolve Stripe secret key
    if (productOwnerId) {
      const { data: gw } = await supabaseAdmin
        .from('payment_gateways')
        .select('config')
        .eq('user_id', productOwnerId)
        .eq('provider', 'stripe')
        .eq('active', true)
        .maybeSingle();
      if (gw?.config && typeof gw.config === 'object') {
        const cfg = gw.config as any;
        STRIPE_SECRET_KEY = cfg.secret_key || cfg.api_key || cfg.sk || null;
      }
    }
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
        JSON.stringify({ error: 'Payment gateway not configured. The producer needs to set up Stripe.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert local customer
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

    // Platform fee
    const { data: platformSettings } = await supabaseAdmin
      .from('platform_settings')
      .select('platform_fee_percent')
      .limit(1)
      .maybeSingle();
    const feePercent = Number(platformSettings?.platform_fee_percent || 0);
    const feeAmount = Math.round(amount * feePercent) / 100;

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: customer.email, limit: 1 });
    let stripeCustomerId: string;
    if (customers.data.length > 0) {
      stripeCustomerId = customers.data[0].id;
    } else {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
      });
      stripeCustomerId = stripeCustomer.id;
    }

    // ─── Retry path: confirm an existing PaymentIntent (after 3DS) ───
    if (payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
      console.log(`[create-stripe-payment] Retrieved PI ${pi.id} status=${pi.status}`);
      return new Response(
        JSON.stringify({
          payment_intent_id: pi.id,
          client_secret: pi.client_secret,
          status: pi.status,
          requires_action: pi.status === 'requires_action',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── PaymentElement flow: create PI without confirming ───
    // When payment_method_id is provided, use legacy confirm=true flow
    // When absent, create unconfirmed PI for client-side PaymentElement confirmation
    const usePaymentElement = !payment_method_id;

    const piCreateParams: any = {
      amount: amountCents,
      currency: productCurrency,
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true, allow_redirects: 'as_needed' },
      ...(productIsSubscription ? { setup_future_usage: 'off_session' } : {}),
      description: productName,
      metadata: {
        product_id: product_id || '',
        customer_id: customerId,
        coupon_id: coupon_id || '',
        bump_product_ids: bump_product_ids?.length > 0 ? JSON.stringify(bump_product_ids) : '',
        customer_country: customer_country || '',
        ...(utms || {}),
      },
    };

    if (!usePaymentElement) {
      // Legacy CardElement flow: confirm immediately
      piCreateParams.payment_method = payment_method_id;
      piCreateParams.confirm = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(piCreateParams);

    console.log(`[create-stripe-payment] PI created: ${paymentIntent.id} status=${paymentIntent.status}`);

    // Save order with PI id as external_id
    const initialStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'pending';
    const { data: orderRow } = await supabaseAdmin
      .from('orders')
      .insert({
        amount,
        payment_method: 'credit_card',
        status: initialStatus,
        product_id: product_id || null,
        customer_id: customerId,
        user_id: productOwnerId,
        external_id: paymentIntent.id,
        customer_city: body.geo?.customer_city || null,
        customer_zip: body.geo?.customer_zip || null,
        customer_country: body.geo?.customer_country || null,
        platform_fee_percent: feePercent,
        platform_fee_amount: feeAmount,
        metadata: {
          gateway: 'stripe',
          coupon_id: coupon_id || null,
          checkout_url: checkout_url || null,
          bump_product_ids: (bump_product_ids && bump_product_ids.length > 0) ? bump_product_ids : null,
          ...(utms || {}),
        },
      })
      .select('id')
      .single();

    return new Response(
      JSON.stringify({
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
        requires_action: paymentIntent.status === 'requires_action',
        order_id: orderRow?.id,
        payment_id: paymentIntent.status === 'succeeded' ? paymentIntent.id : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // Stripe card errors → 400 with friendly message
    const msg = error?.raw?.message || error?.message || 'Payment failed';
    console.error('[create-stripe-payment] Error:', msg);
    const status = error?.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? 400 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
