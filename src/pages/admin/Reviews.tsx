import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, XCircle, MessageCircle, Clock, Filter, Reply, Sparkles } from "lucide-react";
import ninaAvatar from "@/assets/nina-avatar.png";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReviewReply { id: string; review_id: string; author_name: string; content: string; is_ai_reply: boolean; created_at: string; }

interface Review {
  id: string;
  lesson_id: string;
  member_access_id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
  lesson_title?: string;
  course_title?: string;
  replies?: ReviewReply[];
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [batchReplying, setBatchReplying] = useState(false);

  useEffect(() => { loadReviews(); }, []);

  const loadRepliesByReview = async (reviewIds: string[]) => {
    if (reviewIds.length === 0) return {} as Record<string, ReviewReply[]>;

    const grouped: Record<string, ReviewReply[]> = {};
    const chunkSize = 20;

    for (let i = 0; i < reviewIds.length; i += chunkSize) {
      const chunk = reviewIds.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("review_replies")
        .select("id, review_id, author_name, content, is_ai_reply, created_at")
        .in("review_id", chunk)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading review replies:", error);
        continue;
      }

      (data || []).forEach((reply) => {
        if (!grouped[reply.review_id]) grouped[reply.review_id] = [];
        grouped[reply.review_id].push(reply as ReviewReply);
      });
    }

    return grouped;
  };

  const loadReviews = async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from("lesson_reviews")
      .select(`
        *,
        course_lessons (
          title,
          course_modules (
            courses ( title )
          )
        ),
        member_access (
          customers ( name, email )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setReviews([]);
      setLoadError("Não foi possível carregar as avaliações agora.");
      setLoading(false);
      return;
    }

    const repliesByReview = await loadRepliesByReview((data || []).map((review: any) => review.id));

    const enriched: Review[] = (data || []).map((r: any) => ({
      ...r,
      lesson_title: r.course_lessons?.title || "Aula desconhecida",
      course_title: r.course_lessons?.course_modules?.courses?.title || "",
      customer_name: r.member_access?.customers?.name || r.customer_name || "Aluno",
      customer_email: r.member_access?.customers?.email || null,
      replies: repliesByReview[r.id] || [],
    }));

    setReviews(enriched);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("lesson_reviews").update({ approved: true }).eq("id", id);
    if (error) { toast.error("Erro ao aprovar avaliação"); return; }
    toast.success("Avaliação aprovada e publicada!");
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, approved: true } : r)));
    // Always try auto-reply - check settings and trigger
    try {
      const { data: ninaSettings } = await supabase.from("maria_ai_settings").select("auto_reply_on_approve, active").limit(1).maybeSingle();
      if (ninaSettings?.active && ninaSettings?.auto_reply_on_approve) {
        triggerAIReply(id);
      }
    } catch (e) {
      console.error("Failed to check Nina settings:", e);
    }
  };

  const triggerAIReply = async (reviewId: string) => {
    setGeneratingAI(reviewId);
    try {
      const { data, error } = await supabase.functions.invoke("review-ai-reply", { body: { review_id: reviewId } });
      if (error) { console.error("AI reply error:", error); toast.error("Erro ao gerar resposta da Nina"); }
      else if (data?.success) { toast.success("🐆 Nina respondeu!"); await loadReviews(); }
      else if (data?.skipped) { toast.info("Nina já respondeu esta avaliação"); }
      else { toast.error("Erro inesperado ao gerar resposta"); }
    } catch (e) { console.error(e); toast.error("Erro de conexão"); }
    setGeneratingAI(null);
  };

  const handleBatchAIReply = async () => {
    setBatchReplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("batch-ai-reply");
      if (error) { toast.error("Erro ao disparar respostas: " + (error.message || "unknown")); setBatchReplying(false); return; }
      const total = data?.total || 0;
      if (total > 0) {
        toast.success(`🐆 Nina está respondendo ${total} avaliação(ões) em background!`);
        // Poll for completion
        setTimeout(() => { loadReviews(); setBatchReplying(false); }, total * 4000);
      } else {
        toast.info("Todas as avaliações já foram respondidas!");
        setBatchReplying(false);
      }
    } catch (e: any) {
      toast.error("Erro inesperado: " + (e?.message || ""));
      setBatchReplying(false);
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from("lesson_reviews").delete().eq("id", id);
    if (error) { toast.error("Erro ao rejeitar avaliação"); }
    else { toast.success("Avaliação removida."); setReviews((prev) => prev.filter((r) => r.id !== id)); }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;
  const unrepliedCount = reviews.filter((r) => r.approved && !r.replies?.some(rep => rep.is_ai_reply)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground text-sm">Gerencie as avaliações dos alunos nas aulas</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        {unrepliedCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchAIReply}
            disabled={batchReplying}
            className="ml-auto text-purple-600 border-purple-300 hover:bg-purple-50"
          >
            {batchReplying ? (
              <><span className="animate-spin mr-1">⏳</span>Respondendo...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" />Nina: Responder {unrepliedCount} pendente{unrepliedCount > 1 ? "s" : ""}</>
            )}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={loadReviews}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === "pending" ? "Nenhuma avaliação pendente de aprovação." : "Nenhuma avaliação encontrada."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const hasAIReply = r.replies?.some(rep => rep.is_ai_reply);
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {r.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-sm">{r.customer_name}</span>
                          {r.customer_email && <p className="text-xs text-muted-foreground">{r.customer_email}</p>}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </div>
                        {!r.approved && (
                          <Badge variant="outline" className="ml-auto text-xs"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
                        )}
                        {r.approved && (
                          <Badge className="ml-auto text-xs bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovada</Badge>
                        )}
                      </div>

                      {r.comment && <p className="text-sm text-foreground/80 mt-2 pl-10">"{r.comment}"</p>}

                      <div className="flex items-center gap-2 mt-2 pl-10">
                        <span className="text-xs text-muted-foreground">{r.course_title} → {r.lesson_title}</span>
                        <span className="text-xs text-muted-foreground">• {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>

                      {/* Show replies */}
                      {r.replies && r.replies.length > 0 && (
                        <div className="mt-3 pl-10 space-y-2">
                          {r.replies.map((rep) => (
                            <div key={rep.id} className="flex gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                              {rep.is_ai_reply ? (
                                <img src={ninaAvatar} alt="Nina" className="w-5 h-5 rounded-full flex-shrink-0" loading="lazy" width={20} height={20} />
                              ) : (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 bg-blue-600 text-white">
                                  <Reply className="w-3 h-3" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium">{rep.author_name}</span>
                                  {rep.is_ai_reply && <Badge variant="secondary" className="text-[9px] px-1.5 py-0"><Sparkles className="w-2.5 h-2.5 mr-0.5" />IA</Badge>}
                                  <span className="text-[10px] text-muted-foreground">{new Date(rep.created_at).toLocaleDateString("pt-BR")}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rep.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      {r.approved && !hasAIReply && (
                        <Button size="sm" variant="outline" onClick={() => triggerAIReply(r.id)} disabled={generatingAI === r.id} className="text-purple-600 border-purple-300 hover:bg-purple-50">
                          {generatingAI === r.id ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4 mr-1" />}
                          Nina
                        </Button>
                      )}
                      {!r.approved && (
                        <Button size="sm" onClick={() => handleApprove(r.id)} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-4 h-4 mr-1" />Aprovar
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                        <XCircle className="w-4 h-4 mr-1" />Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reviews;
