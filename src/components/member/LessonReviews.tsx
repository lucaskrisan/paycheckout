import { useEffect, useState } from "react";
import { Star, Send, MessageCircle, Clock, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberTranslations } from "@/lib/memberI18n";

interface Review { id: string; customer_name: string; rating: number; comment: string | null; approved: boolean; created_at: string; member_access_id: string; }

export default function LessonReviews({ lessonId, memberAccessId, customerName, client, t }: { lessonId: string; memberAccessId: string; customerName: string; client: SupabaseClient; t: MemberTranslations; }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadReviews(); }, [lessonId, memberAccessId]);

  const loadReviews = async () => {
    const { data } = await client.from("lesson_reviews").select("*").eq("lesson_id", lessonId).order("created_at", { ascending: false });
    if (data) {
      const mine = data.find((r: Review) => r.member_access_id === memberAccessId);
      if (mine) { setMyReview(mine); setRating(mine.rating); setComment(mine.comment || ""); } else { setMyReview(null); setRating(5); setComment(""); }
      setReviews(data);
    }
  };

  const submitReview = async () => {
    if (!comment.trim()) { toast.error(t.writeCommentFirst); return; }
    setSubmitting(true);
    const payload = { lesson_id: lessonId, member_access_id: memberAccessId, customer_name: customerName, rating, comment: comment.trim(), approved: false };
    const { error } = myReview
      ? await client.from("lesson_reviews").update({ rating, comment: comment.trim(), approved: false }).eq("id", myReview.id)
      : await client.from("lesson_reviews").insert(payload);
    setSubmitting(false);
    if (error) { toast.error(t.reviewError); console.error(error); }
    else { toast.success(t.reviewSent); loadReviews(); }
  };

  const approvedReviews = reviews.filter((r) => r.approved);
  const myPendingReview = reviews.find((r) => r.member_access_id === memberAccessId && !r.approved);
  const avgRating = approvedReviews.length > 0 ? approvedReviews.reduce((a, r) => a + r.rating, 0) / approvedReviews.length : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border p-5" style={{ background: "hsl(220 18% 10%)", borderColor: "hsl(220 15% 14%)" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm flex items-center gap-2"><MessageCircle className="w-4 h-4 text-[hsl(145,65%,50%)]" />{t.lessonReviews}</h3>
        {avgRating > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "hsl(220,18%,14%)" }}>
            <Star className="w-4 h-4 fill-[hsl(45,93%,55%)] text-[hsl(45,93%,55%)]" />
            <span className="text-white text-sm font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-[hsl(220,10%,40%)] text-xs">({approvedReviews.length} {approvedReviews.length === 1 ? t.review : t.reviews})</span>
          </div>
        )}
      </div>
      <div className="rounded-xl p-4 mb-5 border" style={{ background: "hsl(220,18%,14%)", borderColor: "hsl(220,15%,18%)" }}>
        <p className="text-[hsl(220,10%,55%)] text-xs mb-1">{myReview ? t.editReview : t.leaveReview}</p>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} className="transition-transform hover:scale-125">
              <Star className="w-6 h-6 transition-colors" style={{ fill: s <= (hoverRating || rating) ? "hsl(45,93%,55%)" : "transparent", color: s <= (hoverRating || rating) ? "hsl(45,93%,55%)" : "hsl(220,10%,30%)" }} />
            </button>
          ))}
          <span className="text-[hsl(220,10%,45%)] text-xs ml-2">{rating}/5</span>
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.writeComment} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(145,65%,42%)]" style={{ background: "hsl(220,18%,10%)", borderColor: "hsl(220,15%,20%)", color: "hsl(0,0%,85%)" }} />
        <div className="flex items-center justify-between mt-3">
          {myPendingReview && <span className="flex items-center gap-1 text-[hsl(45,93%,55%)] text-xs"><Clock className="w-3 h-3" />{t.awaitingApproval}</span>}
          {myReview?.approved && <span className="flex items-center gap-1 text-[hsl(145,65%,50%)] text-xs"><ThumbsUp className="w-3 h-3" />{t.published}</span>}
          {!myReview && <div />}
          <button onClick={submitReview} disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50" style={{ backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))", color: "white" }}>
            <Send className="w-3 h-3" />{myReview ? t.update : t.send}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {approvedReviews.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[hsl(220,10%,45%)] text-xs font-medium uppercase tracking-wider mb-2">{t.publishedReviews}</p>
            {approvedReviews.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl p-4 border" style={{ background: "hsl(220,18%,14%)", borderColor: "hsl(220,15%,18%)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundImage: "linear-gradient(135deg, hsl(145,65%,35%), hsl(160,70%,30%))", color: "white" }}>{r.customer_name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium">{r.customer_name}</span>
                    <p className="text-[hsl(220,10%,30%)] text-[10px]">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5" style={{ fill: s <= r.rating ? "hsl(45,93%,55%)" : "transparent", color: s <= r.rating ? "hsl(45,93%,55%)" : "hsl(220,10%,25%)" }} />)}
                  </div>
                </div>
                {r.comment && <p className="text-[hsl(0,0%,75%)] text-sm leading-relaxed pl-10">"{r.comment}"</p>}
                {r.member_access_id === memberAccessId && (
                  <span className="inline-block mt-2 ml-10 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "hsl(145,65%,15%)", color: "hsl(145,65%,55%)" }}>{t.yourReview}</span>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Star className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(220,10%,25%)" }} />
            <p className="text-[hsl(220,10%,35%)] text-sm">{t.beFirst}</p>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
