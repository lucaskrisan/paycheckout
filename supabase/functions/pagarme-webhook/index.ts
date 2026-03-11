import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendPushNotification(title: string, message: string, url?: string) {
  const apiKey = Deno.env.get('PUSHALERT_API_KEY');
  if (!apiKey) {
    console.warn('[pagarme-webhook] PUSHALERT_API_KEY not configured, skipping notification');
    return;
  }

  const body = new URLSearchParams();
  body.set('title', title);
  body.set('message', message);
  body.set('icon', 'https://paycheckout.lovable.app/pwa-192x192.png');
  if (url) body.set('url', url);

  try {
    const response = await fetch('https://api.pushalert.co/rest/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `api_key=${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const raw = await response.text();
    console.log('[pagarme-webhook] PushAlert response:', { status: response.status, body: raw });
  } catch (err) {
    console.error('[pagarme-webhook] PushAlert error:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[pagarme-webhook] received event type:', payload.type);

    // Pagar.me v5 webhook format: { id, type, data: { id, status, charges, ... } }
    const eventType = payload.type;
    const order = payload.data;

    if (!order?.id) {
      console.log('[pagarme-webhook] No order id in payload, skipping');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let status = 'pending';
    if (eventType === 'order.paid') {
      status = 'paid';
    } else if (eventType === 'order.payment_failed') {
      status = 'failed';
    } else if (eventType === 'order.canceled') {
      status = 'cancelled';
    } else if (eventType === 'charge.paid') {
      status = 'paid';
    } else if (eventType === 'charge.refunded') {
      status = 'refunded';
    }

    // Try to match by Pagar.me order id stored as external_id
    const externalId = order.id;
    const { data: orderData, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('external_id', externalId)
      .select('amount, payment_method, product_id, customer_id')
      .maybeSingle();

    if (error) {
      console.error('[pagarme-webhook] Error updating order:', error);
    }

    console.log('[pagarme-webhook] Order updated:', { externalId, status, found: !!orderData });

    // Send push notification on confirmed PIX sale
    if (status === 'paid' && orderData) {
      try {
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('send_approved, show_product_name')
          .eq('send_approved', true);

        console.log('[pagarme-webhook] send_approved users:', notifSettings?.length || 0);

        if (notifSettings && notifSettings.length > 0) {
          const amount = Number(orderData.amount).toFixed(2).replace('.', ',');
          const method = orderData.payment_method === 'pix' ? '💠 PIX' : '💳 Cartão';

          let productName = 'Produto';
          let customerName = '';

          if (orderData.product_id) {
            const { data: prod } = await supabase
              .from('products')
              .select('name')
              .eq('id', orderData.product_id)
              .maybeSingle();
            if (prod) productName = prod.name;
          }

          if (orderData.customer_id) {
            const { data: cust } = await supabase
              .from('customers')
              .select('name')
              .eq('id', orderData.customer_id)
              .maybeSingle();
            if (cust) customerName = cust.name;
          }

          const showProductName = notifSettings.some((s) => s.show_product_name);
          const title = '💰 Nova venda confirmada!';
          const message = `${customerName || 'Cliente'} • ${method} R$ ${amount}${showProductName ? ` • ${productName}` : ''}`;

          await sendPushNotification(title, message, 'https://paycheckout.lovable.app/admin/orders');
        }
      } catch (notifErr) {
        console.error('[pagarme-webhook] Notification error (non-blocking):', notifErr);
      }
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[pagarme-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
