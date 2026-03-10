import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Lock,
  PlayCircle,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  content: string | null;
  file_url: string | null;
  sort_order: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
}

interface MemberAccess {
  id: string;
  course_id: string;
  customer_id: string;
}

const contentTypeIcons: Record<string, typeof FileText> = {
  text: FileText,
  link: Link2,
  pdf: Download,
  video_embed: Video,
};

const MemberArea = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<MemberAccess | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadMemberData();
  }, [token]);

  const loadMemberData = async () => {
    try {
      // 1. Validate access token
      const { data: accessData, error: accessError } = await supabase
        .from("member_access")
        .select("id, course_id, customer_id, expires_at")
        .eq("access_token", token!)
        .maybeSingle();

      if (accessError || !accessData) {
        toast.error("Link de acesso inválido ou expirado.");
        setLoading(false);
        return;
      }

      // Check expiration
      if (accessData.expires_at && new Date(accessData.expires_at) < new Date()) {
        toast.error("Seu acesso expirou.");
        setLoading(false);
        return;
      }

      setAccess(accessData);

      // 2. Load course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", accessData.course_id)
        .single();

      if (courseData) setCourse(courseData);

      // 3. Load modules + lessons
      const { data: modulesData } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", accessData.course_id)
        .order("sort_order");

      if (modulesData) {
        const modulesWithLessons: Module[] = [];
        for (const mod of modulesData) {
          const { data: lessonsData } = await supabase
            .from("course_lessons")
            .select("*")
            .eq("module_id", mod.id)
            .order("sort_order");

          modulesWithLessons.push({
            ...mod,
            lessons: lessonsData || [],
          });
        }
        setModules(modulesWithLessons);

        // Auto-open first module and lesson
        if (modulesWithLessons.length > 0) {
          setActiveModuleId(modulesWithLessons[0].id);
          if (modulesWithLessons[0].lessons.length > 0) {
            setActiveLesson(modulesWithLessons[0].lessons[0]);
          }
        }
      }

      // 4. Load progress
      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("member_access_id", accessData.id)
        .eq("completed", true);

      if (progressData) {
        setCompletedLessons(new Set(progressData.map((p: any) => p.lesson_id)));
      }
    } catch (err) {
      console.error("Error loading member data:", err);
      toast.error("Erro ao carregar conteúdo.");
    }
    setLoading(false);
  };

  const toggleLessonComplete = async (lessonId: string) => {
    if (!access) return;
    const isCompleted = completedLessons.has(lessonId);

    if (isCompleted) {
      // Mark as incomplete
      await supabase
        .from("lesson_progress")
        .update({ completed: false, completed_at: null })
        .eq("member_access_id", access.id)
        .eq("lesson_id", lessonId);
      setCompletedLessons((prev) => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    } else {
      // Mark as complete (upsert)
      await supabase.from("lesson_progress").upsert(
        {
          member_access_id: access.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "member_access_id,lesson_id" }
      );
      setCompletedLessons((prev) => new Set(prev).add(lessonId));
    }
  };

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const progressPercent = totalLessons > 0 ? (completedLessons.size / totalLessons) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || !access || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Você precisa de um link de acesso válido para entrar na área de membros.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Checkout
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg leading-tight">{course.title}</h1>
              <p className="text-xs text-muted-foreground">{totalLessons} aulas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{Math.round(progressPercent)}% concluído</span>
              <Progress value={progressPercent} className="w-32 h-2" />
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Sidebar - Modules & Lessons */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-2">
              {modules.map((mod) => (
                <div key={mod.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setActiveModuleId(activeModuleId === mod.id ? null : mod.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-display font-semibold text-sm text-foreground">{mod.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {mod.lessons.filter((l) => completedLessons.has(l.id)).length}/{mod.lessons.length}
                    </Badge>
                  </button>

                  <AnimatePresence>
                    {activeModuleId === mod.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Separator />
                        <div className="p-2 space-y-0.5">
                          {mod.lessons.map((lesson) => {
                            const isActive = activeLesson?.id === lesson.id;
                            const isCompleted = completedLessons.has(lesson.id);
                            const Icon = contentTypeIcons[lesson.content_type] || FileText;

                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setActiveLesson(lesson)}
                                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left text-sm transition-colors ${
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted/50 text-foreground"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <Icon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                                <span className="truncate">{lesson.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-8 xl:col-span-9">
            {activeLesson ? (
              <motion.div
                key={activeLesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">{activeLesson.title}</h2>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {activeLesson.content_type === "text" && "Texto"}
                          {activeLesson.content_type === "link" && "Link Externo"}
                          {activeLesson.content_type === "pdf" && "Arquivo PDF"}
                          {activeLesson.content_type === "video_embed" && "Vídeo"}
                        </Badge>
                      </div>
                      <Button
                        variant={completedLessons.has(activeLesson.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleLessonComplete(activeLesson.id)}
                      >
                        {completedLessons.has(activeLesson.id) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Concluída
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4 mr-1.5" />
                            Marcar como concluída
                          </>
                        )}
                      </Button>
                    </div>

                    <Separator className="mb-6" />

                    {/* Content rendering by type */}
                    {activeLesson.content_type === "text" && activeLesson.content && (
                      <div className="prose prose-sm max-w-none text-foreground">
                        <div className="whitespace-pre-wrap">{activeLesson.content}</div>
                      </div>
                    )}

                    {activeLesson.content_type === "link" && activeLesson.content && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Acesse o material no link abaixo:</p>
                        <a
                          href={activeLesson.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir Link
                        </a>
                      </div>
                    )}

                    {activeLesson.content_type === "pdf" && (
                      <div className="space-y-4">
                        {activeLesson.content && (
                          <p className="text-sm text-muted-foreground">{activeLesson.content}</p>
                        )}
                        {activeLesson.file_url && (
                          <a
                            href={activeLesson.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Arquivo
                          </a>
                        )}
                      </div>
                    )}

                    {activeLesson.content_type === "video_embed" && activeLesson.content && (
                      <div className="space-y-4">
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <iframe
                            src={activeLesson.content}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                    Selecione uma aula
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha uma aula no menu lateral para começar.
                  </p>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MemberArea;
