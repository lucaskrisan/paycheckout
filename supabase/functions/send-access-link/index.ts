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
    const { customer_id, course_id, access_token } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get course
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', course_id)
      .single();

    if (!course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build access URL
    const siteUrl = Deno.env.get('SITE_URL') || 'https://paycheckout.lovable.app';
    const accessUrl = `${siteUrl}/membros?token=${access_token}`;

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🎉 Seu acesso está liberado!</h1>
          </div>
          <div style="padding:32px 40px;">
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
              Olá <strong>${customer.name}</strong>,
            </p>
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
              Seu acesso ao curso <strong>"${course.title}"</strong> foi liberado com sucesso! Clique no botão abaixo para acessar todo o conteúdo:
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${accessUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(34,197,94,0.4);">
                Acessar Curso
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;">
              Ou copie e cole este link no seu navegador:<br>
              <a href="${accessUrl}" style="color:#22c55e;word-break:break-all;">${accessUrl}</a>
            </p>
          </div>
          <div style="background:#f9fafb;padding:20px 40px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Este é um email automático. Guarde este link para acessar seu curso.
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
        subject: `Seu acesso ao curso "${course.title}" está liberado! 🎉`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      // Return success with warning instead of failing
      return new Response(
        JSON.stringify({
          success: true,
          email_sent: false,
          email_error: resendData.message || 'Email sending failed',
          access_url: accessUrl,
          customer_email: customer.email,
          course_title: course.title,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: true,
        access_url: accessUrl,
        customer_email: customer.email,
        course_title: course.title,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
