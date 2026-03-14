import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

import { toast } from "sonner";
import { Eye, EyeOff, Star, Zap } from "lucide-react";

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    // Redirect to root — Index.tsx is the single source of truth for routing
    navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!acceptTerms) {
          toast.error("Aceite os termos para continuar");
          setLoading(false);
          return;
        }
        await signUp(email, password, fullName, {
          phone: phone,
          cpf: cpf,
        });
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-8 bg-background overflow-y-auto">
        <div className="w-full max-w-[460px]">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-10">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {isSignUp ? "Crie sua conta" : "Acesse sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp ? "Informe seus dados para continuar." : "Bem-vindo de volta ao PayCheckout."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome completo"
                  className="h-11 bg-background"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="h-11 bg-background"
                required
              />
            </div>

            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 border border-input rounded-md px-3 h-11 shrink-0 bg-background">
                    <span className="text-base">🇧🇷</span>
                    <span className="text-sm text-muted-foreground">+55</span>
                  </div>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 96123-4567"
                    maxLength={15}
                    className="h-11 bg-background flex-1"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
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

            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-sm font-medium">CPF ou CNPJ</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 border border-input rounded-md px-3 h-11 shrink-0 bg-background">
                      <span className="text-base">🇧🇷</span>
                      <span className="text-sm text-muted-foreground">Brasil</span>
                    </div>
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                      placeholder="CPF ou CNPJ"
                      maxLength={18}
                      className="h-11 bg-background flex-1"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(v) => setAcceptTerms(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    Ao criar a conta, concordo com os{" "}
                    <span className="text-primary font-medium hover:underline">Termos de Serviço</span> e{" "}
                    <span className="text-primary font-medium hover:underline">Política de Privacidade</span>.
                  </label>
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={loading}>
              {loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase">ou</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2.5 font-medium border-border hover:bg-muted/50"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Conectando..." : isSignUp ? "Cadastrar com Google" : "Entrar com Google"}
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? (
                <>Já possui uma conta no PayCheckout? <span className="text-primary font-semibold">Acessar</span></>
              ) : (
                <>Não tem conta? <span className="text-primary font-semibold">Cadastre-se grátis</span></>
              )}
            </button>
          </div>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Termos de Serviço</span>
            <span>·</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Política de Privacidade</span>
          </div>
        </div>
      </div>

      {/* Right side - Dark branding panel */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[hsl(220,28%,8%)] overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Glow effects */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 -left-10 w-60 h-60 bg-primary/5 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 w-full">
          <div className="space-y-8 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Seu produto digital faturando com automações reais de maneira eficiente
            </h2>

            <p className="text-emerald-400/80 italic text-base">
              "PayCheckout é o ecossistema que faltava para eu escalar milhões."
            </p>

            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-white/70 text-sm ml-2">— G. Franklim</span>
            </div>

            {/* Dashboard preview mockup */}
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-1 shadow-2xl">
              <div className="rounded-lg bg-[hsl(220,25%,12%)] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-white/80 text-xs font-medium">PayCheckout</span>
                  <span className="text-white/40 text-xs ml-auto">Dashboard</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Vendas", value: "R$ 16.36", color: "text-emerald-400" },
                    { label: "Pedidos", value: "63", color: "text-blue-400" },
                    { label: "Conversão", value: "4.2%", color: "text-yellow-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/[0.04] rounded-lg p-3">
                      <p className="text-[10px] text-white/40">{stat.label}</p>
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white/[0.04] rounded-lg p-3 h-20 flex items-end gap-1">
                  {[30, 45, 25, 60, 50, 70, 40, 55, 65, 35, 50, 45].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/40 rounded-sm"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
