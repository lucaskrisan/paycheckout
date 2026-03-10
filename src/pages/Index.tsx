import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, LogIn, ShieldCheck, CreditCard, GraduationCap } from "lucide-react";

const Index = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Logged-in admin → go to dashboard
  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Logged-in non-admin → show "access denied" or redirect
  if (user) {
    return <Navigate to="/minha-conta" replace />;
  }

  // Not logged in → show landing/login page
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-checkout-surface text-checkout-surface-foreground py-3">
        <div className="container max-w-5xl mx-auto flex items-center justify-between px-4">
          <span className="font-display font-bold text-lg">PayCheckout</span>
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn className="w-4 h-4" /> Entrar
            </Button>
          </Link>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-16 lg:py-24">
        <div className="text-center space-y-6 mb-16">
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">
            Venda seus produtos digitais com checkout otimizado
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie produtos, configure pagamentos via PIX e cartão, e entregue cursos automaticamente para seus clientes.
          </p>
          <Link to="/login">
            <Button size="lg" className="h-14 px-8 text-base font-display font-bold rounded-xl shadow-lg shadow-primary/25 mt-4">
              Começar agora
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground">Checkout Inteligente</h3>
            <p className="text-sm text-muted-foreground">PIX com desconto automático, cartão parcelado e timer de urgência para aumentar conversões.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground">Área de Membros</h3>
            <p className="text-sm text-muted-foreground">Entregue cursos com módulos e aulas automaticamente após a compra.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground">Painel Completo</h3>
            <p className="text-sm text-muted-foreground">Dashboard com métricas, gestão de pedidos, clientes e produtos em um só lugar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
