import { corsHeaders } from '../_shared/cors.ts';

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
      included_segments: ['Subscribed Users'],
      headings: { en: '🎉 Ka-ching! Mais uma venda!' },
      contents: { en: 'João Silva • 💠 PIX R$ 197,00 • Curso Premium' },
      chrome_web_icon: 'https://paycheckout.lovable.app/pwa-192x192.png',
      url: 'https://paycheckout.lovable.app/admin/orders',
    };

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
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
