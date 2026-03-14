import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Settings,
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

const CustomerPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { user, loading: authLoading, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (token || authLoading) return;
    navigate(user ? "/completar-perfil" : "/login?signup=true", { replace: true });
  }, [token, user, authLoading, navigate]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    try {
      const { data: accessData } = await supabase
        .from("member_access")
        .select("customer_id, course_id")
        .eq("access_token", token!)
        .limit(1)
        .maybeSingle();

      if (!accessData) {
        toast.error("Link inválido ou expirado");
        navigate(user ? "/completar-perfil" : "/login?signup=true", { replace: true });
        setLoading(false);
        return;
      }

      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", accessData.customer_id)
        .single();

      if (!customerData) {
        navigate(user ? "/completar-perfil" : "/login?signup=true", { replace: true });
        setLoading(false);
        return;
      }

      setCustomer(customerData);

      const { data: accessList } = await supabase
        .from("member_access")
        .select("*, courses(*)")
        .eq("customer_id", accessData.customer_id);

      if (accessList) {
        setCourses(
          accessList.map((a: any) => ({
            ...a.courses,
            access_token: a.access_token,
          }))
        );
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const filteredCourses = courses.filter((c) => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || !customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = customer.name?.split(" ")[0] || "Aluno";

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
              <p className="text-sm font-medium text-foreground">{customer.name}</p>
              <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/minha-conta?token=${token}`)}>
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
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ativos</SelectItem>
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
            {filteredCourses.map((course: any) => (
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
                  <h3 className="font-bold text-foreground text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                    {course.title}
                  </h3>
                  <button
                    onClick={() => navigate(`/membros?token=${course.access_token}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    Acessar
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
