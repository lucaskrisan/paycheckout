import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-access-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { file_path } = await req.json();

    if (!file_path || typeof file_path !== 'string') {
      return new Response(
        JSON.stringify({ error: 'file_path é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Sanitize file_path: prevent path traversal
    if (file_path.includes('..') || file_path.startsWith('/')) {
      return new Response(
        JSON.stringify({ error: 'Caminho inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('authorization');
    const accessToken = req.headers.get('x-access-token');

    let hasAccess = false;

    // 1. Check JWT auth — admins get immediate access, regular users check member_access
    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) {
        // Check if admin/super_admin — instant access
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        if (roles?.some((r: any) => r.role === 'admin' || r.role === 'super_admin')) {
          hasAccess = true;
        }

        // If not admin, check if this authenticated user has member_access to any course
        if (!hasAccess) {
          // Find customer records linked to this user
          const { data: customers } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('user_id', user.id);

          if (customers && customers.length > 0) {
            const customerIds = customers.map((c: any) => c.id);
            const { data: accessRecords } = await supabaseAdmin
              .from('member_access')
              .select('id, expires_at')
              .in('customer_id', customerIds)
              .limit(1);

            if (accessRecords && accessRecords.length > 0) {
              const rec = accessRecords[0];
              const notExpired = !rec.expires_at || new Date(rec.expires_at) > new Date();
              if (notExpired) hasAccess = true;
            }
          }
        }
      }
    }

    // 2. Check x-access-token (token-based access for buyers via link)
    if (!hasAccess && accessToken) {
      const { data: access } = await supabaseAdmin
        .from('member_access')
        .select('id, expires_at')
        .eq('access_token', accessToken)
        .maybeSingle();

      if (access) {
        const notExpired = !access.expires_at || new Date(access.expires_at) > new Date();
        if (notExpired) hasAccess = true;
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Token inválido ou expirado.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate signed URL using service role
    const { data, error } = await supabaseAdmin.storage
      .from('course-materials')
      .createSignedUrl(file_path, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      console.error('[signed-material-url] Error:', error);
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar o link de download.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[signed-material-url] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
