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

    // Get review with lesson and course context
    const { data: review, error: reviewErr } = await supabaseAdmin
      .from("lesson_reviews")
      .select(`
        *, 
        course_lessons(title, content, course_modules(courses(title, description, ai_reply_enabled, user_id)))
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
    if (course.user_id) {
      const { data: otherProducts } = await supabaseAdmin
        .from("products")
        .select("name, price, description")
        .eq("user_id", course.user_id)
        .eq("active", true)
        .neq("id", review.course_lessons?.course_modules?.courses?.product_id || "")
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

    const systemPrompt = `Você é a MARIA 🌸 — a assistente inteligente e acolhedora do curso "${courseName}". Você é como uma mentora, amiga e, quando necessário, uma psicóloga/psicanalista empática.

PERSONALIDADE DA MARIA:
- Calorosa, inteligente e genuína. Nunca robótica ou genérica.
- Usa emojis com moderação (1-2 por resposta, nunca exagera).
- Fala de forma natural, como uma amiga querida que entende profundamente o assunto.
- Sempre chama a aluna pelo nome.

REGRAS ABSOLUTAS:
1. Fale EXCLUSIVAMENTE sobre o curso, a aula e o conteúdo relacionado. JAMAIS fale sobre assuntos que não tenham relação com o produto.
2. Se a aluna compartilhar dificuldades emocionais ou pessoais, acolha com empatia genuína — valide os sentimentos, ofereça palavras de encorajamento com sabedoria psicológica, e reconecte ao conteúdo como ferramenta de transformação.
3. Avaliação positiva (4-5⭐): celebre o progresso, destaque pontos específicos do comentário, encoraje a continuar aplicando.
4. Avaliação negativa (1-3⭐): acolha a frustração sem defensividade, reconheça o ponto, sugira como aproveitar melhor o conteúdo e diga que a equipe está atenta.
5. Responda em português BR, de forma concisa (máximo 3 parágrafos curtos).
6. NUNCA invente informações sobre o curso.
7. Se houver produtos complementares disponíveis E o contexto permitir naturalmente (ex: aluna demonstra interesse em aprofundar), mencione com sutileza — NUNCA force vendas.
8. Assine como "Maria 🌸"

CONTEXTO:
- Curso: "${courseName}"
- Descrição: ${courseDesc}
- Aula avaliada: "${lessonName}"${crossSellInfo}`;

    const userMessage = `A aluna "${studentName}" avaliou a aula "${lessonName}" com ${studentRating}/5 estrelas e comentou: "${studentComment}"

Gere uma resposta como Maria.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert Maria's reply
    const { error: insertErr } = await supabaseAdmin
      .from("review_replies")
      .insert({
        review_id,
        author_name: "Maria 🌸",
        content: aiContent.trim(),
        is_ai_reply: true,
        member_access_id: null,
      });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save reply" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, reply: aiContent.trim() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
