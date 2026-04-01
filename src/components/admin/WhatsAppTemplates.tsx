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
  X, ChevronRight, ArrowLeft, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Template {
  id: string; name: string; category: string; body: string;
  variables: string[]; active: boolean; created_at: string; updated_at: string;
}

const VARIABLE_OPTIONS = [
  { value: "{nome}", label: "Nome", icon: UserPlus },
  { value: "{email}", label: "E-mail", icon: Send },
  { value: "{telefone}", label: "Telefone", icon: MessageSquare },
  { value: "{produto}", label: "Produto", icon: ShoppingCart },
  { value: "{valor}", label: "Valor", icon: CreditCard },
  { value: "{link}", label: "Link", icon: ArrowRight },
  { value: "{cupom}", label: "Cupom", icon: Zap },
  { value: "{pix_code}", label: "PIX", icon: QrCode },
];

const CATEGORIES = [
  { value: "boas_vindas", label: "Boas-vindas", icon: UserPlus, color: "151 100% 45%" },
  { value: "abandono", label: "Abandono", icon: ShoppingCart, color: "45 100% 51%" },
  { value: "confirmacao", label: "Confirmação", icon: CreditCard, color: "210 100% 60%" },
  { value: "lembrete_pix", label: "Lembrete PIX", icon: QrCode, color: "280 80% 60%" },
  { value: "acesso", label: "Acesso", icon: Send, color: "340 80% 55%" },
  { value: "geral", label: "Geral", icon: MessageSquare, color: "240 5% 63%" },
];

const EMPTY_FORM = { name: "", category: "geral", body: "", active: true };

const previewBody = (body: string) =>
  body.replace(/\{nome\}/g, "João Silva").replace(/\{email\}/g, "joao@email.com")
    .replace(/\{telefone\}/g, "(11) 99999-0000").replace(/\{produto\}/g, "Curso Premium")
    .replace(/\{valor\}/g, "R$ 197,00").replace(/\{link\}/g, "https://app.com/acesso")
    .replace(/\{cupom\}/g, "DESCONTO10").replace(/\{pix_code\}/g, "00020126...");

/* ═══════════════════════════════════════════
   FLOW NODE — visual node in the detail panel
   ═══════════════════════════════════════════ */
const FlowNode = ({ icon: Icon, title, subtitle, color, active, children, last }: {
  icon: any; title: string; subtitle: string; color: string; active?: boolean;
  children?: React.ReactNode; last?: boolean;
}) => (
  <div className="flex gap-4">
    {/* Vertical line + dot */}
    <div className="flex flex-col items-center">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          background: `linear-gradient(135deg, hsl(${color} / 0.15), hsl(${color} / 0.05))`,
          borderColor: `hsl(${color} / 0.3)`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color: `hsl(${color})` }} />
      </div>
      {!last && (
        <div className="w-px flex-1 min-h-[24px]" style={{
          background: `linear-gradient(to bottom, hsl(${color} / 0.3), hsl(var(--border) / 0.5))`,
        }} />
      )}
    </div>

    {/* Content */}
    <div className="pb-6 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {active !== undefined && (
          <div className={`w-2 h-2 rounded-full ${active ? "bg-primary shadow-[0_0_6px_hsl(151_100%_45%/0.5)]" : "bg-muted-foreground/30"}`} />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   TEMPLATE CARD — clean grid card
   ═══════════════════════════════════════════ */
const TemplateCard = ({ template, onClick }: { template: Template; onClick: () => void }) => {
  const cat = CATEGORIES.find(c => c.value === template.category) || CATEGORIES[5];
  const CatIcon = cat.icon;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="group text-left w-full rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-[0_0_40px_-12px_hsl(151_100%_45%/0.12)] transition-all duration-300 overflow-hidden"
    >
      {/* Color accent */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, hsl(${cat.color}), hsl(${cat.color} / 0.2))` }} />

      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${cat.color} / 0.12), transparent)`,
              border: `1px solid hsl(${cat.color} / 0.15)`,
            }}
          >
            <CatIcon className="w-4 h-4" style={{ color: `hsl(${cat.color})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: `hsl(${cat.color} / 0.8)` }}>
              {cat.label}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${template.active ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <span className="text-[10px] text-muted-foreground">{template.active ? "Ativo" : "Off"}</span>
          </div>
        </div>

        {/* Preview */}
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{template.body}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1">
            {template.variables.slice(0, 3).map(v => (
              <span key={v} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-muted/60 text-muted-foreground border border-border/50">
                {v}
              </span>
            ))}
            {template.variables.length > 3 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-muted-foreground">
                +{template.variables.length - 3}
              </span>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.button>
  );
};

/* ═══════════════════════════════════════════
   DETAIL PANEL — flow nodes view
   ═══════════════════════════════════════════ */
const TemplateDetail = ({ template, onBack, onEdit, onDelete, onCopy }: {
  template: Template; onBack: () => void;
  onEdit: () => void; onDelete: () => void; onCopy: () => void;
}) => {
  const cat = CATEGORIES.find(c => c.value === template.category) || CATEGORIES[5];
  const CatIcon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Back + Title */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onCopy}>
            <Copy className="w-3 h-3" /> Copiar
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onEdit}>
            <Pencil className="w-3 h-3" /> Editar
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" /> Excluir
          </Button>
        </div>
      </div>

      {/* Template header card */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(90deg, hsl(${cat.color}), hsl(${cat.color} / 0.2))` }} />
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${cat.color} / 0.15), transparent)`,
              border: `1px solid hsl(${cat.color} / 0.2)`,
            }}
          >
            <CatIcon className="w-5 h-5" style={{ color: `hsl(${cat.color})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground font-display">{template.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-medium" style={{ color: `hsl(${cat.color})` }}>{cat.label}</span>
              <span className="text-border">·</span>
              <span className="text-xs text-muted-foreground">{template.variables.length} variáveis</span>
            </div>
          </div>
          <Badge variant={template.active ? "default" : "secondary"} className="shrink-0">
            {template.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>

      {/* Flow nodes */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">Fluxo de automação</p>

        <FlowNode
          icon={Zap}
          title="Gatilho"
          subtitle={`Evento: ${cat.label}`}
          color={cat.color}
        >
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">
              Quando o evento <span className="font-semibold text-foreground">{cat.label.toLowerCase()}</span> ocorrer, iniciar o fluxo.
            </p>
          </div>
        </FlowNode>

        <FlowNode
          icon={FileText}
          title="Mensagem Template"
          subtitle="Corpo da mensagem com variáveis"
          color="151 100% 45%"
          active={template.active}
        >
          {/* Message bubble */}
          <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
            <div className="p-4">
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{template.body}</p>
            </div>
            {template.variables.length > 0 && (
              <div className="border-t border-border/40 px-4 py-2.5 flex flex-wrap gap-1.5 bg-muted/10">
                {template.variables.map(v => {
                  const opt = VARIABLE_OPTIONS.find(o => o.value === v);
                  const VIcon = opt?.icon || Zap;
                  return (
                    <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-primary/8 text-primary/70 border border-primary/15">
                      <VIcon className="w-2.5 h-2.5" />
                      {v}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live preview */}
          <div className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="w-3 h-3 text-primary/50" />
              <span className="text-[10px] font-medium text-primary/50 uppercase tracking-wider">Preview</span>
            </div>
            <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {previewBody(template.body)}
            </p>
          </div>
        </FlowNode>

        <FlowNode
          icon={Send}
          title="Enviar via WhatsApp"
          subtitle="API envia a mensagem ao cliente"
          color="151 100% 45%"
          last
        >
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-foreground">WhatsApp Business API</p>
              <p className="text-[10px] text-muted-foreground">Envio automático instantâneo</p>
            </div>
          </div>
        </FlowNode>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const WhatsAppTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_templates").select("*").order("created_at", { ascending: false });
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
    else {
      toast.success(editingId ? "Atualizado!" : "Criado!");
      setDialogOpen(false);
      await fetchTemplates();
      // If editing, update the selected template view
      if (editingId && selectedTemplate?.id === editingId) {
        setSelectedTemplate({ ...selectedTemplate, ...payload, variables, id: editingId });
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Excluído!");
      if (selectedTemplate?.id === deleteId) setSelectedTemplate(null);
      fetchTemplates();
    }
    setDeleteId(null);
  };

  const insertVariable = (variable: string) => setForm(p => ({ ...p, body: p.body + variable }));
  const copyBody = (body: string) => { navigator.clipboard.writeText(body); toast.success("Copiado!"); };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {selectedTemplate ? (
          /* ─── Detail View with Flow Nodes ─── */
          <TemplateDetail
            key="detail"
            template={selectedTemplate}
            onBack={() => setSelectedTemplate(null)}
            onEdit={() => openEdit(selectedTemplate)}
            onDelete={() => setDeleteId(selectedTemplate.id)}
            onCopy={() => copyBody(selectedTemplate.body)}
          />
        ) : (
          /* ─── Grid View ─── */
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground font-display">Templates</h2>
                  <p className="text-xs text-muted-foreground">Clique em um card para ver o fluxo de automação</p>
                </div>
              </div>
              <Button onClick={openNew} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                Novo
              </Button>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/30 p-16 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary/40" />
                </div>
                <p className="font-bold text-foreground font-display">Nenhum template</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Crie seu primeiro modelo de mensagem.</p>
                <Button onClick={openNew} className="mt-5 gap-2 rounded-xl"><Plus className="w-4 h-4" />Criar template</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {templates.map(t => (
                    <TemplateCard key={t.id} template={t} onClick={() => setSelectedTemplate(t)} />
                  ))}
                </AnimatePresence>

                {/* Add card */}
                <button
                  onClick={openNew}
                  className="rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/30 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl border border-dashed border-muted-foreground/20 group-hover:border-primary/30 flex items-center justify-center transition-colors">
                    <Plus className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-[11px] text-muted-foreground/40 group-hover:text-primary/60 transition-colors">Adicionar</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                {editingId ? <Pencil className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
              </div>
              {editingId ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Nome</Label>
              <Input placeholder="Ex: Confirmação de compra" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => {
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
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Mensagem</Label>
              <Textarea
                placeholder="Olá {nome}, obrigado por adquirir o {produto}!"
                value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={4} maxLength={4096} className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground text-right tabular-nums">{form.body.length}/4096</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Variáveis</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {VARIABLE_OPTIONS.map(v => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.value} type="button"
                      className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all group"
                      onClick={() => insertVariable(v.value)}
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-muted-foreground group-hover:text-foreground font-medium">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.body.trim() && (
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />Preview</Label>
                <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{previewBody(form.body)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label className="text-sm">Ativo</Label>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WhatsAppTemplates;
