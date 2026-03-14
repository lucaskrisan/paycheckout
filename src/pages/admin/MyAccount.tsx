import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, KeyRound } from "lucide-react";

const MyAccount = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setPhone(user.user_metadata?.phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    });
    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Dados salvos com sucesso");
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      toast.error("Erro ao enviar email");
    } else {
      toast.success("Email de redefinição enviado");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Configurações da Conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais e de contato</p>
      </div>

      {/* Personal Info */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <User className="w-4 h-4" /> Informações Pessoais
          </CardTitle>
          <p className="text-xs text-muted-foreground">Atualize seus dados pessoais e de contato</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Apelido</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Como você gostaria de ser chamado" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">E-mail</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Input value={user?.email || ""} disabled className="opacity-60" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">Salvar alterações</Button>
            <Button variant="outline" size="sm" onClick={() => { setFullName(user?.user_metadata?.full_name || ""); setPhone(user?.user_metadata?.phone || ""); }}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Alteração de Senha
          </CardTitle>
          <p className="text-xs text-muted-foreground">Receba um e-mail para redefinir sua senha</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleResetPassword}>Alterar Senha</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAccount;
