import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  GraduationCap,
  User,
  LogOut,
  BookOpen,
  Loader2,
  Lock,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "orders" | "courses" | "profile";

const CustomerPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { user, loading: authLoading } = useAuth();

  // If user is authenticated but has no token, resolve destination automatically
  useEffect(() => {
    if (authLoading || token || !user) return;

    let cancelled = false;

    const routeUser = async () => {
      try {
        const destination = await resolveUserDestination();
        if (!cancelled) {
          navigate(destination, { replace: true });
        }
      } catch {
        if (!cancelled) {
          navigate("/completar-perfil", { replace: true });
        }
      }
    };

    routeUser();

    return () => {
      cancelled = true;
    };
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
      // Get member access by token to find customer
      const { data: accessData } = await supabase
        .from("member_access")
        .select("customer_id, course_id")
        .eq("access_token", token!)
        .limit(1)
        .maybeSingle();

      if (!accessData) {
        toast.error("Link inválido ou expirado");
        setLoading(false);
        return;
      }

      // Load customer
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", accessData.customer_id)
        .single();

      if (customerData) {
        setCustomer(customerData);
        setEditName(customerData.name);
        setEditPhone(customerData.phone || "");
      }

      // Load orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", accessData.customer_id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);

      // Load courses via member_access
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

  const handleSaveProfile = async () => {
    if (!customer) return;
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({ name: editName, phone: editPhone })
      .eq("id", customer.id);
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Dados atualizados!");
      setCustomer({ ...customer, name: editName, phone: editPhone });
    }
    setSaving(false);
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const statusLabels: Record<string, { label: string; className: string }> = {
    paid: { label: "Pago", className: "bg-primary/10 text-primary" },
    approved: { label: "Aprovado", className: "bg-primary/10 text-primary" },
    pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
    refunded: { label: "Reembolsado", className: "bg-destructive/10 text-destructive" },
    expired: { label: "Expirado", className: "bg-muted text-muted-foreground" },
  };

  const tabs: { key: Tab; label: string; icon: typeof ShoppingCart }[] = [
    { key: "orders", label: "Meus Pedidos", icon: ShoppingCart },
    { key: "courses", label: "Meus Cursos", icon: GraduationCap },
    { key: "profile", label: "Meus Dados", icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2">
            <img src="/brand-icon.webp" alt="PayCheckout" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold text-foreground tracking-tight">PayCheckout</span>
          </div>

          {/* Main card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Área do Comprador</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para acessar seus pedidos e cursos, utilize o link exclusivo que enviamos para seu e-mail de compra.
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-medium text-foreground">Como acessar?</p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Abra o e-mail de confirmação de compra</li>
                <li>Clique no botão <strong className="text-foreground">"Acessar Minha Conta"</strong></li>
                <li>Pronto! Você será direcionado automaticamente</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Button onClick={() => navigate("/login")} className="w-full gap-2">
                Entrar com Google
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full gap-2">
                Voltar ao início
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Problemas para acessar? Entre em contato com o produtor do seu curso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground">Olá, {customer.name.split(" ")[0]}!</h1>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Painel do Produtor</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Orders */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">Meus Pedidos</h2>
            {orders.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhum pedido encontrado.</CardContent></Card>
            ) : (
              orders.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, className: "bg-muted" };
                return (
                  <Card key={order.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
                          <p className="font-display font-bold text-foreground">{fmt(Number(order.amount))}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {order.payment_method === "pix" ? "PIX" : "Cartão"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <Badge className={`${st.className} border-0`}>{st.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Courses */}
        {activeTab === "courses" && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">Meus Cursos</h2>
            {courses.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhum curso disponível.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.map((course: any) => (
                  <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    {course.cover_image_url && (
                      <div className="h-32 bg-muted">
                        <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-display font-bold text-foreground mb-1">{course.title}</h3>
                      {course.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/membros?token=${course.access_token}`)}
                      >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Acessar Curso
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Meus Dados</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input value={customer.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>CPF</Label>
                  <Input value={customer.cpf || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPortal;
