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
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let settings: any = null;

    if (userId) {
      const { data } = await supabase
        .from('pwa_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      settings = data;
    }

    // Defaults
    const appName = settings?.app_name || 'PayCheckout';
    const shortName = settings?.short_name || 'PayCheckout';
    const description = settings?.description || 'Plataforma de vendas';
    const themeColor = settings?.theme_color || '#16a34a';
    const bgColor = settings?.background_color || '#ffffff';
    const icon192 = settings?.icon_192_url || '/brand-icon.webp';
    const icon512 = settings?.icon_512_url || '/brand-icon.webp';

    const manifest = {
      name: appName,
      short_name: shortName,
      description,
      theme_color: themeColor,
      background_color: bgColor,
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/admin',
      icons: [
        {
          src: icon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    };

    return new Response(JSON.stringify(manifest), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[pwa-manifest] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
