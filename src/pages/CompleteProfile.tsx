import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, FileText, Phone, ShieldCheck, Loader2, Trash2, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const validateCpf = (cpf: string) => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 14) return true; // CNPJ - basic length check
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  return rem === parseInt(digits[10]);
};

const CompleteProfile = () => {
  const { user, loading: authLoading, refreshRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleCpfChange = (value: string) => {
    const formatted = formatCpfCnpj(value);
    setCpf(formatted);
    setCpfError("");
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11 && cpfDigits.length !== 14) {
      setCpfError("Informe um CPF ou CNPJ válido");
      return;
    }
    if (cpfDigits.length === 11 && !validateCpf(cpf)) {
      setCpfError("CPF inválido");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Informe um telefone válido");
      return;
    }

    if (!acceptTerms) {
      toast.error("Aceite os termos para continuar");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        cpf: cpfDigits,
        phone: phoneDigits,
        profile_completed: true,
      })
      .eq("id", user!.id);

    if (error) {
      toast.error("Erro ao salvar dados");
      setSaving(false);
      return;
    }

    // Wait a moment for DB trigger to fire, then refresh roles
    await new Promise(r => setTimeout(r, 500));
    await refreshRoles();

    try {
      const destination = await resolveUserDestination();
      toast.success("Perfil completo! Redirecionando...");
      navigate(destination, { replace: true });
    } catch {
      toast.success("Perfil completo! Bem-vindo ao painel.");
      navigate("/admin", { replace: true });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userEmail = user?.email || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-slate-700/60 rounded-2xl flex items-center justify-center mx-auto border border-slate-600/30">
            <UserPlus className="w-7 h-7 text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">Complete seu Perfil</h1>
          <p className="text-sm text-slate-400">
            Precisamos de algumas informações adicionais para continuar
          </p>
        </div>

        {/* Account info card */}
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">Dados da sua conta:</p>
          <p className="text-sm text-white">
            <span className="text-slate-400">Nome:</span> {userName}
          </p>
          <p className="text-sm text-white">
            <span className="text-slate-400">Email:</span> {userEmail}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">
              CPF ou CNPJ <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={18}
                className={`pl-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary ${
                  cpfError ? "border-red-500 focus:border-red-500" : ""
                }`}
                required
              />
            </div>
            {cpfError && <p className="text-xs text-red-400">{cpfError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">
              Telefone <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 h-12 shrink-0">
                <span className="text-lg">🇧🇷</span>
                <span className="text-sm text-slate-400">+55</span>
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="pl-10 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(v) => setAcceptTerms(v === true)}
              className="mt-0.5 border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label htmlFor="terms" className="text-sm text-slate-400 leading-relaxed cursor-pointer">
              Ao completar o cadastro, concordo com os{" "}
              <span className="text-white underline">Termos de uso</span> e{" "}
              <span className="text-white underline">Política de privacidade</span>.
            </label>
          </div>

          {/* Info box */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">Por que precisamos dessas informações?</span>{" "}
              CPF ou CNPJ e telefone são obrigatórios para utilizar a plataforma. Todos os dados são criptografados e protegidos.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {saving ? "Salvando..." : "Completar Cadastro"}
          </Button>
        </form>

        <p className="text-center text-[11px] text-slate-500">
          Esses dados são necessários para emissão de certificados e notas fiscais.
        </p>
      </div>
    </div>
  );
};

export default CompleteProfile;
