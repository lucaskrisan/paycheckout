import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Crown,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Lock,
  PlayCircle,
  ShoppingCart,
  Sparkles,
  Star,
  Trophy,
  User,
  Video,
  ChevronDown,
  ChevronRight,
  X,
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

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  active: boolean;
}

interface OtherCourse {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  product_id: string | null;
  product?: Product | null;
  hasAccess: boolean;
}

const contentTypeIcons: Record<string, typeof FileText> = {
  text: FileText,
  link: Link2,
  pdf: Download,
  video_embed: Video,
};

const contentTypeLabels: Record<string, string> = {
  text: "Texto",
  link: "Link Externo",
  pdf: "Arquivo PDF",
  video_embed: "Vídeo",
};

const MemberArea = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  // Create a supabase client that sends x-access-token header for RLS
  const tokenClient = useMemo(() => {
    if (!token) return supabase;
    return createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: { "x-access-token": token },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<MemberAccess | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [otherCourses, setOtherCourses] = useState<OtherCourse[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadMemberData();
  }, [token]);

  const loadMemberData = async () => {
    try {
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

      if (accessData.expires_at && new Date(accessData.expires_at) < new Date()) {
        toast.error("Seu acesso expirou.");
        setLoading(false);
        return;
      }

      setAccess(accessData);

      // Load customer name
      const { data: customerData } = await supabase
        .from("customers")
        .select("name")
        .eq("id", accessData.customer_id)
        .single();
      if (customerData) setCustomerName(customerData.name.split(" ")[0]);

      // Load course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", accessData.course_id)
        .single();
      if (courseData) setCourse(courseData);

      // Load modules + lessons
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
          modulesWithLessons.push({ ...mod, lessons: lessonsData || [] });
        }
        setModules(modulesWithLessons);
        if (modulesWithLessons.length > 0) {
          setActiveModuleId(modulesWithLessons[0].id);
          if (modulesWithLessons[0].lessons.length > 0) {
            setActiveLesson(modulesWithLessons[0].lessons[0]);
          }
        }
      }

      // Load progress
      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("member_access_id", accessData.id)
        .eq("completed", true);
      if (progressData) {
        setCompletedLessons(new Set(progressData.map((p: any) => p.lesson_id)));
      }

      // Load other courses (catalog) - all courses from the system
      const { data: allCourses } = await supabase
        .from("courses")
        .select("id, title, description, cover_image_url, product_id");

      // Get all accesses for this customer
      const { data: allAccesses } = await supabase
        .from("member_access")
        .select("course_id")
        .eq("customer_id", accessData.customer_id);

      const accessedCourseIds = new Set((allAccesses || []).map((a: any) => a.course_id));

      if (allCourses) {
        const coursesWithProducts: OtherCourse[] = [];
        for (const c of allCourses) {
          if (c.id === accessData.course_id) continue;
          let product: Product | null = null;
          if (c.product_id) {
            const { data: prodData } = await supabase
              .from("products")
              .select("*")
              .eq("id", c.product_id)
              .eq("active", true)
              .single();
            product = prodData;
          }
          coursesWithProducts.push({
            ...c,
            product: product,
            hasAccess: accessedCourseIds.has(c.id),
          });
        }
        setOtherCourses(coursesWithProducts);
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(220 20% 6%)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(145,65%,42%)] to-[hsl(160,70%,36%)] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-[hsl(220,10%,55%)] text-sm">Carregando seu conteúdo...</p>
        </motion.div>
      </div>
    );
  }

  // Access denied
  if (!token || !access || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(220 20% 6%)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center p-10 rounded-3xl border"
          style={{
            background: "hsl(220 18% 10%)",
            borderColor: "hsl(220 15% 16%)",
          }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[hsl(220,10%,25%)] to-[hsl(220,10%,18%)] flex items-center justify-center">
            <Lock className="w-10 h-10 text-[hsl(220,10%,45%)]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Acesso Restrito</h1>
          <p className="text-[hsl(220,10%,55%)] mb-6">
            Você precisa de um link de acesso válido para entrar na área de membros.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "hsl(220 18% 14%)",
              color: "hsl(0 0% 70%)",
            }}
          >
            Voltar ao Início
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 20% 6%)" }}>
      {/* ===== TOP HEADER ===== */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{
          background: "hsla(220, 20%, 6%, 0.85)",
          borderColor: "hsl(220 15% 12%)",
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo + Course */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br"
              style={{
                backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
              }}
            >
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-sm leading-tight truncate max-w-[200px] lg:max-w-[300px]">
                {course.title}
              </h1>
              <p className="text-[hsl(220,10%,45%)] text-xs">{totalLessons} aulas</p>
            </div>
          </div>

          {/* Center: Progress */}
          <div className="hidden md:flex items-center gap-3 flex-1 justify-center max-w-md">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 18% 14%)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundImage: "linear-gradient(90deg, hsl(145,65%,42%), hsl(145,80%,60%))",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: "hsl(145,65%,50%)" }}>
              {Math.round(progressPercent)}%
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
              style={{
                background: showCatalog ? "hsl(145,65%,42%)" : "hsl(220 18% 14%)",
                color: showCatalog ? "white" : "hsl(0 0% 70%)",
              }}
            >
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Catálogo</span>
            </button>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(220 18% 14%)" }}
            >
              <User className="w-4 h-4 text-[hsl(0,0%,60%)]" />
            </div>
          </div>
        </div>
      </header>

      {/* ===== CATALOG PANEL ===== */}
      <AnimatePresence>
        {showCatalog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-b"
            style={{
              background: "hsl(220 18% 8%)",
              borderColor: "hsl(220 15% 12%)",
            }}
          >
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <Star className="w-5 h-5 text-[hsl(45,93%,55%)]" />
                    Outros Cursos Disponíveis
                  </h2>
                  <p className="text-[hsl(220,10%,45%)] text-sm mt-1">
                    Expanda seu conhecimento com mais conteúdos exclusivos
                  </p>
                </div>
                <button onClick={() => setShowCatalog(false)} className="text-[hsl(220,10%,45%)] hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {otherCourses.length === 0 ? (
                <p className="text-[hsl(220,10%,40%)] text-sm">Nenhum outro curso disponível no momento.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {otherCourses.map((c, index) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-2xl"
                      style={{
                        background: "hsl(220 18% 10%)",
                        borderColor: c.hasAccess ? "hsl(145,65%,30%)" : "hsl(220 15% 16%)",
                      }}
                    >
                      {/* Cover image */}
                      <div className="relative h-36 overflow-hidden">
                        {c.cover_image_url ? (
                          <img
                            src={c.cover_image_url}
                            alt={c.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              backgroundImage: c.hasAccess
                                ? "linear-gradient(135deg, hsl(145,65%,20%), hsl(160,70%,15%))"
                                : "linear-gradient(135deg, hsl(220,18%,14%), hsl(220,15%,18%))",
                            }}
                          >
                            <GraduationCap className="w-10 h-10 text-[hsl(220,10%,30%)]" />
                          </div>
                        )}

                        {/* Overlay */}
                        {!c.hasAccess && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-white/60" />
                            </div>
                          </div>
                        )}

                        {c.hasAccess && (
                          <div className="absolute top-2 right-2">
                            <div className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[hsl(145,65%,42%)] text-white">
                              Liberado
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-white font-bold text-sm mb-1 truncate">{c.title}</h3>
                        {c.description && (
                          <p className="text-[hsl(220,10%,45%)] text-xs line-clamp-2 mb-3">{c.description}</p>
                        )}

                        {c.hasAccess ? (
                          <button
                            onClick={() => {
                              // Find the access token for this course
                              supabase
                                .from("member_access")
                                .select("access_token")
                                .eq("customer_id", access!.customer_id)
                                .eq("course_id", c.id)
                                .single()
                                .then(({ data }) => {
                                  if (data) {
                                    window.location.href = `/membros?token=${data.access_token}`;
                                  }
                                });
                            }}
                            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                            style={{
                              backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
                              color: "white",
                            }}
                          >
                            <PlayCircle className="w-3.5 h-3.5 inline mr-1.5" />
                            Acessar Curso
                          </button>
                        ) : c.product ? (
                          <button
                            onClick={() => navigate(`/checkout/${c.product!.id}`)}
                            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                            style={{
                              backgroundImage: "linear-gradient(135deg, hsl(45,93%,50%), hsl(35,90%,45%))",
                              color: "hsl(220,20%,10%)",
                            }}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Comprar • R$ {c.product.price.toFixed(2).replace(".", ",")}
                          </button>
                        ) : (
                          <div className="py-2.5 rounded-xl text-xs font-medium text-center" style={{ color: "hsl(220,10%,35%)" }}>
                            <Lock className="w-3 h-3 inline mr-1" />
                            Em breve
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== WELCOME BANNER ===== */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-white text-lg sm:text-xl font-bold">
              {customerName ? `Olá, ${customerName}` : "Bem-vindo"} 👋
            </h2>
            <p className="text-[hsl(220,10%,45%)] text-sm mt-0.5">
              Continue de onde parou • {completedLessons.size}/{totalLessons} aulas concluídas
            </p>
          </div>

          {/* Mobile progress */}
          <div className="flex md:hidden items-center gap-2">
            <div className="w-12 h-12 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(220,18%,14%)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(145,65%,42%)"
                  strokeWidth="3"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4">
        <div className="grid lg:grid-cols-12 gap-5">
          {/* ===== SIDEBAR ===== */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-2">
              {modules.map((mod, modIndex) => {
                const modCompleted = mod.lessons.filter((l) => completedLessons.has(l.id)).length;
                const modTotal = mod.lessons.length;
                const isOpen = activeModuleId === mod.id;

                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: modIndex * 0.05 }}
                    className="rounded-2xl overflow-hidden border transition-colors"
                    style={{
                      background: "hsl(220 18% 10%)",
                      borderColor: isOpen ? "hsl(145,65%,25%)" : "hsl(220 15% 14%)",
                    }}
                  >
                    <button
                      onClick={() => setActiveModuleId(isOpen ? null : mod.id)}
                      className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-[hsl(220,16%,13%)]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{
                            background: modCompleted === modTotal && modTotal > 0
                              ? "hsl(145,65%,42%)"
                              : "hsl(220,18%,16%)",
                            color: modCompleted === modTotal && modTotal > 0
                              ? "white"
                              : "hsl(220,10%,50%)",
                          }}
                        >
                          {modCompleted === modTotal && modTotal > 0 ? (
                            <Trophy className="w-4 h-4" />
                          ) : (
                            modIndex + 1
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-white font-semibold text-sm block truncate">{mod.title}</span>
                          <span className="text-[hsl(220,10%,40%)] text-xs">
                            {modCompleted}/{modTotal} aulas
                          </span>
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-[hsl(220,10%,40%)] flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[hsl(220,10%,40%)] flex-shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mx-4 mb-3 border-t pt-2 space-y-0.5"
                            style={{ borderColor: "hsl(220 15% 14%)" }}
                          >
                            {mod.lessons.map((lesson) => {
                              const isActive = activeLesson?.id === lesson.id;
                              const isCompleted = completedLessons.has(lesson.id);
                              const Icon = contentTypeIcons[lesson.content_type] || FileText;

                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => setActiveLesson(lesson)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all"
                                  style={{
                                    background: isActive ? "hsl(145,65%,42%)" : "transparent",
                                    color: isActive ? "white" : "hsl(0,0%,75%)",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.background = "hsl(220,16%,14%)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.background = "transparent";
                                  }}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2
                                      className="w-4 h-4 flex-shrink-0"
                                      style={{ color: isActive ? "white" : "hsl(145,65%,50%)" }}
                                    />
                                  ) : (
                                    <Circle className="w-4 h-4 flex-shrink-0 text-[hsl(220,10%,30%)]" />
                                  )}
                                  <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                                  <span className="truncate text-[13px]">{lesson.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Other Courses Quick Access */}
              {otherCourses.length > 0 && (
                <button
                  onClick={() => setShowCatalog(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.01]"
                  style={{
                    background: "linear-gradient(135deg, hsl(220,18%,10%), hsl(220,15%,12%))",
                    borderColor: "hsl(45,93%,30%)",
                  }}
                >
                  <Crown className="w-5 h-5 text-[hsl(45,93%,55%)]" />
                  <div className="text-left">
                    <span className="text-white text-sm font-semibold block">Explorar mais cursos</span>
                    <span className="text-[hsl(220,10%,40%)] text-xs">{otherCourses.length} disponíveis</span>
                  </div>
                </button>
              )}
            </div>
          </aside>

          {/* ===== MAIN CONTENT AREA ===== */}
          <main className="lg:col-span-8 xl:col-span-9">
            {activeLesson ? (
              <motion.div
                key={activeLesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    background: "hsl(220 18% 10%)",
                    borderColor: "hsl(220 15% 14%)",
                  }}
                >
                  {/* Lesson Header */}
                  <div
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b"
                    style={{ borderColor: "hsl(220 15% 14%)" }}
                  >
                    <div>
                      <h2 className="text-white font-bold text-lg sm:text-xl">{activeLesson.title}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            background: "hsl(220,18%,16%)",
                            color: "hsl(220,10%,55%)",
                          }}
                        >
                          {(() => {
                            const Icon = contentTypeIcons[activeLesson.content_type] || FileText;
                            return <Icon className="w-3 h-3" />;
                          })()}
                          {contentTypeLabels[activeLesson.content_type] || activeLesson.content_type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLessonComplete(activeLesson.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap hover:scale-[1.02]"
                      style={{
                        background: completedLessons.has(activeLesson.id)
                          ? "hsl(145,65%,42%)"
                          : "hsl(220,18%,16%)",
                        color: completedLessons.has(activeLesson.id)
                          ? "white"
                          : "hsl(0,0%,60%)",
                      }}
                    >
                      {completedLessons.has(activeLesson.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Concluída
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4" />
                          Marcar como concluída
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lesson Content */}
                  <div className="p-5 sm:p-6 lg:p-8">
                    {activeLesson.content_type === "text" && activeLesson.content && (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-[hsl(0,0%,80%)] leading-relaxed">
                          {activeLesson.content}
                        </div>
                      </div>
                    )}

                    {activeLesson.content_type === "link" && activeLesson.content && (
                      <div className="space-y-4">
                        <p className="text-[hsl(220,10%,50%)] text-sm">Acesse o material no link abaixo:</p>
                        <a
                          href={activeLesson.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg"
                          style={{
                            backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
                            color: "white",
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir Link
                        </a>
                      </div>
                    )}

                    {activeLesson.content_type === "pdf" && (
                      <div className="space-y-4">
                        {activeLesson.content && (
                          <p className="text-[hsl(220,10%,50%)] text-sm">{activeLesson.content}</p>
                        )}
                        {activeLesson.file_url && (
                          <a
                            href={activeLesson.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg"
                            style={{
                              backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
                              color: "white",
                            }}
                          >
                            <Download className="w-4 h-4" />
                            Baixar Arquivo
                          </a>
                        )}
                      </div>
                    )}

                    {activeLesson.content_type === "video_embed" && activeLesson.content && (
                      <div className="space-y-4">
                        <div className="aspect-video rounded-xl overflow-hidden" style={{ background: "hsl(220,20%,6%)" }}>
                          <iframe
                            src={activeLesson.content}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next lesson navigation */}
                {(() => {
                  const allLessons = modules.flatMap((m) => m.lessons);
                  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson.id);
                  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
                  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;

                  return (
                    <div className="flex items-center justify-between mt-4 gap-3">
                      {prevLesson ? (
                        <button
                          onClick={() => setActiveLesson(prevLesson)}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all hover:bg-[hsl(220,16%,14%)]"
                          style={{ color: "hsl(0,0%,60%)" }}
                        >
                          ← Anterior
                        </button>
                      ) : (
                        <div />
                      )}
                      {nextLesson && (
                        <button
                          onClick={() => {
                            setActiveLesson(nextLesson);
                            // Find and open the module containing the next lesson
                            const nextModule = modules.find((m) =>
                              m.lessons.some((l) => l.id === nextLesson.id)
                            );
                            if (nextModule) setActiveModuleId(nextModule.id);
                          }}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                          style={{
                            backgroundImage: "linear-gradient(135deg, hsl(145,65%,42%), hsl(160,70%,36%))",
                            color: "white",
                          }}
                        >
                          Próxima Aula →
                        </button>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border p-12 text-center"
                style={{
                  background: "hsl(220 18% 10%)",
                  borderColor: "hsl(220 15% 14%)",
                }}
              >
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(220,18%,14%)" }}
                >
                  <PlayCircle className="w-10 h-10 text-[hsl(145,65%,42%)]" />
                </div>
                <h3 className="text-white text-lg font-bold mb-2">Selecione uma aula</h3>
                <p className="text-[hsl(220,10%,45%)] text-sm">
                  Escolha uma aula no menu lateral para começar sua jornada.
                </p>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MemberArea;
