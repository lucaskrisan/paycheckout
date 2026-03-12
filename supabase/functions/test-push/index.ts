const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!appId || !apiKey) {
      return new Response(JSON.stringify({ error: 'OneSignal not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      app_id: appId,
      included_segments: ['Total Subscriptions'],
      target_channel: 'push',
      headings: { en: '🎉 Ka-ching! Mais uma venda!' },
      contents: { en: 'João Silva • 💠 PIX R$ 197,00 • Curso Premium' },
      chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
      url: 'https://paycheckout.lovable.app/admin/orders',
    };

    console.log('[test-push] Sending notification...');
    console.log('[test-push] API Key prefix:', apiKey.substring(0, 15) + '...');

    // Try new API format first (Key auth)
    let response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data = await response.json();
    console.log('[test-push] New API response:', response.status, JSON.stringify(data));

    // If new API fails, try legacy API format (Basic auth)
    if (data.errors || response.status !== 200) {
      console.log('[test-push] Trying legacy API format...');
      
      // Try with "Subscribed Users" segment
      const legacyPayload = {
        ...payload,
        included_segments: ['Subscribed Users'],
      };
      delete (legacyPayload as any).target_channel;

      response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(legacyPayload),
      });

      data = await response.json();
      console.log('[test-push] Legacy API response:', response.status, JSON.stringify(data));
    }

    // Debug: list players/subscriptions
    if (data.errors) {
      try {
        const viewRes = await fetch(
          `https://api.onesignal.com/apps/${appId}/subscriptions`,
          { headers: { 'Authorization': `Key ${apiKey}` } }
        );
        const viewData = await viewRes.text();
        console.log('[test-push] Subscriptions debug:', viewRes.status, viewData.substring(0, 500));
      } catch (e) {
        console.log('[test-push] Debug fetch failed:', e);
      }
    }

    return new Response(JSON.stringify({ success: !data.errors, onesignal: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[test-push] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});