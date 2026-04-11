import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is authenticated
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify super_admin or admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find approved reviews without AI replies
    const { data: pendingReviews, error: queryErr } = await supabaseAdmin
      .from("lesson_reviews")
      .select("id")
      .eq("approved", true);

    if (queryErr) {
      return new Response(JSON.stringify({ error: "Query failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter out reviews that already have AI replies
    const reviewIds = (pendingReviews || []).map(r => r.id);
    if (reviewIds.length === 0) {
      return new Response(JSON.stringify({ replied: 0, errors: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existingReplies } = await supabaseAdmin
      .from("review_replies")
      .select("review_id")
      .eq("is_ai_reply", true)
      .in("review_id", reviewIds);

    const repliedIds = new Set((existingReplies || []).map(r => r.review_id));
    const unreplied = reviewIds.filter(id => !repliedIds.has(id));

    let replied = 0;
    let errors = 0;

    // Process sequentially to avoid rate limits
    for (const reviewId of unreplied) {
      try {
        const resp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/review-ai-reply`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ review_id: reviewId }),
          }
        );
        const result = await resp.json();
        if (result.success) replied++;
        else if (!result.skipped) errors++;
        
        // Small delay between calls
        await new Promise(r => setTimeout(r, 1000));
      } catch {
        errors++;
      }
    }

    return new Response(JSON.stringify({ replied, errors, total: unreplied.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Batch AI reply error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
