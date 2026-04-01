// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Copy, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

const VARIABLE_OPTIONS = [
  { value: "{nome}", label: "Nome do cliente" },
  { value: "{email}", label: "E-mail do cliente" },
  { value: "{telefone}", label: "Telefone" },
  { value: "{produto}", label: "Nome do produto" },
  { value: "{valor}", label: "Valor do pedido" },
  { value: "{link}", label: "Link de acesso" },
  { value: "{cupom}", label: "Código do cupom" },
  { value: "{pix_code}", label: "Código PIX" },
];

const CATEGORIES = [
  { value: "boas_vindas", label: "Boas-vindas" },
  { value: "abandono", label: "Carrinho abandonado" },
  { value: "confirmacao", label: "Confirmação de compra" },
  { value: "lembrete_pix", label: "Lembrete PIX" },
  { value: "acesso", label: "Envio de acesso" },
  { value: "geral", label: "Geral" },
];

const EMPTY_FORM = { name: "", category: "geral", body: "", active: true };

const WhatsAppTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar templates");
      console.error(error);
    } else {
      setTemplates((data || []).map((t: any) => ({ ...t, variables: t.variables || [] })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{[a-z_]+\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({ name: t.name, category: t.category, body: t.body, active: t.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) {
      toast.error("Nome e corpo da mensagem são obrigatórios");
      return;
    }
    if (form.name.length > 100) {
      toast.error("Nome deve ter no máximo 100 caracteres");
      return;
    }
    if (form.body.length > 4096) {
      toast.error("Mensagem deve ter no máximo 4096 caracteres");
      return;
    }

    setSaving(true);
    const variables = extractVariables(form.body);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      body: form.body.trim(),
      variables,
      active: form.active,
      user_id: user!.id,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("whatsapp_templates").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("whatsapp_templates").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar template");
      console.error(error);
    } else {
      toast.success(editingId ? "Template atualizado!" : "Template criado!");
      setDialogOpen(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir template");
    } else {
      toast.success("Template excluído!");
      fetchTemplates();
    }
    setDeleteId(null);
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({ ...prev, body: prev.body + variable }));
  };

  const copyBody = (body: string) => {
    navigator.clipboard.writeText(body);
    toast.success("Mensagem copiada!");
  };

  const categoryLabel = (key: string) =>
    CATEGORIES.find((c) => c.value === key)?.label || key;

  const previewBody = (body: string) =>
    body
      .replace(/\{nome\}/g, "João Silva")
      .replace(/\{email\}/g, "joao@email.com")
      .replace(/\{telefone\}/g, "(11) 99999-0000")
      .replace(/\{produto\}/g, "Curso Premium")
      .replace(/\{valor\}/g, "R$ 197,00")
      .replace(/\{link\}/g, "https://app.com/acesso/abc")
      .replace(/\{cupom\}/g, "DESCONTO10")
      .replace(/\{pix_code\}/g, "00020126...");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Templates de Mensagem</h2>
          <p className="text-sm text-muted-foreground">
            Crie modelos de mensagem com variáveis dinâmicas para automações.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Nenhum template criado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro modelo de mensagem para usar nas automações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabel(t.category)}
                      </Badge>
                      <Badge variant={t.active ? "default" : "outline"} className="text-xs">
                        {t.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyBody(t.body)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {t.body}
                </p>
                {t.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.variables.map((v: string) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do template</Label>
              <Input
                placeholder="Ex: Confirmação de compra"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Olá {nome}, obrigado por adquirir o {produto}! Acesse aqui: {link}"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={5}
                maxLength={4096}
              />
              <p className="text-xs text-muted-foreground text-right">{form.body.length}/4096</p>
            </div>

            <div className="space-y-2">
              <Label>Inserir variável</Label>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_OPTIONS.map((v) => (
                  <Button
                    key={v.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-mono h-7"
                    onClick={() => insertVariable(v.value)}
                  >
                    {v.value}
                  </Button>
                ))}
              </div>
            </div>

            {form.body.trim() && (
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="rounded-lg bg-muted/50 border p-3 text-sm whitespace-pre-wrap">
                  {previewBody(form.body)}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label>Template ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WhatsAppTemplates;
