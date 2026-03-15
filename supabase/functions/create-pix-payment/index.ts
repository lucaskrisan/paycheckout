import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function sendPushNotification(title: string, message: string, url?: string, iconUrl?: string) {
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
      chrome_web_icon: iconUrl || 'https://paycheckout.lovable.app/pwa-192x192.png',
    };
    if (url) payload.url = url;

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    console.log('[create-pix-payment] OneSignal response:', { status: response.status, body: raw });
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

    const body = await req.json();
    const { customer, product_id, coupon_id, config_id, bump_product_ids, checkout_url, utms } = body;
    // Round amount to 2 decimal places to prevent floating point issues
    const amount = Math.round(Number(body.amount) * 100) / 100;

    if (!amount || !customer?.name || !customer?.email || !customer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer (name, email, cpf)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const cleanPhone = customer.phone?.replace(/\D/g, '') || '';

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

        // Apply PIX discount (5%) with proper rounding
        const pixDiscount = Math.round(serverPrice * 0.05 * 100) / 100;
        const pixPrice = serverPrice - pixDiscount;

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

        const validatedAmount = Math.round((Math.max(pixPrice - couponDiscount, 0) + bumpTotal) * 100) / 100;
        // Allow small rounding tolerance (R$ 0.02)
        if (Math.abs(amount - validatedAmount) > 0.02) {
          console.warn(`[create-pix-payment] Price mismatch: client=${amount}, server=${validatedAmount} (product=${pixPrice}, coupon=${couponDiscount}, bumps=${bumpTotal})`);
          return new Response(
            JSON.stringify({ error: 'Valor inválido. Recarregue a página e tente novamente.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check if producer is blocked (billing limit exceeded)
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

    // Check if Pagar.me order failed (e.g. invalid CPF, fraud check)
    if (data.status === 'failed') {
      const failReason = data.charges?.[0]?.last_transaction?.gateway_response?.errors?.[0]?.message
        || data.charges?.[0]?.last_transaction?.status
        || 'Falha no processamento';
      console.error('[create-pix-payment] Pagar.me order failed:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: `Falha ao gerar o PIX: ${failReason}. Verifique seus dados e tente novamente.` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          checkout_url: checkout_url || null,
          bump_product_ids: (bump_product_ids && bump_product_ids.length > 0) ? bump_product_ids : null,
          ...(utms || {}),
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

    // Send PIX email to customer via Resend
    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (RESEND_API_KEY && lastTransaction?.qr_code_url) {
        const formattedAmount = Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const expiresAt = lastTransaction.expires_at
          ? new Date(lastTransaction.expires_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          : '30 minutos';
        const pixCode = lastTransaction.qr_code || '';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">💠 Seu PIX foi gerado!</h1>
              </div>
              <div style="padding:32px 40px;">
                <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 8px;">
                  Olá <strong>${customer.name.split(' ')[0]}</strong>,
                </p>
                <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
                  Seu pagamento de <strong>${formattedAmount}</strong> para <strong>${productName}</strong> está quase concluído! Escaneie o QR Code abaixo ou copie o código PIX para finalizar:
                </p>
                <div style="text-align:center;margin:24px 0;">
                  <img src="${lastTransaction.qr_code_url}" alt="QR Code PIX" style="width:220px;height:220px;border-radius:12px;border:2px solid #e5e7eb;" />
                </div>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
                  <p style="color:#6b7280;font-size:12px;margin:0 0 8px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">Código PIX (Copia e Cola)</p>
                  <p style="color:#111827;font-size:13px;margin:0;word-break:break-all;font-family:monospace;line-height:1.5;">${pixCode}</p>
                </div>
                <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:20px 0;">
                  <p style="color:#92400e;font-size:14px;margin:0;font-weight:500;">
                    ⏰ <strong>Atenção:</strong> Este PIX expira em <strong>${expiresAt}</strong>. Pague antes do vencimento para garantir sua compra!
                  </p>
                </div>
                <div style="text-align:center;margin:28px 0 0;">
                  <p style="color:#6b7280;font-size:13px;margin:0;">
                    Após o pagamento, você receberá a confirmação automaticamente. 🎉
                  </p>
                </div>
              </div>
              <div style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">
                  Este é um email automático. Não responda a esta mensagem.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PayCheckout <noreply@paolasemfiltro.com>',
            to: [customer.email],
            subject: `💠 Seu PIX de ${formattedAmount} foi gerado — finalize agora!`,
            html: emailHtml,
          }),
        });

        const resendData = await resendRes.json();
        // Log email
        try {
          await supabaseAdmin.from('email_logs').insert({
            user_id: productOwnerId,
            to_email: customer.email,
            to_name: customer.name,
            subject: `💠 Seu PIX de ${formattedAmount} foi gerado — finalize agora!`,
            html_body: emailHtml,
            email_type: 'pix_generated',
            status: resendRes.ok ? 'sent' : 'failed',
            resend_id: resendData?.id || null,
            order_id: orderRecord?.id || null,
            customer_id: customerId,
            product_id: product_id || null,
            source: 'create-pix-payment',
          });
        } catch (logErr) {
          console.error('[create-pix-payment] Email log error:', logErr);
        }

        if (!resendRes.ok) {
          console.error('[create-pix-payment] Resend error:', resendData);
        } else {
          console.log('[create-pix-payment] PIX email sent to', customer.email);
        }
      }
    } catch (emailErr) {
      console.error('[create-pix-payment] Email error:', emailErr);
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
