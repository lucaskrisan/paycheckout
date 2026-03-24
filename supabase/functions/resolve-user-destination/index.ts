import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("profile_completed")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id),
    ]);

    const profileCompleted = profile?.profile_completed === true;
    let isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");

    let buyerToken: string | null = null;
    if (user.email) {
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .ilike("email", user.email)
        .limit(1)
        .maybeSingle();

      if (customer?.id) {
        const { data: access } = await supabaseAdmin
          .from("member_access")
          .select("access_token")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        buyerToken = access?.access_token ?? null;
      }
    }

    // No auto-promote — admin role is granted manually by super_admin only.
    // Priority: admin/super_admin always goes to /admin, even if they also bought courses.
    // Only pure buyers (no admin role) go to /minha-conta.
    // Users with no role and no buyer access go to pending-approval page.
    const destination = !profileCompleted
      ? "/completar-perfil"
      : isAdmin
        ? "/admin"
        : buyerToken
          ? `/minha-conta?token=${buyerToken}`
          : "/aprovacao-pendente";

    return new Response(
      JSON.stringify({
        destination,
        profileCompleted,
        isAdmin,
        hasBuyerAccess: !!buyerToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
