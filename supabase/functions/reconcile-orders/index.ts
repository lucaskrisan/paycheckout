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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth: verify caller is admin via auth header
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const PAGARME_API_KEY = Deno.env.get('PAGARME_API_KEY');
    if (!PAGARME_API_KEY) {
      return new Response(JSON.stringify({ error: 'PAGARME_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all pending orders with external_id (Pagar.me orders)
    // Default window: 30 days; can be overridden with body.hours_back (max 90 days)
    let hoursBack = 24 * 30;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        const inputHours = Number(body?.hours_back);
        if (Number.isFinite(inputHours) && inputHours > 0 && inputHours <= 24 * 90) {
          hoursBack = inputHours;
        }
      } catch {
        // Ignore invalid/empty body and keep default
      }
    }

    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const { data: pendingOrders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, external_id, amount, product_id, customer_id, user_id, metadata, payment_method')
      .eq('status', 'pending')
      .gte('created_at', since)
      .not('external_id', 'is', null);

    if (fetchErr) {
      console.error('[reconcile] Error fetching pending orders:', fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(JSON.stringify({ reconciled: 0, message: 'No pending orders to reconcile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[reconcile] Checking ${pendingOrders.length} pending orders against Pagar.me`);

    const results: { order_id: string; external_id: string; pagarme_status: string; action: string; customer?: string }[] = [];

    for (const order of pendingOrders) {
      if (!order.external_id) continue;

      try {
        // Query Pagar.me API for order status
        const pagarmeRes = await fetch(`https://api.pagar.me/core/v5/orders/${order.external_id}`, {
          headers: {
            'Authorization': `Basic ${btoa(PAGARME_API_KEY + ':')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!pagarmeRes.ok) {
          console.log(`[reconcile] Pagar.me API error for ${order.external_id}: ${pagarmeRes.status}`);
          results.push({ order_id: order.id, external_id: order.external_id, pagarme_status: 'api_error', action: 'skipped' });
          continue;
        }

        const pagarmeOrder = await pagarmeRes.json();
        const pagarmeStatus = pagarmeOrder.status;

        console.log(`[reconcile] ${order.external_id}: Pagar.me=${pagarmeStatus}, PayCheckout=pending`);

        // Get customer name for logging
        let customerName = '';
        if (order.customer_id) {
          const { data: cust } = await supabase
            .from('customers')
            .select('name')
            .eq('id', order.customer_id)
            .single();
          if (cust) customerName = cust.name;
        }

        if (pagarmeStatus === 'paid') {
          // This order was paid but webhook missed it - update!
          const { error: updateErr } = await supabase
            .from('orders')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', order.id);

          if (updateErr) {
            console.error(`[reconcile] Failed to update ${order.id}:`, updateErr);
            results.push({ order_id: order.id, external_id: order.external_id, pagarme_status: 'paid', action: 'update_failed', customer: customerName });
          } else {
            console.log(`[reconcile] ✅ Updated ${order.id} to PAID (${customerName})`);
            results.push({ order_id: order.id, external_id: order.external_id, pagarme_status: 'paid', action: 'updated_to_paid', customer: customerName });

            // Fire CAPI Purchase fallback (same logic as webhook)
            try {
              const { data: purchaseExists } = await supabase
                .from('pixel_events')
                .select('id')
                .eq('product_id', order.product_id)
                .eq('event_name', 'Purchase')
                .like('event_id', `%${order.external_id}%`)
                .limit(1);

              if (!purchaseExists || purchaseExists.length === 0) {
                const { data: custData } = await supabase
                  .from('customers')
                  .select('name, email, phone, cpf')
                  .eq('id', order.customer_id)
                  .single();

                if (custData) {
                  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-capi`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({
                      product_id: order.product_id,
                      event_name: 'Purchase',
                      event_id: `Purchase_reconcile_${order.external_id}`,
                      event_source_url: `https://paycheckout.lovable.app/checkout/${order.product_id}`,
                      customer: { name: custData.name, email: custData.email, phone: custData.phone, cpf: custData.cpf },
                      custom_data: { value: Number(order.amount), currency: 'BRL', content_type: 'product', order_id: order.id },
                      log_browser: true,
                    }),
                  });
                  console.log(`[reconcile] CAPI Purchase fired for ${customerName}`);
                }
              }
            } catch (capiErr) {
              console.error('[reconcile] CAPI error:', capiErr);
            }

            // Fire member access + email (trigger webhook handler)
            try {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fire-webhooks`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ event: 'order.paid', order_id: order.id, user_id: order.user_id }),
              });
            } catch (whErr) {
              console.error('[reconcile] Webhook fire error:', whErr);
            }
          }
        } else if (pagarmeStatus === 'canceled' || pagarmeStatus === 'failed') {
          // Update to reflect actual status
          const mappedStatus = pagarmeStatus === 'canceled' ? 'cancelled' : 'failed';
          await supabase
            .from('orders')
            .update({ status: mappedStatus, updated_at: new Date().toISOString() })
            .eq('id', order.id);
          results.push({ order_id: order.id, external_id: order.external_id, pagarme_status: pagarmeStatus, action: `updated_to_${mappedStatus}`, customer: customerName });
        } else {
          results.push({ order_id: order.id, external_id: order.external_id, pagarme_status: pagarmeStatus, action: 'no_change', customer: customerName });
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (apiErr) {
        console.error(`[reconcile] Error checking ${order.external_id}:`, apiErr);
        results.push({ order_id: order.id, external_id: order.external_id, pagarme_status: 'error', action: 'error' });
      }
    }

    const reconciled = results.filter(r => r.action === 'updated_to_paid').length;
    console.log(`[reconcile] Done. Reconciled: ${reconciled}/${pendingOrders.length}`);

    return new Response(JSON.stringify({ 
      total_checked: pendingOrders.length, 
      reconciled, 
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[reconcile] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
