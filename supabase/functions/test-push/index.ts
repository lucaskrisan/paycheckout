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

    // Use REST API v1 with Basic auth
    const payload = {
      app_id: appId,
      included_segments: ['Total Subscriptions'],
      headings: { en: '🎉 Ka-ching! Mais uma venda!' },
      contents: { en: 'João Silva • 💠 PIX R$ 197,00 • Curso Premium' },
      chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
      url: 'https://paycheckout.lovable.app/admin/orders',
    };

    console.log('[test-push] Sending with payload:', JSON.stringify(payload));
    console.log('[test-push] Using API key (first 10 chars):', apiKey.substring(0, 10));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[test-push] OneSignal response status:', response.status);
    console.log('[test-push] OneSignal response:', JSON.stringify(data));

    // If that fails, try listing players to debug
    if (data.errors) {
      console.log('[test-push] Attempting to list players for debugging...');
      const playersRes = await fetch(
        `https://onesignal.com/api/v1/players?app_id=${appId}&limit=10`,
        {
          headers: { 'Authorization': `Basic ${apiKey}` },
        }
      );
      const playersData = await playersRes.json();
      console.log('[test-push] Players list:', JSON.stringify(playersData));
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