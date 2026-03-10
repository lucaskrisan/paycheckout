import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, order_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order with product
    const { data: order } = await supabase
      .from('orders')
      .select('*, product_id')
      .eq('id', order_id)
      .single();

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find course linked to this product
    const { data: course } = await supabase
      .from('courses')
      .select('id, title')
      .eq('product_id', order.product_id)
      .single();

    if (!course) {
      return new Response(
        JSON.stringify({ error: 'No course linked to this product' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or get member access
    const { data: existingAccess } = await supabase
      .from('member_access')
      .select('access_token')
      .eq('customer_id', customer_id)
      .eq('course_id', course.id)
      .maybeSingle();

    let accessToken: string;

    if (existingAccess) {
      accessToken = existingAccess.access_token;
    } else {
      const { data: newAccess, error } = await supabase
        .from('member_access')
        .insert({
          customer_id,
          course_id: course.id,
          order_id,
        })
        .select('access_token')
        .single();

      if (error || !newAccess) {
        return new Response(
          JSON.stringify({ error: 'Failed to create access', details: error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      accessToken = newAccess.access_token;
    }

    // Build access URL
    const siteUrl = Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', '.lovable.app');
    const accessUrl = `${siteUrl}/membros?token=${accessToken}`;

    // For now, return the link (email integration can be added later)
    return new Response(
      JSON.stringify({
        success: true,
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
