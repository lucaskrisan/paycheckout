// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Zap,
  ArrowRight,
  ShoppingCart,
  UserPlus,
  CreditCard,
  QrCode,
  Send,
  MoreHorizontal,
  GripVertical,
  Eye,
} from "lucide-react";
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
  { value: "{nome}", label: "Nome do cliente", icon: UserPlus },
  { value: "{email}", label: "E-mail", icon: Send },
  { value: "{telefone}", label: "Telefone", icon: MessageSquare },
  { value: "{produto}", label: "Produto", icon: ShoppingCart },
  { value: "{valor}", label: "Valor", icon: CreditCard },
  { value: "{link}", label: "Link de acesso", icon: ArrowRight },
  { value: "{cupom}", label: "Cupom", icon: Zap },
  { value: "{pix_code}", label: "Código PIX", icon: QrCode },
];

const CATEGORIES = [
  { value: "boas_vindas", label: "Boas-vindas", icon: UserPlus, color: "hsl(151 100% 45%)" },
  { value: "abandono", label: "Carrinho abandonado", icon: ShoppingCart, color: "hsl(45 100% 51%)" },
  { value: "confirmacao", label: "Confirmação de compra", icon: CreditCard, color: "hsl(210 100% 60%)" },
  { value: "lembrete_pix", label: "Lembrete PIX", icon: QrCode, color: "hsl(280 80% 60%)" },
  { value: "acesso", label: "Envio de acesso", icon: Send, color: "hsl(340 80% 55%)" },
  { value: "geral", label: "Geral", icon: MessageSquare, color: "hsl(240 5% 63%)" },
];

const EMPTY_FORM = { name: "", category: "geral", body: "", active: true };

/* ─── Connector line SVG between two nodes ─── */
const NodeConnector = ({ from, to, containerRef }: { from: string; to: string; containerRef: React.RefObject<HTMLDivElement> }) => {
  const [path, setPath] = useState("");

  useEffect(() => {
    const draw = () => {
      const container = containerRef.current;
      if (!container) return;
      const fromEl = container.querySelector(`[data-node-id="${from}"]`);
      const toEl = container.querySelector(`[data-node-id="${to}"]`);
      if (!fromEl || !toEl) return;

      const cRect = container.getBoundingClientRect();
      const fRect = fromEl.getBoundingClientRect();
      const tRect = toEl.getBoundingClientRect();

      const x1 = fRect.right - cRect.left;
      const y1 = fRect.top + fRect.height / 2 - cRect.top;
      const x2 = tRect.left - cRect.left;
      const y2 = tRect.top + tRect.height / 2 - cRect.top;
      const cx = (x1 + x2) / 2;

      setPath(`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`);
    };

    draw();
    const observer = new ResizeObserver(draw);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", draw);
    return () => { observer.disconnect(); window.removeEventListener("resize", draw); };
  }, [from, to, containerRef]);

  if (!path) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke="hsl(151 100% 45% / 0.35)" strokeWidth="2" strokeDasharray="6 4" />
      <path d={path} fill="none" stroke="hsl(151 100% 45% / 0.15)" strokeWidth="6" />
    </svg>
  );
};

/* ─── Single template "node" ─── */
const TemplateNode = ({
  template,
  onEdit,
  onDelete,
  onCopy,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) => {
  const cat = CATEGORIES.find((c) => c.value === template.category) || CATEGORIES[5];
  const CatIcon = cat.icon;

  return (
    <div
      data-node-id={template.id}
      className="group relative rounded-xl border border-border bg-card shadow-lg hover:shadow-xl transition-all duration-200 hover:border-primary/40 w-[320px]"
    >
      {/* Node header — colored stripe */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-t-xl border-b border-border"
        style={{ background: `linear-gradient(135deg, ${cat.color}15, transparent)` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
        >
          <CatIcon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{template.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cat.label}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Node body — message preview */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {template.body}
        </p>

        {/* Variable pills */}
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.variables.map((v: string) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20"
              >
                <Zap className="w-2.5 h-2.5" />
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Node footer — status */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border rounded-b-xl bg-muted/30">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${template.active ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {template.active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {template.variables.length} variáve{template.variables.length !== 1 ? "is" : "l"}
        </span>
      </div>

      {/* Connection ports */}
      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary bg-card transition-colors group-hover:bg-primary" />
      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary bg-card transition-colors group-hover:bg-primary" />
    </div>
  );
};

/* ─── Trigger node (start of the flow) ─── */
const TriggerNode = () => (
  <div
    data-node-id="trigger"
    className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-5 py-4 w-[200px] flex flex-col items-center gap-2 shadow-md"
  >
    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
      <Zap className="w-5 h-5 text-primary" />
    </div>
    <p className="text-xs font-bold text-foreground tracking-wide uppercase">Gatilho</p>
    <p className="text-[10px] text-muted-foreground text-center leading-tight">
      Evento dispara o envio da mensagem
    </p>
    <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary bg-card" />
  </div>
);

/* ─── WhatsApp send node (end of the flow) ─── */
const SendNode = () => (
  <div
    data-node-id="send"
    className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-5 py-4 w-[200px] flex flex-col items-center gap-2 shadow-md"
  >
    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
      <Send className="w-5 h-5 text-primary" />
    </div>
    <p className="text-xs font-bold text-foreground tracking-wide uppercase">Enviar</p>
    <p className="text-[10px] text-muted-foreground text-center leading-tight">
      WhatsApp API envia ao cliente
    </p>
    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary bg-card" />
  </div>
);

/* ─── Main component ─── */
const WhatsAppTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const flowRef = useRef<HTMLDivElement>(null);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar templates");
    } else {
      setTemplates((data || []).map((t: any) => ({ ...t, variables: t.variables || [] })));
    }
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
    if (!form.name.trim() || !form.body.trim()) { toast.error("Nome e corpo da mensagem são obrigatórios"); return; }
    if (form.name.length > 100) { toast.error("Nome deve ter no máximo 100 caracteres"); return; }
    if (form.body.length > 4096) { toast.error("Mensagem deve ter no máximo 4096 caracteres"); return; }

    setSaving(true);
    const variables = extractVariables(form.body);
    const payload = {
      name: form.name.trim(), category: form.category, body: form.body.trim(),
      variables, active: form.active, user_id: user!.id, updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("whatsapp_templates").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("whatsapp_templates").insert(payload));
    }

    if (error) { toast.error("Erro ao salvar template"); }
    else { toast.success(editingId ? "Template atualizado!" : "Template criado!"); setDialogOpen(false); fetchTemplates(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir template");
    else { toast.success("Template excluído!"); fetchTemplates(); }
    setDeleteId(null);
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({ ...prev, body: prev.body + variable }));
  };

  const copyBody = (body: string) => { navigator.clipboard.writeText(body); toast.success("Mensagem copiada!"); };

  const previewBody = (body: string) =>
    body
      .replace(/\{nome\}/g, "João Silva").replace(/\{email\}/g, "joao@email.com")
      .replace(/\{telefone\}/g, "(11) 99999-0000").replace(/\{produto\}/g, "Curso Premium")
      .replace(/\{valor\}/g, "R$ 197,00").replace(/\{link\}/g, "https://app.com/acesso/abc")
      .replace(/\{cupom\}/g, "DESCONTO10").replace(/\{pix_code\}/g, "00020126...");

  // Build connector pairs: trigger -> first template, template[n] -> template[n+1], last template -> send
  const connectorPairs = useMemo(() => {
    if (templates.length === 0) return [];
    const pairs: [string, string][] = [];
    pairs.push(["trigger", templates[0].id]);
    for (let i = 0; i < templates.length - 1; i++) {
      pairs.push([templates[i].id, templates[i + 1].id]);
    }
    pairs.push([templates[templates.length - 1].id, "send"]);
    return pairs;
  }, [templates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            Templates de Mensagem
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie modelos com variáveis dinâmicas para automações WhatsApp.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {/* Flow canvas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="relative rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 flex flex-col items-center justify-center text-center">
          {/* Grid pattern background */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary/60" />
            </div>
            <p className="font-semibold text-foreground text-lg">Nenhum template criado</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Crie seu primeiro modelo de mensagem e veja o fluxo de automação ganhar vida.
            </p>
            <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Criar primeiro template
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-border bg-card/30 overflow-x-auto">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }} />

          <div ref={flowRef} className="relative flex items-center gap-8 p-8 min-w-max">
            {/* SVG Connectors */}
            {connectorPairs.map(([from, to]) => (
              <NodeConnector key={`${from}-${to}`} from={from} to={to} containerRef={flowRef} />
            ))}

            {/* Trigger node */}
            <div className="relative shrink-0">
              <TriggerNode />
            </div>

            {/* Template nodes */}
            {templates.map((t) => (
              <div key={t.id} className="relative shrink-0 z-10">
                <TemplateNode
                  template={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => setDeleteId(t.id)}
                  onCopy={() => copyBody(t.body)}
                />
              </div>
            ))}

            {/* Send node */}
            <div className="relative shrink-0">
              <SendNode />
            </div>

            {/* Add node button inline */}
            <div className="shrink-0 z-10">
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full border-dashed border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                onClick={openNew}
              >
                <Plus className="w-4 h-4 text-primary" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template count & legend */}
      {templates.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {CATEGORIES.filter(c => templates.some(t => t.category === c.value)).map(cat => (
              <div key={cat.value} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
          <span>{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                {editingId ? <Pencil className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
              </div>
              {editingId ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input
                placeholder="Ex: Confirmação de compra"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mensagem</Label>
              <Textarea
                placeholder="Olá {nome}, obrigado por adquirir o {produto}! Acesse aqui: {link}"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={5}
                maxLength={4096}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground text-right">{form.body.length}/4096</p>
            </div>

            {/* Variable chips — n8n style */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Variáveis dinâmicas</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {VARIABLE_OPTIONS.map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.value}
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/40 transition-all text-left group"
                      onClick={() => insertVariable(v.value)}
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="flex-1 text-foreground">{v.label}</span>
                      <code className="text-[10px] text-muted-foreground font-mono">{v.value}</code>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live preview */}
            {form.body.trim() && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  Pré-visualização
                </Label>
                <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                      Preview
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-16">
                    {previewBody(form.body)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label className="text-sm">Template ativo</Label>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-lg shadow-primary/20">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Criar template"}
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
