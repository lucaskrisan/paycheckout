import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, XCircle, MessageCircle, Clock, Filter } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const { data, error } = await supabase
      .from("lesson_reviews")
      .select(`
        *,
        course_lessons (
          title,
          course_modules (
            courses (
              title
            )
          )
        ),
        member_access (
          customers (
            name,
            email
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const enriched: Review[] = (data || []).map((r: any) => ({
      ...r,
      lesson_title: r.course_lessons?.title || "Aula desconhecida",
      course_title: r.course_lessons?.course_modules?.courses?.title || "",
      customer_name: r.member_access?.customers?.name || r.customer_name || "Aluno",
      customer_email: r.member_access?.customers?.email || null,
    }));

    setReviews(enriched);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("lesson_reviews")
      .update({ approved: true })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao aprovar avaliação");
    } else {
      toast.success("Avaliação aprovada e publicada!");
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, approved: true } : r))
      );
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("lesson_reviews")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao rejeitar avaliação");
    } else {
      toast.success("Avaliação removida.");
      setReviews((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as avaliações dos alunos nas aulas
          </p>
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
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === "pending"
                ? "Nenhuma avaliação pendente de aprovação."
                : "Nenhuma avaliação encontrada."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
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
                        {r.customer_email && (
                          <p className="text-xs text-muted-foreground">{r.customer_email}</p>
                        )}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= r.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {!r.approved && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                      {r.approved && (
                        <Badge className="ml-auto text-xs bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Aprovada
                        </Badge>
                      )}
                    </div>

                    {r.comment && (
                      <p className="text-sm text-foreground/80 mt-2 pl-10">
                        "{r.comment}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 pl-10">
                      <span className="text-xs text-muted-foreground">
                        {r.course_title} → {r.lesson_title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    {!r.approved && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(r.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(r.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
