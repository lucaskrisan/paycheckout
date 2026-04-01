// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Copy, FileText, Loader2, MessageSquare,
  Zap, ArrowRight, ShoppingCart, UserPlus, CreditCard, QrCode, Send, Eye,
  ToggleLeft, ChevronRight, Sparkles, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  { value: "{nome}", label: "Nome do cliente", icon: UserPlus, desc: "Nome completo" },
  { value: "{email}", label: "E-mail", icon: Send, desc: "Email do cliente" },
  { value: "{telefone}", label: "Telefone", icon: MessageSquare, desc: "WhatsApp" },
  { value: "{produto}", label: "Produto", icon: ShoppingCart, desc: "Nome do produto" },
  { value: "{valor}", label: "Valor", icon: CreditCard, desc: "Preço formatado" },
  { value: "{link}", label: "Link de acesso", icon: ArrowRight, desc: "URL de entrega" },
  { value: "{cupom}", label: "Cupom", icon: Zap, desc: "Código de desconto" },
  { value: "{pix_code}", label: "Código PIX", icon: QrCode, desc: "Copia e cola" },
];

const CATEGORIES = [
  { value: "boas_vindas", label: "Boas-vindas", icon: UserPlus, color: "151 100% 45%" },
  { value: "abandono", label: "Carrinho abandonado", icon: ShoppingCart, color: "45 100% 51%" },
  { value: "confirmacao", label: "Confirmação", icon: CreditCard, color: "210 100% 60%" },
  { value: "lembrete_pix", label: "Lembrete PIX", icon: QrCode, color: "280 80% 60%" },
  { value: "acesso", label: "Envio de acesso", icon: Send, color: "340 80% 55%" },
  { value: "geral", label: "Geral", icon: MessageSquare, color: "240 5% 63%" },
];

const EMPTY_FORM = { name: "", category: "geral", body: "", active: true };

/* ─── Premium Template Card ─── */
const TemplateCard = ({
  template, index, onEdit, onDelete, onCopy,
}: {
  template: Template; index: number;
  onEdit: () => void; onDelete: () => void; onCopy: () => void;
}) => {
  const cat = CATEGORIES.find((c) => c.value === template.category) || CATEGORIES[5];
  const CatIcon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group relative"
    >
      {/* Connection line to next card */}
      {index >= 0 && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0">
          <div className="w-px h-4 bg-gradient-to-b from-transparent to-primary/30" />
          <div className="w-2 h-2 rounded-full border border-primary/40 bg-card" />
          <div className="w-px h-4 bg-gradient-to-b from-primary/30 to-transparent" />
        </div>
      )}

      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-10px_hsl(151_100%_45%/0.15)]">
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, hsl(${cat.color}), hsl(${cat.color} / 0.3))` }}
        />

        {/* Card header */}
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, hsl(${cat.color} / 0.15), hsl(${cat.color} / 0.05))`,
              border: `1px solid hsl(${cat.color} / 0.2)`,
            }}
          >
            <CatIcon className="w-4.5 h-4.5" style={{ color: `hsl(${cat.color})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{template.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ color: `hsl(${cat.color})` }}
              >
                {cat.label}
              </span>
              <span className="text-border">·</span>
              <span className="text-[10px] text-muted-foreground">
                {template.variables.length} var{template.variables.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-2 h-2 rounded-full ${template.active
              ? "bg-primary shadow-[0_0_6px_hsl(151_100%_45%/0.5)]"
              : "bg-muted-foreground/30"
            }`} />
            <span className="text-[10px] font-medium text-muted-foreground">
              {template.active ? "ON" : "OFF"}
            </span>
          </div>
        </div>

        {/* Message preview */}
        <div className="px-5 pb-3">
          <div className="rounded-xl bg-muted/40 border border-border/50 p-3.5 relative">
            {/* Chat bubble tail */}
            <div className="absolute -top-1 left-6 w-3 h-3 rotate-45 bg-muted/40 border-l border-t border-border/50" />
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed relative z-10">
              {template.body}
            </p>
          </div>
        </div>

        {/* Variable pills */}
        {template.variables.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {template.variables.map((v: string) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-primary/8 text-primary/80 border border-primary/15"
              >
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20">
          <span className="text-[10px] text-muted-foreground font-mono">
            #{template.id.slice(0, 8)}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10" onClick={onCopy}>
              <Copy className="w-3 h-3 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10" onClick={onEdit}>
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10" onClick={onDelete}>
              <Trash2 className="w-3 h-3 text-destructive/70" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Flow Step Indicator ─── */
const FlowStep = ({ icon: Icon, label, sublabel, step, color = "primary" }: {
  icon: any; label: string; sublabel: string; step: number; color?: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-card border border-primary/30 flex items-center justify-center">
        <span className="text-[8px] font-bold text-primary">{step}</span>
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  </div>
);

/* ─── Main Component ─── */
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
    if (error) toast.error("Erro ao carregar templates");
    else setTemplates((data || []).map((t: any) => ({ ...t, variables: t.variables || [] })));
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [user]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{[a-z_]+\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({ name: t.name, category: t.category, body: t.body, active: t.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) { toast.error("Nome e corpo são obrigatórios"); return; }
    if (form.name.length > 100) { toast.error("Nome: máx 100 caracteres"); return; }
    if (form.body.length > 4096) { toast.error("Mensagem: máx 4096 caracteres"); return; }
    setSaving(true);
    const variables = extractVariables(form.body);
    const payload = {
      name: form.name.trim(), category: form.category, body: form.body.trim(),
      variables, active: form.active, user_id: user!.id, updated_at: new Date().toISOString(),
    };
    let error;
    if (editingId) ({ error } = await supabase.from("whatsapp_templates").update(payload).eq("id", editingId));
    else ({ error } = await supabase.from("whatsapp_templates").insert(payload));
    if (error) toast.error("Erro ao salvar");
    else { toast.success(editingId ? "Atualizado!" : "Criado!"); setDialogOpen(false); fetchTemplates(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluído!"); fetchTemplates(); }
    setDeleteId(null);
  };

  const insertVariable = (variable: string) => setForm((p) => ({ ...p, body: p.body + variable }));
  const copyBody = (body: string) => { navigator.clipboard.writeText(body); toast.success("Copiado!"); };

  const previewBody = (body: string) =>
    body.replace(/\{nome\}/g, "João Silva").replace(/\{email\}/g, "joao@email.com")
      .replace(/\{telefone\}/g, "(11) 99999-0000").replace(/\{produto\}/g, "Curso Premium")
      .replace(/\{valor\}/g, "R$ 197,00").replace(/\{link\}/g, "https://app.com/acesso/abc")
      .replace(/\{cupom\}/g, "DESCONTO10").replace(/\{pix_code\}/g, "00020126...");

  const stats = useMemo(() => ({
    total: templates.length,
    active: templates.filter((t) => t.active).length,
    categories: [...new Set(templates.map((t) => t.category))].length,
  }), [templates]);

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">
              Templates de Mensagem
            </h2>
            <p className="text-xs text-muted-foreground">
              Modelos com variáveis dinâmicas para automações
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl shadow-lg shadow-primary/20 font-medium">
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {/* ─── Flow Pipeline ─── */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <FlowStep icon={Zap} label="Evento Gatilho" sublabel="Compra, abandono, PIX..." step={1} />
          <ChevronRight className="w-4 h-4 text-primary/40 hidden sm:block" />
          <FlowStep icon={FileText} label="Template" sublabel={`${stats.total} modelo${stats.total !== 1 ? "s" : ""}`} step={2} />
          <ChevronRight className="w-4 h-4 text-primary/40 hidden sm:block" />
          <FlowStep icon={Send} label="Envio WhatsApp" sublabel="API automática" step={3} />
        </div>

        {/* Mini stats */}
        {stats.total > 0 && (
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.active}</span> ativo{stats.active !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.categories}</span> categoria{stats.categories !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Templates Grid ─── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl border border-dashed border-border bg-card/30 p-16 flex flex-col items-center text-center"
        >
          <div className="absolute inset-0 rounded-2xl opacity-[0.03]" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-7 h-7 text-primary/50" />
            </div>
            <p className="font-bold text-foreground text-lg font-display">Nenhum template criado</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Crie seu primeiro modelo e automatize o envio de mensagens.
            </p>
            <Button onClick={openNew} className="mt-6 gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Criar primeiro template
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {templates.map((t, i) => (
              <TemplateCard
                key={t.id}
                template={t}
                index={i}
                onEdit={() => openEdit(t)}
                onDelete={() => setDeleteId(t.id)}
                onCopy={() => copyBody(t.body)}
              />
            ))}
          </AnimatePresence>

          {/* Add card */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: templates.length * 0.05 + 0.1 }}
            onClick={openNew}
            className="group rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 bg-transparent hover:bg-primary/[0.03] flex flex-col items-center justify-center gap-3 min-h-[200px] transition-all duration-300 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-muted-foreground/20 group-hover:border-primary/40 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
              Adicionar template
            </span>
          </motion.button>
        </div>
      )}

      {/* ─── Category Legend ─── */}
      {templates.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            {CATEGORIES.filter(c => templates.some(t => t.category === c.value)).map(cat => (
              <div key={cat.value} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${cat.color})` }} />
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
          <span className="font-mono">{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 font-display">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                {editingId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              </div>
              {editingId ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Nome</Label>
              <Input
                placeholder="Ex: Confirmação de compra"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={100}
                className="rounded-xl"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" style={{ color: `hsl(${c.color})` }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Message body */}
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Mensagem</Label>
              <Textarea
                placeholder="Olá {nome}, obrigado por adquirir o {produto}! Acesse aqui: {link}"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={5}
                maxLength={4096}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground text-right tabular-nums">{form.body.length}/4096</p>
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                Variáveis dinâmicas
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {VARIABLE_OPTIONS.map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.value}
                      type="button"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs border border-border/60 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                      onClick={() => insertVariable(v.value)}
                    >
                      <div className="w-7 h-7 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{v.label}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">{v.value}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live preview */}
            {form.body.trim() && (
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  Pré-visualização
                </Label>
                <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 relative">
                  <Badge variant="outline" className="absolute top-2.5 right-2.5 text-[8px] border-primary/20 text-primary/60 font-mono">
                    PREVIEW
                  </Badge>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-14">
                    {previewBody(form.body)}
                  </p>
                </div>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center gap-3 pt-1 pb-1">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label className="text-sm font-medium">Template ativo</Label>
            </div>
          </div>

          <DialogFooter className="mt-3 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Salvar" : "Criar template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WhatsAppTemplates;
