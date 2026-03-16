import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import panteraMascot from "@/assets/pantera-mascot.png";
import { motion } from "framer-motion";

import { toast } from "sonner";
import { Eye, EyeOff, Shield, Zap, TrendingUp, Lock } from "lucide-react";

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left side — Authority branding panel */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden">
        {/* Deep dark background */}
        <div className="absolute inset-0 bg-background" />

        {/* Animated glow orbs */}
        <motion.div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(0,230,118,0.12) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={panteraMascot} alt="PanteraPay" className="w-12 h-12 drop-shadow-[0_0_20px_rgba(0,230,118,0.4)]" />
            <span className="font-display font-extrabold text-2xl tracking-tight text-foreground">
              Pantera<span className="text-primary">Pay</span>
            </span>
          </div>

          {/* Main value prop */}
          <div className="space-y-8 max-w-lg">
            <motion.h2
              className="text-4xl xl:text-5xl font-black text-foreground leading-[1.08] tracking-[-0.03em] font-display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              A infraestrutura de{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #00E676, #D4AF37)" }}>
                pagamentos
              </span>{" "}
              que escala com você.
            </motion.h2>

            <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md">
              Checkout de alta conversão, multi-gateway, rastreamento perfeito e área de membros integrada. Tudo que você precisa para faturar sem limite.
            </p>

            {/* Authority metrics */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              {[
                { value: "99.9%", label: "Uptime", icon: Shield },
                { value: "<2s", label: "PIX confirmado", icon: Zap },
                { value: "+34%", label: "Conversão média", icon: TrendingUp },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="bg-card/60 border border-border rounded-xl p-4 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                >
                  <stat.icon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-xl font-black text-foreground font-mono">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Trust footer */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-[0.15em] font-medium">
                Criptografia de ponta a ponta · PCI DSS Compliant
              </span>
            </div>
            <div className="flex items-center gap-6">
              {["Mercado Pago", "Asaas", "Stripe", "Pagar.me"].map((name) => (
                <span key={name} className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.1em]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-8 overflow-y-auto">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-8">
          <img src={panteraMascot} alt="PanteraPay" className="w-10 h-10 drop-shadow-[0_0_12px_rgba(0,230,118,0.3)]" />
          <span className="font-display font-extrabold text-xl tracking-tight text-foreground">
            Pantera<span className="text-primary">Pay</span>
          </span>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {isSignUp ? "Crie sua conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp
                ? "Comece a vender em minutos. Sem taxa de adesão."
                : "Entre na sua conta para continuar."}
            </p>
          </div>

          {/* Google sign in — first for authority */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-2.5 font-semibold border-border hover:bg-muted/50 mb-5"
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

          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-border" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">ou com e-mail</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-11 bg-card border-border"
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
                placeholder="seu@email.com"
                className="h-11 bg-card border-border"
                required
              />
            </div>

            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 border border-border rounded-md px-3 h-11 shrink-0 bg-card">
                    <span className="text-base">🇧🇷</span>
                    <span className="text-sm text-muted-foreground">+55</span>
                  </div>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 96123-4567"
                    maxLength={15}
                    className="h-11 bg-card border-border flex-1"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                {!isSignUp && (
                  <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10 h-11 bg-card border-border"
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
                    <div className="flex items-center gap-1.5 border border-border rounded-md px-3 h-11 shrink-0 bg-card">
                      <span className="text-base">🇧🇷</span>
                      <span className="text-sm text-muted-foreground">Brasil</span>
                    </div>
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                      placeholder="CPF ou CNPJ"
                      maxLength={18}
                      className="h-11 bg-card border-border flex-1"
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
                    Concordo com os{" "}
                    <span className="text-primary font-medium hover:underline">Termos de Serviço</span> e{" "}
                    <span className="text-primary font-medium hover:underline">Política de Privacidade</span>.
                  </label>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full h-12 font-bold mt-2 text-[14px] shadow-[0_4px_20px_rgba(0,230,118,0.25)] hover:shadow-[0_4px_30px_rgba(0,230,118,0.4)] transition-all"
              disabled={loading}
            >
              {loading ? "Aguarde..." : isSignUp ? "Criar conta grátis" : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? (
                <>Já tem conta? <span className="text-primary font-semibold">Entrar</span></>
              ) : (
                <>Novo por aqui? <span className="text-primary font-semibold">Criar conta grátis</span></>
              )}
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Termos</span>
            <span>·</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacidade</span>
            <span>·</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Suporte</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
