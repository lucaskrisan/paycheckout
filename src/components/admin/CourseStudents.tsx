import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthOrigin } from "@/lib/getAuthOrigin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Search, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface Student {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  created_at: string;
  total_lessons: number;
  completed_lessons: number;
  access_token: string;
}

interface CourseStudentsProps {
  courseId: string;
}

const CourseStudents = ({ courseId }: CourseStudentsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", cpf: "", phone: "" });
  const [adding, setAdding] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [courseId]);

  const loadStudents = async () => {
    setLoading(true);

    // Get member_access with customer info
    const { data: accessData } = await supabase
      .from("member_access")
      .select("id, customer_id, created_at, access_token, customers(name, email)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (!accessData || accessData.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Get total lessons for this course
    const { data: modulesData } = await supabase
      .from("course_modules")
      .select("id")
      .eq("course_id", courseId);

    let totalLessons = 0;
    if (modulesData && modulesData.length > 0) {
      const moduleIds = modulesData.map((m) => m.id);
      const { count } = await supabase
        .from("course_lessons")
        .select("id", { count: "exact", head: true })
        .in("module_id", moduleIds);
      totalLessons = count || 0;
    }

    // Get completed lessons per student
    const accessIds = accessData.map((a) => a.id);
    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select("member_access_id")
      .in("member_access_id", accessIds)
      .eq("completed", true);

    const completedMap: Record<string, number> = {};
    (progressData || []).forEach((p) => {
      completedMap[p.member_access_id] = (completedMap[p.member_access_id] || 0) + 1;
    });

    const studentList: Student[] = accessData.map((a: any) => {
      const customer = a.customers as any;
      return {
        id: a.id,
        customer_id: a.customer_id,
        customer_name: customer?.name || "—",
        customer_email: customer?.email || "—",
        created_at: a.created_at,
        total_lessons: totalLessons,
        completed_lessons: completedMap[a.id] || 0,
        access_token: a.access_token,
      };
    });

    setStudents(studentList);
    setLoading(false);
  };

  const addStudent = async () => {
    if (!addForm.name || !addForm.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    setAdding(true);
    try {
      // Check if customer already exists
      let customerId: string;
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("email", addForm.email)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCustomer, error: custErr } = await supabase
          .from("customers")
          .insert({
            name: addForm.name,
            email: addForm.email,
            cpf: addForm.cpf || null,
            phone: addForm.phone || null,
          })
          .select("id")
          .single();

        if (custErr) throw custErr;
        customerId = newCustomer.id;
      }

      // Check if already has access
      const { data: existingAccess } = await supabase
        .from("member_access")
        .select("id")
        .eq("customer_id", customerId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existingAccess) {
        toast.error("Este aluno já tem acesso a este curso");
        setAdding(false);
        return;
      }

      // Create member_access
      const { data: newAccess, error: accessErr } = await supabase
        .from("member_access")
        .insert({
          customer_id: customerId,
          course_id: courseId,
        })
        .select("access_token")
        .single();

      if (accessErr) throw accessErr;

      const accessUrl = `${getAuthOrigin()}/membros?token=${newAccess.access_token}`;
      
      // Send access email via edge function
      try {
        const { data: emailResult, error: emailErr } = await supabase.functions.invoke("send-access-link", {
          body: {
            customer_id: customerId,
            course_id: courseId,
            access_token: newAccess.access_token,
          },
        });
        if (emailErr) {
          console.error("Email error:", emailErr);
          toast.success("Aluno adicionado! Link copiado.", {
            duration: 6000,
            description: accessUrl,
          });
        } else if (emailResult?.email_sent === false) {
          toast.success("Aluno adicionado! Link copiado. (Verifique seu domínio no Resend para enviar emails)", {
            duration: 8000,
            description: accessUrl,
          });
        } else {
          toast.success(`Email de acesso enviado para ${addForm.email}!`, {
            duration: 6000,
            description: accessUrl,
          });
        }
      } catch {
        toast.success("Aluno adicionado! Link copiado.", {
          duration: 6000,
          description: accessUrl,
        });
      }

      // Copy link to clipboard as backup
      navigator.clipboard.writeText(accessUrl).catch(() => {});

      setAddDialogOpen(false);
      setAddForm({ name: "", email: "", cpf: "", phone: "" });
      loadStudents();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao adicionar aluno");
    } finally {
      setAdding(false);
    }
  };

  const removeStudent = async (accessId: string, name: string) => {
    if (!confirm(`Remover o acesso de ${name} a este curso?`)) return;

    const { error } = await supabase
      .from("member_access")
      .delete()
      .eq("id", accessId);

    if (error) {
      toast.error("Erro ao remover aluno");
      return;
    }

    toast.success("Acesso removido");
    loadStudents();
  };
  const resendAccess = async (student: Student) => {
    setResending(student.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-access-link", {
        body: {
          customer_id: student.customer_id,
          course_id: courseId,
          access_token: student.access_token,
        },
      });
      if (error) throw error;
      const accessUrl = `${getAuthOrigin()}/membros?token=${student.access_token}`;
      if (data?.email_sent === false) {
        navigator.clipboard.writeText(accessUrl).catch(() => {});
        toast.success("Link copiado! (Verifique domínio no Resend para enviar emails)", {
          duration: 8000,
          description: accessUrl,
        });
      } else {
        toast.success(`Email reenviado para ${student.customer_email}!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao reenviar email de acesso");
    } finally {
      setResending(null);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_email.toLowerCase().includes(search.toLowerCase())
  );

  const avgProgress =
    students.length > 0 && students[0].total_lessons > 0
      ? students.reduce((sum, s) => sum + (s.completed_lessons / s.total_lessons) * 100, 0) / students.length
      : 0;

  const completionRate =
    students.length > 0 && students[0].total_lessons > 0
      ? (students.filter((s) => s.completed_lessons >= s.total_lessons).length / students.length) * 100
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-bold text-foreground">Alunos</h2>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar aluno
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{students.length}</p>
            <p className="text-xs text-muted-foreground">Número de alunos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{avgProgress.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">média dos usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{completionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">concluíram o curso</p>
          </CardContent>
        </Card>
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {students.length === 0
                ? "Nenhum aluno neste curso. Adicione o primeiro!"
                : "Nenhum aluno encontrado."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
            <span>Nome</span>
            <span className="w-32 text-center">Progresso</span>
            <span className="w-8" />
            <span className="w-8" />
          </div>
          {filtered.map((s) => {
            const pct = s.total_lessons > 0 ? (s.completed_lessons / s.total_lessons) * 100 : 0;
            return (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-t"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.customer_email}</p>
                </div>
                <div className="w-32 flex items-center gap-2">
                  <Progress value={pct} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:text-primary"
                  title="Reenviar email de acesso"
                  disabled={resending === s.id}
                  onClick={() => resendAccess(s)}
                >
                  {resending === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeStudent(s.id, s.customer_name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Adicionar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input
                  value={addForm.cpf}
                  onChange={(e) => setAddForm({ ...addForm, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <Button onClick={addStudent} disabled={adding} className="w-full">
              {adding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Adicionar Aluno
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseStudents;
