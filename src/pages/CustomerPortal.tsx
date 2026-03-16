import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import {
  User,
  LogOut,
  BookOpen,
  Loader2,
  LayoutDashboard,
  Search,
  PlayCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PortalCourse {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  access_token?: string;
  source: "created" | "purchased";
}

const CustomerPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [courses, setCourses] = useState<PortalCourse[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { user, loading: authLoading, isAdmin, signOut } = useAuth();

  // Token-based Supabase client (sends x-access-token header for RLS)
  const tokenClient = useMemo(() => {
    if (!token) return supabase;
    return createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: { headers: { "x-access-token": token } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }, [token]);

  // MODE 1: Token-based (buyer accessing via link)
  // MODE 2: Authenticated admin/producer (preview their own courses + purchased)
  const isAuthMode = !token && !!user;

  useEffect(() => {
    if (authLoading) return;
    if (!token && !user) {
      navigate("/login?signup=true", { replace: true });
      return;
    }
    if (token) {
      loadTokenData();
    } else if (user) {
      loadAuthData();
    }
  }, [token, user, authLoading]);

  // Load data via access_token (buyer mode)
  const loadTokenData = async () => {
    try {
      const { data: accessData } = await tokenClient
        .from("member_access")
        .select("customer_id, course_id")
        .eq("access_token", token!)
        .limit(1)
        .maybeSingle();

      if (!accessData) {
        toast.error("Link inválido ou expirado");
        navigate("/login?signup=true", { replace: true });
        setLoading(false);
        return;
      }

      const { data: customerData } = await tokenClient
        .from("customers")
        .select("*")
        .eq("id", accessData.customer_id)
        .single();

      if (customerData) {
        setCustomerName(customerData.name);
        setCustomerEmail(customerData.email);
      }

      const { data: accessList } = await supabase
        .from("member_access")
        .select("*, courses(*)")
        .eq("customer_id", accessData.customer_id);

      if (accessList) {
        setCourses(
          accessList.map((a: any) => ({
            ...a.courses,
            access_token: a.access_token,
            source: "purchased" as const,
          }))
        );
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };

  // Load data via authenticated user (producer preview mode)
  const loadAuthData = async () => {
    try {
      const userId = user!.id;
      const email = user!.email || "";

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      setCustomerName(profile?.full_name || email.split("@")[0]);
      setCustomerEmail(email);

      const allCourses: PortalCourse[] = [];

      // 1. All products created by this producer
      const { data: ownProducts } = await supabase
        .from("products")
        .select("id, name, description, image_url")
        .eq("user_id", userId);

      // 2. Courses created by this producer (may be linked to products)
      const { data: ownCourses } = await supabase
        .from("courses")
        .select("id, title, description, cover_image_url, product_id")
        .eq("user_id", userId);

      const courseByProductId = new Map<string, any>();
      const addedIds = new Set<string>();

      if (ownCourses) {
        for (const c of ownCourses) {
          if (c.product_id) courseByProductId.set(c.product_id, c);
          allCourses.push({
            id: c.id,
            title: c.title,
            description: c.description,
            cover_image_url: c.cover_image_url,
            source: "created",
          });
          addedIds.add(c.id);
        }
      }

      // Add products that DON'T have a course yet (show as product cards)
      if (ownProducts) {
        for (const p of ownProducts) {
          if (!courseByProductId.has(p.id)) {
            allCourses.push({
              id: `product-${p.id}`,
              title: p.name,
              description: p.description,
              cover_image_url: p.image_url,
              source: "created",
            });
          }
        }
      }

      // 2. Courses purchased (via customers table matching email)
      const { data: custData } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (custData) {
        const { data: accessList } = await supabase
          .from("member_access")
          .select("access_token, courses(*)")
          .eq("customer_id", custData.id);

        if (accessList) {
          for (const a of accessList as any[]) {
            // Avoid duplicates if producer bought their own course
            if (!allCourses.some((c) => c.id === a.courses?.id)) {
              allCourses.push({
                ...a.courses,
                access_token: a.access_token,
                source: "purchased",
              });
            }
          }
        }
      }

      setCourses(allCourses);
    } catch (err) {
      console.error("Auth portal error:", err);
    }
    setLoading(false);
  };

  const handleOpenCourse = async (course: PortalCourse) => {
    if (course.access_token) {
      navigate(`/membros?token=${course.access_token}`);
      return;
    }

    // Product without a linked course — nothing to preview yet
    if (course.id.startsWith("product-")) {
      toast.info("Este produto ainda não possui uma área de membros vinculada. Crie um curso na aba 'Área de Membros' do produto.");
      return;
    }

    // Producer previewing own course — find or create a temporary access
    const { data: existing } = await supabase
      .from("member_access")
      .select("access_token")
      .eq("course_id", course.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      navigate(`/membros?token=${existing.access_token}`);
    } else {
      const email = user?.email || "";
      let customerId: string | null = null;

      const { data: custData } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (custData) {
        customerId = custData.id;
      } else {
        const { data: newCust } = await supabase
          .from("customers")
          .insert({ name: customerName || "Produtor", email, user_id: user!.id })
          .select("id")
          .single();
        customerId = newCust?.id || null;
      }

      if (!customerId) {
        toast.error("Erro ao criar acesso de preview");
        return;
      }

      const { data: newAccess, error: accessError } = await supabase
        .from("member_access")
        .insert({ course_id: course.id, customer_id: customerId })
        .select("access_token")
        .single();

      if (accessError || !newAccess) {
        console.error("Error creating preview access:", accessError);
        toast.error("Erro ao criar acesso de preview");
        return;
      }

      navigate(`/membros?token=${newAccess.access_token}`);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "created") return c.source === "created";
    if (filter === "purchased") return c.source === "purchased";
    return true;
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = customerName?.split(" ")[0] || "Aluno";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ===== GREEN HEADER BAR ===== */}
      <header className="bg-primary h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-primary-foreground font-bold text-sm sm:text-base">{firstName}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium text-foreground">{customerName}</p>
              <p className="text-xs text-muted-foreground truncate">{customerEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/minha-conta" + (token ? `?token=${token}` : ""))}>
              <BookOpen className="w-4 h-4 mr-2" />
              Meus cursos
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Mudar para painel do produtor
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOut(); navigate("/login"); }}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Meus Cursos</h1>

        {/* Search + Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {isAuthMode && <SelectItem value="created">Meus cursos</SelectItem>}
              <SelectItem value="purchased">Comprados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Courses grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum curso encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
              >
                {/* Cover image */}
                <div className="aspect-video bg-muted overflow-hidden">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <BookOpen className="w-12 h-12 text-primary/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-foreground text-sm line-clamp-2 flex-1 min-h-[2.5rem]">
                      {course.title}
                    </h3>
                    {isAuthMode && course.source === "created" && (
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                        Meu curso
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenCourse(course)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    {course.source === "created" && !course.access_token ? "Visualizar" : "Acessar"}
                    <PlayCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerPortal;
