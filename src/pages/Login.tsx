import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Lock, Mail, Eye, EyeOff, User, ArrowLeft, ArrowRight, ShoppingBag, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStep = "credentials" | "account_type" | "revenue";

const REVENUE_OPTIONS = [
  "Ainda não faturei",
  "Até R$50 mil",
  "De R$50 mil a R$500 mil",
  "De R$500 mil a R$1 milhão",
  "Mais de R$1 milhão",
];

const Login = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Onboarding state
  const [step, setStep] = useState<OnboardingStep>("credentials");
  const [accountType, setAccountType] = useState<"producer" | "buyer">("producer");
  const [revenueRange, setRevenueRange] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/minha-conta", { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleCredentialsNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast.error("Preencha todos os campos (senha mínima: 6 caracteres)");
      return;
    }
    setStep("account_type");
  };

  const handleAccountTypeNext = () => {
    if (accountType === "producer") {
      setStep("revenue");
    } else {
      doSignUp();
    }
  };

  const doSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: accountType,
            revenue_range: accountType === "producer" ? revenueRange : null,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Auto-confirm is on, sign in immediately
      await signIn(email, password);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
      setLoading(false);
    }
  };

  // ---- SIGNUP STEP VIEWS ----

  if (isSignUp && step === "account_type") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Qual é o seu tipo de cadastro?</h1>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <RadioGroup value={accountType} onValueChange={(v) => setAccountType(v as any)} className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
                <RadioGroupItem value="producer" />
                <Megaphone className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">Quero vender produtos digitais. Sou um infoprodutor, co-produtor ou afiliado.</span>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
                <RadioGroupItem value="buyer" />
                <ShoppingBag className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Preciso de ajuda com um produto que comprei pela plataforma.</span>
              </label>
            </RadioGroup>
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("credentials")} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={handleAccountTypeNext} className="gap-2" disabled={loading}>
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSignUp && step === "revenue") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Quanto você faturou com infoprodutos nos últimos 12 meses?</h1>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <RadioGroup value={revenueRange} onValueChange={setRevenueRange} className="space-y-2">
              {REVENUE_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5">
                  <RadioGroupItem value={opt} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </RadioGroup>
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("account_type")} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={doSignUp} className="gap-2" disabled={loading || !revenueRange}>
                {loading ? "Criando conta..." : "Criar conta"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- CREDENTIALS / LOGIN ----
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">PayCheckout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Crie sua conta" : "Acesse seu painel"}
          </p>
        </div>

        <form onSubmit={isSignUp ? handleCredentialsNext : handleLogin} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="pl-10 h-11" required />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 h-11" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 h-11" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 font-display font-bold" disabled={loading}>
            {loading ? "Aguarde..." : isSignUp ? "Continuar" : "Entrar"}
          </Button>

          <div className="relative flex items-center gap-2 py-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) {
                toast.error("Erro ao entrar com Google");
                setGoogleLoading(false);
              }
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Conectando..." : "Entrar com Google"}
          </Button>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setStep("credentials"); }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "Já tem conta? Fazer login" : "Criar nova conta"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
