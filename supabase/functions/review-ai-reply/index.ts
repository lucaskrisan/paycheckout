import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { review_id } = await req.json();
    if (!review_id) {
      return new Response(JSON.stringify({ error: "review_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load Maria settings
    const { data: mariaSettings } = await supabaseAdmin
      .from("maria_ai_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!mariaSettings?.active) {
      return new Response(JSON.stringify({ skipped: true, reason: "Maria AI is disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get review with lesson and course context
    const { data: review, error: reviewErr } = await supabaseAdmin
      .from("lesson_reviews")
      .select(`
        *, 
        course_lessons(title, content, course_modules(courses(title, description, ai_reply_enabled, user_id, product_id)))
      `)
      .eq("id", review_id)
      .single();

    if (reviewErr || !review) {
      return new Response(JSON.stringify({ error: "Review not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const course = review.course_lessons?.course_modules?.courses;
    if (!course?.ai_reply_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "AI replies disabled for this course" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if Maria already replied
    const { data: existingReply } = await supabaseAdmin
      .from("review_replies")
      .select("id")
      .eq("review_id", review_id)
      .eq("is_ai_reply", true)
      .maybeSingle();

    if (existingReply) {
      return new Response(JSON.stringify({ skipped: true, reason: "Maria already replied" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get other products from the same producer for cross-sell
    let crossSellInfo = "";
    if (mariaSettings.cross_sell_enabled && course.user_id) {
      const { data: otherProducts } = await supabaseAdmin
        .from("products")
        .select("name, price, description")
        .eq("user_id", course.user_id)
        .eq("active", true)
        .neq("id", course.product_id || "")
        .limit(3);

      if (otherProducts && otherProducts.length > 0) {
        crossSellInfo = `\n\nPRODUTOS DISPONÍVEIS PARA CROSS-SELL (use com naturalidade, SOMENTE se fizer sentido no contexto da conversa — NUNCA force a venda):\n${otherProducts.map(p => `- "${p.name}" (R$${p.price}) — ${p.description || "sem descrição"}`).join("\n")}`;
      }
    }

    const courseName = course?.title || "o curso";
    const lessonName = review.course_lessons?.title || "a aula";
    const courseDesc = course?.description || "";
    const studentName = review.customer_name || "Aluna";
    const studentComment = review.comment || "";
    const studentRating = review.rating;
    const personaName = mariaSettings.persona_name || "Maria 🌸";

    // Build system prompt from settings + dynamic context
    const basePrompt = mariaSettings.system_prompt || "Você é a MARIA 🌸";
    const systemPrompt = `${basePrompt}

CONTEXTO DO CURSO (adicionado automaticamente):
- Curso: "${courseName}"
- Descrição: ${courseDesc}
- Aula avaliada: "${lessonName}"
- Assine como "${personaName}"${crossSellInfo}`;

    const userMessage = `A aluna "${studentName}" avaliou a aula "${lessonName}" com ${studentRating}/5 estrelas e comentou: "${studentComment}"

Gere uma resposta como ${personaName}.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: mariaSettings.model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: mariaSettings.max_tokens || 500,
        temperature: mariaSettings.temperature || 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, tente novamente em breve" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    if (!aiContent) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert Maria's reply
    const { error: insertErr } = await supabaseAdmin
      .from("review_replies")
      .insert({
        review_id,
        author_name: personaName,
        content: aiContent.trim(),
        is_ai_reply: true,
        member_access_id: null,
      });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save reply" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update usage stats
    await supabaseAdmin
      .from("maria_ai_settings")
      .update({
        total_replies: (mariaSettings.total_replies || 0) + 1,
        total_tokens_used: (mariaSettings.total_tokens_used || 0) + tokensUsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mariaSettings.id);

    return new Response(JSON.stringify({ success: true, reply: aiContent.trim(), tokens_used: tokensUsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
