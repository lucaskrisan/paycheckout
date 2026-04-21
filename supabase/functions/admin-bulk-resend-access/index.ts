/**
 * One-shot admin bulk re-send of access link e-mails for an explicit list of order IDs.
 * Auth: requires SUPABASE_SERVICE_ROLE_KEY in the Authorization header.
 * Used for retroactive recovery after the course<->product re-link incident (2026-04-21).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SITE_URL = 'https://app.panttera.com.br';
const PORTAL_URL = `${SITE_URL}/minha-conta`;

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { order_ids } = await req.json();
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'order_ids array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

    let sent = 0;
    let failed = 0;
    const results: Array<{ order_id: string; status: string; reason?: string }> = [];

    for (const order_id of order_ids) {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('id, customer_id, product_id, user_id, metadata')
          .eq('id', order_id)
          .maybeSingle();

        if (!order || !order.customer_id) {
          failed++;
          results.push({ order_id, status: 'skip', reason: 'no order/customer' });
          continue;
        }

        const { data: customer } = await supabase
          .from('customers')
          .select('name, email')
          .eq('id', order.customer_id)
          .single();

        if (!customer?.email) {
          failed++;
          results.push({ order_id, status: 'skip', reason: 'no email' });
          continue;
        }

        const { data: accesses } = await supabase
          .from('member_access')
          .select('id, access_token, course_id, expires_at')
          .eq('customer_id', order.customer_id);

        const now = Date.now();
        const activeAccesses = (accesses || []).filter(
          (a: any) => !a.expires_at || new Date(a.expires_at).getTime() > now,
        );
        if (activeAccesses.length === 0) {
          failed++;
          results.push({ order_id, status: 'skip', reason: 'no active access' });
          continue;
        }

        let isEnglish = false;
        if (order.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('currency')
            .eq('id', order.product_id)
            .maybeSingle();
          isEnglish = prod?.currency === 'USD';
        }

        const courseIds = Array.from(new Set(activeAccesses.map((a: any) => a.course_id)));
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);
        const courseMap = new Map((courses || []).map((c: any) => [c.id, c.title]));

        const seen = new Set<string>();
        const links: Array<{ title: string; url: string }> = [];
        for (const a of activeAccesses) {
          if (seen.has(a.course_id)) continue;
          seen.add(a.course_id);
          links.push({
            title: courseMap.get(a.course_id) || (isEnglish ? 'Course' : 'Curso'),
            url: `${SITE_URL}/membros?token=${a.access_token}`,
          });
        }

        const firstName = escapeHtml(
          customer.name?.split(' ')[0] || (isEnglish ? 'Student' : 'Aluno'),
        );
        const itemsHtml = links
          .map(
            (l) => `
          <div style="background:#f9fafb;border-radius:10px;padding:18px;margin:0 0 12px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 10px;color:#111827;font-size:15px;font-weight:600;">${escapeHtml(l.title)}</p>
            <a href="${l.url}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">
              ${isEnglish ? 'Open course' : 'Acessar curso'}
            </a>
          </div>`,
          )
          .join('');

        const html = `<!DOCTYPE html>
        <html><head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                ${isEnglish ? '🎉 Your course access' : '🎉 Seu acesso ao curso'}
              </h1>
            </div>
            <div style="padding:28px 40px;">
              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
                ${isEnglish ? 'Hi' : 'Olá'} <strong>${firstName}</strong>,
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 22px;">
                ${
                  isEnglish
                    ? 'Here is your access link to the course you purchased. Click below to start now:'
                    : 'Aqui está o seu link de acesso ao curso que você comprou. Clique abaixo para começar agora:'
                }
              </p>
              ${itemsHtml}
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
                <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 14px;">
                  ${
                    isEnglish
                      ? '💡 Tip: create your student account for one-login access to all courses:'
                      : '💡 Dica: crie sua conta de aluno e acesse todos os seus cursos com um login só:'
                  }
                </p>
                <a href="${PORTAL_URL}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:600;">
                  ${isEnglish ? 'Create student account' : 'Criar conta de aluno'}
                </a>
              </div>
            </div>
          </div>
        </body></html>`;

        const subject = isEnglish
          ? '🎉 Your course access is ready'
          : '🎉 Seu acesso ao curso está liberado';

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'PanteraPay <noreply@app.panttera.com.br>',
            to: [customer.email],
            subject,
            html,
          }),
        });
        const resendData = await resendRes.json().catch(() => ({}));

        try {
          await supabase.from('email_logs').insert({
            user_id: order.user_id,
            to_email: customer.email,
            to_name: customer.name,
            subject,
            html_body: html,
            email_type: 'access_link_bulk_recovery',
            status: resendRes.ok ? 'sent' : 'failed',
            resend_id: resendData?.id || null,
            customer_id: order.customer_id,
            product_id: order.product_id,
            order_id: order.id,
            source: 'admin-bulk-resend-access',
          });
        } catch {}

        if (resendRes.ok) {
          sent++;
          results.push({ order_id, status: 'sent' });
        } else {
          failed++;
          results.push({ order_id, status: 'failed', reason: JSON.stringify(resendData) });
        }

        // Small delay to avoid rate limit
        await new Promise((r) => setTimeout(r, 250));
      } catch (err: any) {
        failed++;
        results.push({ order_id, status: 'error', reason: String(err?.message || err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
