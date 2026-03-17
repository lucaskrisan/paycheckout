import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import panteraMascot from "@/assets/pantera-mascot.png";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

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
        await signUp(email, password, fullName, { phone, cpf });
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      toast.error("Erro ao entrar com Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* LEFT — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24 overflow-y-auto relative">
        {/* Subtle ambient glow */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full blur-[160px] opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />

        <motion.div
          className="w-full max-w-[460px] mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <img src={panteraMascot} alt="PanteraPay" className="w-10 h-10 drop-shadow-[0_0_16px_hsl(var(--primary)/0.4)]" />
            <span className="font-display font-extrabold text-xl tracking-tight text-foreground">
              Pantera<span className="text-primary">Pay</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground tracking-[-0.02em] leading-tight">
              {isSignUp ? "Crie sua conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              {isSignUp
                ? "Comece a vender em minutos. Sem taxa de adesão."
                : "Entre na sua conta para continuar."}
            </p>
          </div>


          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-[52px] gap-3 font-semibold text-[14px] border-border/60 bg-card/50 hover:bg-card hover:border-border mb-6 rounded-xl transition-all duration-200"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Conectando..." : isSignUp ? "Cadastrar com Google" : "Entrar com Google"}
          </Button>

          <div className="relative flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-border/40" />
            <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-[0.15em]">ou</span>
            <div className="flex-1 border-t border-border/40" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px] font-medium text-muted-foreground">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como gostaria de ser chamado"
                  className="h-[52px] bg-card/40 border-border/50 rounded-xl text-[14px] placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-card/60 transition-all duration-200"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-muted-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-[52px] bg-card/40 border-border/50 rounded-xl text-[14px] placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-card/60 transition-all duration-200"
                required
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[13px] font-medium text-muted-foreground">Telefone</Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 border border-border/50 rounded-xl px-3.5 h-[52px] shrink-0 bg-card/40">
                    <span className="text-base">🇧🇷</span>
                    <span className="text-[13px] text-muted-foreground/60">+55</span>
                  </div>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 96123-4567"
                    maxLength={15}
                    className="h-[52px] bg-card/40 border-border/50 rounded-xl text-[14px] placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-card/60 transition-all duration-200 flex-1"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">Senha</Label>
                {!isSignUp && (
                  <button type="button" className="text-[12px] text-primary/70 hover:text-primary font-medium transition-colors">
                    Esqueceu?
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
                  className="pr-11 h-[52px] bg-card/40 border-border/50 rounded-xl text-[14px] placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-card/60 transition-all duration-200"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-[13px] font-medium text-muted-foreground">CPF ou CNPJ</Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    className="h-[52px] bg-card/40 border-border/50 rounded-xl text-[14px] placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-card/60 transition-all duration-200"
                    required
                  />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(v) => setAcceptTerms(v === true)}
                    className="mt-0.5 border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="terms" className="text-[13px] text-muted-foreground/70 leading-relaxed cursor-pointer">
                    Concordo com os{" "}
                    <span className="text-primary/80 hover:text-primary font-medium transition-colors">Termos de Serviço</span> e{" "}
                    <span className="text-primary/80 hover:text-primary font-medium transition-colors">Política de Privacidade</span>.
                  </label>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full h-[52px] font-bold text-[14px] rounded-xl gap-2 mt-1 shadow-[0_0_30px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.25)] transition-all duration-300"
              disabled={loading}
            >
              {loading ? "Aguarde..." : isSignUp ? "Criar conta grátis" : "Entrar"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {isSignUp ? (
                <>Já tem conta? <span className="text-primary font-semibold">Entrar</span></>
              ) : (
                <>Novo por aqui? <span className="text-primary font-semibold">Criar conta grátis</span></>
              )}
            </button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-4 text-[11px] text-muted-foreground/30">
            <span className="hover:text-muted-foreground/60 cursor-pointer transition-colors">Termos</span>
            <span>·</span>
            <span className="hover:text-muted-foreground/60 cursor-pointer transition-colors">Privacidade</span>
            <span>·</span>
            <span className="hover:text-muted-foreground/60 cursor-pointer transition-colors">Suporte</span>
          </div>
        </motion.div>
      </div>

      {/* RIGHT — Authority panel */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden">
        <div className="absolute inset-0 bg-card/30" />

        {/* Glow orbs */}
        <motion.div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(142 71% 45% / 0.06) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20 w-full">
          {/* Headline */}
          <motion.div
            className="space-y-6 max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.1em]">Plataforma ativa</span>
            </div>

            <h2 className="text-[2.5rem] xl:text-[3rem] font-black text-foreground leading-[1.05] tracking-[-0.03em] font-display">
              Venda mais com{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(142,71%,65%)]">
                infraestrutura
              </span>{" "}
              de verdade.
            </h2>

            <p className="text-muted-foreground/70 text-[15px] leading-relaxed">
              Multi-gateway, checkout otimizado, rastreamento perfeito e área de membros — tudo integrado.
            </p>
          </motion.div>

          {/* Social proof cards */}
          <motion.div
            className="mt-12 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {[
              { metric: "99.9%", label: "Uptime garantido", desc: "Infraestrutura enterprise" },
              { metric: "<2s", label: "PIX confirmado", desc: "Aprovação instantânea" },
              { metric: "+34%", label: "Mais conversão", desc: "Checkout otimizado" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 border border-border/30 backdrop-blur-sm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                  <span className="text-lg font-black text-primary font-mono">{item.metric}</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground">{item.label}</p>
                  <p className="text-[12px] text-muted-foreground/50">{item.desc}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-primary/40 ml-auto shrink-0" />
              </motion.div>
            ))}
          </motion.div>

          {/* Trust bar */}
          <motion.div
            className="mt-12 pt-8 border-t border-border/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/30 font-semibold mb-4">Integrado com</p>
            <div className="flex items-center gap-6">
              {["Stripe", "Mercado Pago", "Asaas", "Pagar.me"].map((name) => (
                <span key={name} className="text-[11px] font-bold text-muted-foreground/25 uppercase tracking-wide">
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
