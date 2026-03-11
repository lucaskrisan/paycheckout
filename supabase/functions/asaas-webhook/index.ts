import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, url?: string) {
  const apiKey = Deno.env.get('PUSHALERT_API_KEY');
  if (!apiKey) {
    console.warn('PUSHALERT_API_KEY not configured, skipping notification');
    return;
  }

  try {
    const body: Record<string, string> = {
      title,
      message,
    };
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
    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    console.log('Asaas webhook event:', event, 'payment:', payment?.id);

    if (!payment?.id) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let status = 'pending';
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      status = 'paid';
    } else if (event === 'PAYMENT_OVERDUE') {
      status = 'overdue';
    } else if (event === 'PAYMENT_REFUNDED') {
      status = 'refunded';
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_RESTORED') {
      status = event === 'PAYMENT_DELETED' ? 'cancelled' : 'pending';
    }

    // Update order by external_id
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', payment.id)
      .select('amount, payment_method, product_id, customer_id')
      .maybeSingle();

    if (error) {
      console.error('Error updating order:', error);
    }

    // Send push notification on confirmed sale
    if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && orderData) {
      const amount = Number(orderData.amount).toFixed(2).replace('.', ',');
      const method = orderData.payment_method === 'pix' ? '💠 PIX' : '💳 Cartão';

      // Try to get product name and customer name
      let productName = 'Produto';
      let customerName = '';

      if (orderData.product_id) {
        const { data: prod } = await supabase
          .from('products')
          .select('name')
          .eq('id', orderData.product_id)
          .single();
        if (prod) productName = prod.name;
      }

      if (orderData.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('name')
          .eq('id', orderData.customer_id)
          .single();
        if (cust) customerName = cust.name;
      }

      const title = `💰 Nova venda confirmada!`;
      const message = `${customerName ? customerName + ' comprou ' : ''}${productName}\n${method} • R$ ${amount}`;

      await sendPushNotification(title, message);
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
