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

    // Try multiple targeting methods for debugging
    const payload = {
      app_id: appId,
      include_player_ids: ['881309ab-9f48-4853-8446-6e12e8f819dd', '9c0e8a9a-d5d2-4a5d-9782-6386c2786f19'],
      headings: { en: '🎉 Ka-ching! Mais uma venda!' },
      contents: { en: 'João Silva • 💠 PIX R$ 197,00 • Curso Premium' },
      chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
      url: 'https://paycheckout.lovable.app/admin/orders',
    };

    console.log('[test-push] Sending payload:', JSON.stringify(payload));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[test-push] OneSignal response:', data);

    return new Response(JSON.stringify({ success: true, onesignal: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
