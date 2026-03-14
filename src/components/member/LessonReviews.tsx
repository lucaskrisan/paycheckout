import { useEffect, useState } from "react";
import { Star, Send, MessageCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
  member_access_id: string;
}

export default function LessonReviews({
  lessonId,
  memberAccessId,
  customerName,
  client,
}: {
  lessonId: string;
  memberAccessId: string;
  customerName: string;
  client: SupabaseClient;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [lessonId, memberAccessId]);

  const loadReviews = async () => {
    const { data } = await client
      .from("lesson_reviews")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("member_access_id", memberAccessId)
      .order("created_at", { ascending: false });

    if (data) {
      const mine = data.find((r: Review) => r.member_access_id === memberAccessId);
      if (mine) {
        setMyReview(mine);
        setRating(mine.rating);
        setComment(mine.comment || "");
      } else {
        setMyReview(null);
        setRating(5);
        setComment("");
      }
      setReviews(data);
    }
  };

  const submitReview = async () => {
    if (!comment.trim()) {
      toast.error("Escreva um comentário antes de enviar.");
      return;
    }
    setSubmitting(true);
    const payload = {
      lesson_id: lessonId,
      member_access_id: memberAccessId,
      customer_name: customerName,
      rating,
      comment: comment.trim(),
      approved: false,
    };

    const { error } = myReview
      ? await client
          .from("lesson_reviews")
          .update({ rating, comment: comment.trim(), approved: false })
          .eq("id", myReview.id)
      : await client.from("lesson_reviews").insert(payload);

    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar avaliação.");
      console.error(error);
    } else {
      toast.success("Avaliação enviada! Aguarde aprovação do instrutor.");
      loadReviews();
    }
  };

  const approvedReviews = reviews.filter(
    (r) => r.approved || r.member_access_id === memberAccessId
  );

  const avgRating =
    reviews.filter((r) => r.approved).length > 0
      ? reviews.filter((r) => r.approved).reduce((a, r) => a + r.rating, 0) /
        reviews.filter((r) => r.approved).length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border p-5"
      style={{
        background: "hsl(220 18% 10%)",
        borderColor: "hsl(220 15% 14%)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[hsl(145,65%,50%)]" />
          Avaliações & Comentários
        </h3>
        {avgRating > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-[hsl(45,93%,55%)] text-[hsl(45,93%,55%)]" />
            <span className="text-white text-sm font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-[hsl(220,10%,40%)] text-xs">
              ({reviews.filter((r) => r.approved).length})
            </span>
          </div>
        )}
      </div>

      {/* Submit form */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ background: "hsl(220,18%,14%)" }}
      >
        <p className="text-[hsl(220,10%,55%)] text-xs mb-3">
          {myReview ? "Editar sua avaliação" : "Deixe sua avaliação"}
        </p>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-125"
            >
              <Star
                className="w-6 h-6 transition-colors"
                style={{
                  fill:
                    s <= (hoverRating || rating)
                      ? "hsl(45,93%,55%)"
                      : "transparent",
                  color:
                    s <= (hoverRating || rating)
                      ? "hsl(45,93%,55%)"
                      : "hsl(220,10%,30%)",
                }}
              />
            </button>
          ))}
          <span className="text-[hsl(220,10%,45%)] text-xs ml-2">
            {rating}/5
          </span>
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escreva seu comentário sobre esta aula..."
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
          style={{
            background: "hsl(220,18%,10%)",
            borderColor: "hsl(220,15%,20%)",
            color: "hsl(0,0%,85%)",
          }}
        />

        <div className="flex items-center justify-between mt-3">
          {myReview && !myReview.approved && (
            <span className="flex items-center gap-1 text-[hsl(45,93%,55%)] text-xs">
              <Clock className="w-3 h-3" />
              Aguardando aprovação
            </span>
          )}
          {myReview?.approved && (
            <span className="flex items-center gap-1 text-[hsl(145,65%,50%)] text-xs">
              ✓ Publicada
            </span>
          )}
          {!myReview && <div />}
          <button
            onClick={submitReview}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
              color: "white",
            }}
          >
            <Send className="w-3 h-3" />
            {myReview ? "Atualizar" : "Enviar"}
          </button>
        </div>
      </div>

      {/* Reviews list */}
      <AnimatePresence>
        {approvedReviews.length > 0 ? (
          <div className="space-y-3">
            {approvedReviews.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 relative"
                style={{ background: "hsl(220,18%,14%)" }}
              >
                {r.member_access_id === memberAccessId && !r.approved && (
                  <span
                    className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      background: "hsl(45,93%,20%)",
                      color: "hsl(45,93%,60%)",
                    }}
                  >
                    Pendente
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, hsl(220,18%,22%), hsl(220,15%,28%))",
                      color: "hsl(0,0%,70%)",
                    }}
                  >
                    {r.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-medium">
                    {r.customer_name}
                  </span>
                  <div className="flex items-center gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3 h-3"
                        style={{
                          fill:
                            s <= r.rating ? "hsl(45,93%,55%)" : "transparent",
                          color:
                            s <= r.rating
                              ? "hsl(45,93%,55%)"
                              : "hsl(220,10%,25%)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-[hsl(0,0%,70%)] text-sm leading-relaxed">
                    {r.comment}
                  </p>
                )}
                <p className="text-[hsl(220,10%,30%)] text-[10px] mt-2">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-[hsl(220,10%,35%)] text-sm text-center py-4">
            Seja o primeiro a avaliar esta aula!
          </p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
