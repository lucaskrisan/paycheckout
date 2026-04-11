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
        course_lessons(title, content, course_modules(courses(title, description, ai_reply_enabled)))
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

    // Check if AI already replied
    const { data: existingReply } = await supabaseAdmin
      .from("review_replies")
      .select("id")
      .eq("review_id", review_id)
      .eq("is_ai_reply", true)
      .maybeSingle();

    if (existingReply) {
      return new Response(JSON.stringify({ skipped: true, reason: "AI already replied" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const courseName = course?.title || "o curso";
    const lessonName = review.course_lessons?.title || "a aula";
    const courseDesc = course?.description || "";
    const studentName = review.customer_name || "Aluno(a)";
    const studentComment = review.comment || "";
    const studentRating = review.rating;

    const systemPrompt = `Você é a assistente virtual oficial do curso "${courseName}". Sua missão é responder avaliações dos alunos com empatia, inteligência e acolhimento.

REGRAS ABSOLUTAS:
1. Fale SOMENTE sobre o curso, a aula e o conteúdo. NUNCA fale sobre assuntos externos.
2. Se o aluno compartilhar dificuldades emocionais ou pessoais no comentário, acolha com empatia genuína como uma psicóloga/psicanalista faria — valide os sentimentos, ofereça palavras de encorajamento, e conecte de volta ao conteúdo do curso como ferramenta de crescimento.
3. Se a avaliação for positiva (4-5 estrelas), celebre o progresso e encoraje a continuar.
4. Se for negativa (1-3 estrelas), acolha a frustração, reconheça o ponto, e sugira como aproveitar melhor o conteúdo.
5. Seja calorosa, profissional e nunca genérica. Personalize a resposta com base no comentário específico.
6. Responda em português BR, de forma concisa (máximo 3 parágrafos curtos).
7. Use o nome do aluno na resposta.
8. NUNCA invente informações sobre o curso que não foram fornecidas.
9. Assine como "✨ Equipe ${courseName}"

Contexto do curso: ${courseDesc}
Aula avaliada: "${lessonName}"`;

    const userMessage = `O aluno "${studentName}" avaliou a aula "${lessonName}" com ${studentRating}/5 estrelas e comentou: "${studentComment}"

Gere uma resposta empática e inteligente.`;

    // Call Lovable AI Gateway
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

    // Insert AI reply
    const { error: insertErr } = await supabaseAdmin
      .from("review_replies")
      .insert({
        review_id,
        author_name: `✨ Equipe ${courseName}`,
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
