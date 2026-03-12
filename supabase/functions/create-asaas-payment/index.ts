import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    console.error('[create-asaas-payment] OneSignal error:', err);
  }
}

const BILLING_CYCLE_MAP: Record<string, string> = {
  weekly: 'WEEKLY',
  biweekly: 'BIWEEKLY',
  monthly: 'MONTHLY',
  quarterly: 'QUARTERLY',
  semiannually: 'SEMIANNUALLY',
  yearly: 'YEARLY',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { amount, customer, payment_method, installments, product_id, is_subscription, billing_cycle, coupon_id } = await req.json();

    if (!amount || !customer?.name || !customer?.email || !customer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email, cpf)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product info and VALIDATE price server-side
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

        // Check if a config with custom price was used
        const configId = (await req.clone().json()).config_id;
        if (configId) {
          const { data: config } = await supabaseAdmin
            .from('checkout_builder_configs')
            .select('price')
            .eq('id', configId)
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

        const validatedAmount = Math.max(serverPrice - couponDiscount, 0);
        // Allow small rounding tolerance (R$ 0.02)
        if (Math.abs(amount - validatedAmount) > 0.02) {
          console.warn(`[create-asaas-payment] Price mismatch: client=${amount}, server=${validatedAmount}`);
          return new Response(
            JSON.stringify({ error: 'Valor inválido. Recarregue a página e tente novamente.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
        .update({ name: customer.name, phone: customer.phone, cpf: customer.cpf.replace(/\D/g, '') })
        .eq('id', customerId);
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert({ name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf.replace(/\D/g, ''), user_id: productOwnerId })
        .select('id')
        .single();
      customerId = newCustomer!.id;
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');

    const { data: gatewayData } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, environment')
      .eq('provider', 'asaas')
      .eq('active', true)
      .limit(1)
      .single();

    const gateway_config = gatewayData?.config as Record<string, any> || {};
    const environment = gatewayData?.environment || 'sandbox';

    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Create or find customer in Asaas
    const customerPayload = {
      name: customer.name,
      email: customer.email,
      cpfCnpj: cleanCpf,
      mobilePhone: customer.phone?.replace(/\D/g, '') || undefined,
    };

    const customerRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
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

    // Platform fee
    const { data: platformSettings } = await supabaseAdmin
      .from('platform_settings')
      .select('platform_fee_percent')
      .limit(1)
      .maybeSingle();
    const feePercent = Number(platformSettings?.platform_fee_percent || 0);
    const feeAmount = Math.round(amount * feePercent) / 100;

    // Helper to save order
    const saveOrder = async (externalId: string, status: string, method: string) => {
      const { data: orderRecord, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          amount,
          payment_method: method,
          status,
          product_id: product_id || null,
          customer_id: customerId,
          user_id: productOwnerId,
          external_id: externalId,
          platform_fee_percent: feePercent,
          platform_fee_amount: feeAmount,
          metadata: {
            gateway: 'asaas',
            coupon_id: coupon_id || null,
            installments: installments || '1',
          },
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('[create-asaas-payment] Order save error:', orderError);
      } else {
        console.log('[create-asaas-payment] Order saved:', orderRecord.id);
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
    };

    // SUBSCRIPTION
    if (is_subscription) {
      const cycle = BILLING_CYCLE_MAP[billing_cycle || 'monthly'] || 'MONTHLY';
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 1);

      const subscriptionPayload: any = {
        customer: customerData.id,
        billingType: 'CREDIT_CARD',
        value: amount,
        cycle,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        description: gateway_config.billing_description || 'Assinatura',
      };

      if (customer.creditCard) {
        subscriptionPayload.creditCard = customer.creditCard;
        subscriptionPayload.creditCardHolderInfo = {
          name: customer.name,
          email: customer.email,
          cpfCnpj: cleanCpf,
          phone: customer.phone?.replace(/\D/g, '') || '',
          postalCode: customer.postalCode || '00000000',
          addressNumber: customer.addressNumber || '0',
        };
      }

      const subRes = await fetch(`${baseUrl}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify(subscriptionPayload),
      });

      const subData = await subRes.json();

      if (!subRes.ok) {
        console.error('Asaas subscription error:', JSON.stringify(subData));
        return new Response(
          JSON.stringify({ error: 'Subscription creation failed', details: subData }),
          { status: subRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = subData.status === 'ACTIVE' ? 'approved' : 'pending';
      await saveOrder(subData.id, status, 'credit_card');

      if (subData.status === 'ACTIVE') {
        try {
          const { data: notifSettings } = await supabaseAdmin
            .from('notification_settings')
            .select('send_approved, show_product_name')
            .eq('send_approved', true);

          if (notifSettings && notifSettings.length > 0) {
            const formattedAmount = Number(amount).toFixed(2).replace('.', ',');
            const title = '🔄 Nova assinatura!';
            const showProductName = notifSettings.some((s) => s.show_product_name);
            const message = `${customer.name} • 💳 R$ ${formattedAmount}/mês${showProductName ? ` • ${productName}` : ''}`;
            await sendPushNotification(title, message, 'https://paycheckout.lovable.app/admin/orders');
          }
        } catch (notifErr) {
          console.error('[create-asaas-payment] Notification error:', notifErr);
        }
      }

      return new Response(
        JSON.stringify({
          subscription_id: subData.id,
          status: subData.status,
          payment_id: subData.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ONE-TIME PAYMENT
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
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
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

    // Map Asaas status
    const statusMap: Record<string, string> = {
      CONFIRMED: 'approved',
      RECEIVED: 'approved',
      PENDING: 'pending',
      OVERDUE: 'pending',
      REFUNDED: 'refunded',
      REFUND_REQUESTED: 'refunded',
    };
    const orderStatus = statusMap[paymentData.status] || 'pending';

    await saveOrder(paymentData.id, orderStatus, payment_method || 'credit_card');

    // Push notification on confirmed card
    if (payment_method === 'credit_card' && (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED')) {
      try {
        const { data: notifSettings } = await supabaseAdmin
          .from('notification_settings')
          .select('send_approved, show_product_name')
          .eq('send_approved', true);

        if (notifSettings && notifSettings.length > 0) {
          const formattedAmount = Number(amount).toFixed(2).replace('.', ',');
          const showProductName = notifSettings.some((s) => s.show_product_name);
          const title = '💰 Venda aprovada!';
          const message = `${customer.name} • 💳 Cartão R$ ${formattedAmount}${showProductName ? ` • ${productName}` : ''}`;
          await sendPushNotification(title, message, 'https://paycheckout.lovable.app/admin/orders');
        }
      } catch (notifErr) {
        console.error('[create-asaas-payment] Notification error:', notifErr);
      }
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
