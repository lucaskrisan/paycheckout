import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { toast } from "sonner";
import { Mail, Eye, EyeOff, User, ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;

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
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error("Erro ao entrar com Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">PayCheckout</span>
          </div>

          {/* Main content */}
          <div className="space-y-8 max-w-lg">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Venda mais com
              <br />
              checkout de alta
              <br />
              conversão
            </h2>
            <p className="text-emerald-50/80 text-lg leading-relaxed">
              Plataforma completa para infoprodutores: checkout otimizado, 
              rastreamento avançado e gestão financeira em um só lugar.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: ShieldCheck, text: "Pagamentos seguros com Pix, cartão e boleto" },
                { icon: BarChart3, text: "Rastreamento avançado com Pixel + CAPI" },
                { icon: Zap, text: "Checkout otimizado para alta conversão" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <feature.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-emerald-50/90">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-6">
            <p className="text-xs text-emerald-100/50">
              © {new Date().getFullYear()} PayCheckout. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">PayCheckout</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {isSignUp ? "Crie sua conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp
                ? "Preencha os dados abaixo para começar"
                : "Entre na sua conta para acessar o painel"}
            </p>
          </div>

          {/* Google button first */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2.5 mb-5 border-border hover:bg-muted/50 font-medium"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Conectando..." : "Continuar com Google"}
          </Button>

          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground font-medium">ou com e-mail</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-10 h-11 bg-background"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10 h-11 bg-background"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10 h-11 bg-background"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold gap-2 mt-2" disabled={loading}>
              {loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? (
                <>Já tem conta? <span className="text-primary font-medium">Fazer login</span></>
              ) : (
                <>Não tem conta? <span className="text-primary font-medium">Cadastre-se grátis</span></>
              )}
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[11px]">Dados seguros</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[11px]">Setup em minutos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
