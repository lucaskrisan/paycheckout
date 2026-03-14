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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { order_id, upsell_product_id } = await req.json();

    if (!order_id || !upsell_product_id) {
      return new Response(
        JSON.stringify({ error: 'Missing order_id or upsell_product_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get original order
    const { data: originalOrder, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, user_id, product_id, external_id, payment_method, metadata, status')
      .eq('id', order_id)
      .single();

    if (orderErr || !originalOrder) {
      return new Response(
        JSON.stringify({ error: 'Pedido original não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (originalOrder.status !== 'paid' && originalOrder.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Pedido original não está aprovado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (originalOrder.payment_method !== 'credit_card') {
      return new Response(
        JSON.stringify({ error: 'Upsell one-click disponível apenas para pagamentos com cartão' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Asaas customer ID from original order metadata
    const metadata = originalOrder.metadata as Record<string, any> || {};
    const asaasCustomerId = metadata.asaas_customer_id;
    const creditCardToken = metadata.credit_card_token;

    if (!asaasCustomerId || !creditCardToken) {
      return new Response(
        JSON.stringify({ error: 'Dados do cartão não disponíveis para compra com 1 clique. Por favor, realize uma nova compra.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get upsell product
    const { data: upsellProduct } = await supabaseAdmin
      .from('products')
      .select('id, name, price, user_id')
      .eq('id', upsell_product_id)
      .eq('active', true)
      .single();

    if (!upsellProduct) {
      return new Response(
        JSON.stringify({ error: 'Produto de upsell não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for upsell discount
    const { data: upsellOffer } = await supabaseAdmin
      .from('upsell_offers')
      .select('discount_percent')
      .eq('product_id', originalOrder.product_id)
      .eq('upsell_product_id', upsell_product_id)
      .eq('active', true)
      .maybeSingle();

    const discountPercent = upsellOffer?.discount_percent || 0;
    const originalPrice = upsellProduct.price;
    const finalPrice = Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100;

    // Get Asaas API key & environment
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY not configured');

    const { data: gatewayData } = await supabaseAdmin
      .from('payment_gateways')
      .select('environment')
      .eq('provider', 'asaas')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    const environment = gatewayData?.environment || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Create payment using stored card token
    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: finalPrice,
      dueDate: new Date().toISOString().split('T')[0],
      description: `Upsell: ${upsellProduct.name}`,
      creditCardToken: creditCardToken,
    };

    console.log('[process-upsell] Creating Asaas payment for upsell:', {
      customer: asaasCustomerId,
      value: finalPrice,
      product: upsellProduct.name,
    });

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      console.error('[process-upsell] Asaas payment error:', JSON.stringify(paymentData));
      return new Response(
        JSON.stringify({ error: 'Falha ao processar pagamento do upsell', details: paymentData }),
        { status: paymentRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusMap: Record<string, string> = {
      CONFIRMED: 'approved',
      RECEIVED: 'approved',
      PENDING: 'pending',
    };
    const orderStatus = statusMap[paymentData.status] || 'pending';

    // Platform fee
    const { data: platformSettings } = await supabaseAdmin
      .from('platform_settings')
      .select('platform_fee_percent')
      .limit(1)
      .maybeSingle();
    const feePercent = Number(platformSettings?.platform_fee_percent || 0);
    const feeAmount = Math.round(finalPrice * feePercent) / 100;

    // Save upsell order
    const { data: upsellOrder, error: upsellOrderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        amount: finalPrice,
        payment_method: 'credit_card',
        status: orderStatus,
        product_id: upsellProduct.id,
        customer_id: originalOrder.customer_id,
        user_id: originalOrder.user_id,
        external_id: paymentData.id,
        platform_fee_percent: feePercent,
        platform_fee_amount: feeAmount,
        metadata: {
          gateway: 'asaas',
          upsell: true,
          original_order_id: originalOrder.id,
          asaas_customer_id: asaasCustomerId,
        },
      })
      .select('id')
      .single();

    if (upsellOrderErr) {
      console.error('[process-upsell] Order save error:', upsellOrderErr);
    }

    console.log('[process-upsell] Upsell order created:', {
      orderId: upsellOrder?.id,
      status: orderStatus,
      amount: finalPrice,
    });

    // Fire webhooks (non-blocking)
    if (upsellOrder?.id && originalOrder.user_id && orderStatus === 'approved') {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ event: 'order.paid', order_id: upsellOrder.id, user_id: originalOrder.user_id }),
      }).catch(err => console.error('[process-upsell] fire-webhooks error:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: upsellOrder?.id,
        payment_id: paymentData.id,
        status: orderStatus,
        amount: finalPrice,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[process-upsell] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
