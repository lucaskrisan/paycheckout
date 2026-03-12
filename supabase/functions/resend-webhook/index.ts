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
    const payload = await req.json();
    console.log('[resend-webhook] event:', payload.type, 'email_id:', payload.data?.email_id);

    const eventType = payload.type;
    const data = payload.data;

    if (!data?.email_id) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date().toISOString();
    const updates: Record<string, any> = {};

    switch (eventType) {
      case 'email.delivered':
        updates.status = 'delivered';
        updates.delivered_at = data.created_at || now;
        break;
      case 'email.opened':
        updates.status = 'opened';
        updates.opened_at = data.created_at || now;
        break;
      case 'email.clicked':
        updates.status = 'clicked';
        updates.clicked_at = data.created_at || now;
        break;
      case 'email.bounced':
        updates.status = 'bounced';
        updates.bounced_at = data.created_at || now;
        updates.bounce_reason = data.bounce?.message || data.reason || 'Unknown';
        break;
      case 'email.complained':
        updates.status = 'complained';
        break;
      default:
        console.log('[resend-webhook] Unhandled event type:', eventType);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { error } = await supabase
      .from('email_logs')
      .update(updates)
      .eq('resend_id', data.email_id);

    if (error) {
      console.error('[resend-webhook] Update error:', error);
    } else {
      console.log('[resend-webhook] Updated email_log for resend_id:', data.email_id, 'status:', updates.status);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[resend-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
