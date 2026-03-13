import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, GraduationCap, BarChart3, Zap, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import InstallPrompt from "@/components/InstallPrompt";

const Index = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/minha-conta" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <span className="font-display font-bold text-xl text-foreground">PayCheckout</span>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/login?signup=true">
              <Button size="sm" className="gap-1.5 font-display font-bold">
                Começar grátis <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container max-w-6xl mx-auto px-4 py-20 lg:py-28">
        <motion.div
          className="text-center max-w-3xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5" />
            Plataforma completa para produtores digitais
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Venda seus produtos digitais com{" "}
            <span className="text-primary">checkout de alta conversão</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie sua conta, cadastre seu produto e comece a vender em minutos. 
            Checkout otimizado com PIX, cartão de crédito e área de membros integrada.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to="/login?signup=true">
              <Button size="lg" className="h-14 px-8 text-base font-display font-bold rounded-xl shadow-lg shadow-primary/25">
                Criar conta grátis <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Sem mensalidade</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Setup em 5 min</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Suporte incluso</span>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: CreditCard,
              title: "Checkout Inteligente",
              desc: "PIX com desconto, cartão parcelado, timer de urgência e customização visual completa.",
            },
            {
              icon: GraduationCap,
              title: "Área de Membros",
              desc: "Entregue cursos com módulos e aulas automaticamente após a confirmação do pagamento.",
            },
            {
              icon: BarChart3,
              title: "Dashboard Completo",
              desc: "Acompanhe receitas, pedidos, taxa de aprovação e conversão em tempo real.",
            },
            {
              icon: Shield,
              title: "Segurança Total",
              desc: "Pagamentos processados com criptografia SSL, checkout seguro e antifraude integrado.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="bg-card border border-border rounded-2xl p-6 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 border-t border-primary/10 py-16">
        <div className="container max-w-3xl mx-auto px-4 text-center space-y-6">
          <h2 className="font-display text-3xl font-bold text-foreground">
            Pronto para começar a vender?
          </h2>
          <p className="text-muted-foreground">
            Crie sua conta gratuita agora e tenha seu primeiro produto vendendo em minutos.
          </p>
          <Link to="/login?signup=true">
            <Button size="lg" className="h-14 px-8 text-base font-display font-bold rounded-xl shadow-lg shadow-primary/25">
              Criar minha conta <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PayCheckout. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
