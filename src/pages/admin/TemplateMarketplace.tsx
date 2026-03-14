import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Copy,
  Search,
  LayoutTemplate,
  Eye,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Download,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  layout: any;
  settings: any;
  published: boolean;
  uses_count: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "geral", label: "Geral" },
  { value: "infoproduto", label: "Infoproduto" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "servico", label: "Serviço" },
  { value: "saas", label: "SaaS" },
];

const CATEGORY_COLORS: Record<string, string> = {
  geral: "bg-muted text-muted-foreground",
  infoproduto: "bg-primary/10 text-primary",
  ecommerce: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  servico: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  saas: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const TemplateMarketplace = () => {
  const { user, isSuperAdmin } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Super admin create/edit
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "geral", thumbnail_url: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Import from existing config
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [importForm, setImportForm] = useState({ name: "", description: "", category: "geral" });

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await (supabase.from("checkout_templates") as any).select("*").order("uses_count", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase.from("products").select("id, name").eq("user_id", user.id);
    setProducts(data || []);
  };

  useEffect(() => {
    fetchTemplates();
    fetchProducts();
  }, [user]);

  const filteredTemplates = templates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || t.category === category;
    const matchVisibility = isSuperAdmin || t.published;
    return matchSearch && matchCategory && matchVisibility;
  });

  const handleDuplicate = async () => {
    if (!duplicating || !selectedProduct || !user) return;
    const template = templates.find((t) => t.id === duplicating);
    if (!template) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("checkout_builder_configs").insert({
        product_id: selectedProduct,
        name: `${template.name} (cópia)`,
        layout: template.layout,
        settings: template.settings,
        user_id: user.id,
        is_default: false,
      });
      if (error) throw error;

      // Increment uses_count
      await (supabase.from("checkout_templates") as any)
        .update({ uses_count: (template.uses_count || 0) + 1 })
        .eq("id", template.id);

      toast.success("Template duplicado! Acesse o Checkout Builder do produto para editar.");
      setDupDialogOpen(false);
      setDuplicating(null);
      setSelectedProduct("");
      fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao duplicar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Super admin: create/update template
  const handleSaveTemplate = async () => {
    if (!user || !editForm.name) return;
    setSaving(true);
    try {
      if (editingId) {
        await (supabase.from("checkout_templates") as any)
          .update({
            name: editForm.name,
            description: editForm.description || null,
            category: editForm.category,
            thumbnail_url: editForm.thumbnail_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        toast.success("Template atualizado!");
      } else {
        await (supabase.from("checkout_templates") as any).insert({
          name: editForm.name,
          description: editForm.description || null,
          category: editForm.category,
          thumbnail_url: editForm.thumbnail_url || null,
          layout: [],
          settings: {},
          published: false,
          created_by: user.id,
        });
        toast.success("Template criado!");
      }
      setEditDialogOpen(false);
      setEditingId(null);
      setEditForm({ name: "", description: "", category: "geral", thumbnail_url: "" });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (template: Template) => {
    await (supabase.from("checkout_templates") as any)
      .update({ published: !template.published, updated_at: new Date().toISOString() })
      .eq("id", template.id);
    toast.success(template.published ? "Template despublicado" : "Template publicado!");
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    await (supabase.from("checkout_templates") as any).delete().eq("id", id);
    toast.success("Template excluído");
    fetchTemplates();
  };

  // Import from existing checkout config
  const openImportDialog = async () => {
    const { data } = await (supabase.from("checkout_builder_configs") as any).select("id, name, layout, settings, product_id");
    setConfigs(data || []);
    setImportDialogOpen(true);
  };

  const handleImport = async () => {
    if (!selectedConfig || !user) return;
    const config = configs.find((c: any) => c.id === selectedConfig);
    if (!config) return;
    setSaving(true);
    try {
      await (supabase.from("checkout_templates") as any).insert({
        name: importForm.name || config.name,
        description: importForm.description || null,
        category: importForm.category,
        layout: config.layout,
        settings: config.settings || {},
        published: false,
        created_by: user.id,
      });
      toast.success("Template importado com sucesso!");
      setImportDialogOpen(false);
      setSelectedConfig("");
      setImportForm({ name: "", description: "", category: "geral" });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-primary" />
            Templates de Checkout
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha um template pronto e duplique para o seu produto. Personalize no Builder.
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={openImportDialog} className="gap-1.5">
              <Download className="w-4 h-4" /> Importar Config
            </Button>
            <Button size="sm" onClick={() => { setEditingId(null); setEditForm({ name: "", description: "", category: "geral", thumbnail_url: "" }); setEditDialogOpen(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Template
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              size="sm"
              variant={category === cat.value ? "default" : "outline"}
              onClick={() => setCategory(cat.value)}
              className="text-xs h-8"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-20">
          <LayoutTemplate className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum template encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60">
              {/* Thumbnail */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                {template.thumbnail_url ? (
                  <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutTemplate className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button size="sm" variant="secondary" onClick={() => setPreviewTemplate(template)} className="gap-1.5">
                    <Eye className="w-4 h-4" /> Preview
                  </Button>
                  <Button size="sm" onClick={() => { setDuplicating(template.id); setDupDialogOpen(true); }} className="gap-1.5">
                    <Copy className="w-4 h-4" /> Usar
                  </Button>
                </div>
                {/* Status badge */}
                {isSuperAdmin && !template.published && (
                  <Badge className="absolute top-2 right-2 bg-yellow-500/90 text-white text-[10px]">Rascunho</Badge>
                )}
              </div>

              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${CATEGORY_COLORS[template.category] || ""}`}>
                    {template.category}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {template.uses_count} uso(s)
                  </span>
                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePublish(template)}>
                        {template.published ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        setEditingId(template.id);
                        setEditForm({ name: template.name, description: template.description || "", category: template.category, thumbnail_url: template.thumbnail_url || "" });
                        setEditDialogOpen(true);
                      }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(template.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Duplicate Dialog */}
      <Dialog open={dupDialogOpen} onOpenChange={setDupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Template</DialogTitle>
            <DialogDescription>Selecione o produto que receberá este template de checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Produto destino</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && (
              <p className="text-xs text-muted-foreground">Você não possui produtos cadastrados.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDuplicate} disabled={!selectedProduct || saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>{previewTemplate?.description || "Sem descrição"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>Categoria:</strong> {previewTemplate?.category} &nbsp;|&nbsp;
              <strong>Componentes:</strong> {Array.isArray(previewTemplate?.layout) ? previewTemplate.layout.length : 0}
            </p>
            {Array.isArray(previewTemplate?.layout) && previewTemplate.layout.length > 0 ? (
              <div className="bg-muted rounded-lg p-4 space-y-2 max-h-60 overflow-auto">
                {previewTemplate.layout.map((comp: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-background rounded px-3 py-2 border border-border">
                    <Badge variant="outline" className="text-[10px]">{comp.zone}</Badge>
                    <span className="font-medium capitalize">{comp.type}</span>
                    {comp.props?.title && <span className="text-muted-foreground truncate">— {comp.props.title}</span>}
                    {comp.props?.text && <span className="text-muted-foreground truncate">— {comp.props.text}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Template vazio — adicione componentes após duplicar.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setDuplicating(previewTemplate?.id || null); setPreviewTemplate(null); setDupDialogOpen(true); }} className="gap-1.5">
              <Copy className="w-4 h-4" /> Usar este template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin: Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Checkout Minimalista" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição curta do template..." rows={2} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL da thumbnail (opcional)</Label>
              <Input value={editForm.thumbnail_url} onChange={(e) => setEditForm((f) => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTemplate} disabled={!editForm.name || saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin: Import from existing config */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar de Config Existente</DialogTitle>
            <DialogDescription>Transforme um checkout builder existente em template reutilizável.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Config de origem</Label>
              <Select value={selectedConfig} onValueChange={(v) => {
                setSelectedConfig(v);
                const c = configs.find((x: any) => x.id === v);
                if (c) setImportForm((f) => ({ ...f, name: c.name }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione uma config..." /></SelectTrigger>
                <SelectContent>
                  {configs.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do template</Label>
              <Input value={importForm.name} onChange={(e) => setImportForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={importForm.description} onChange={(e) => setImportForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={importForm.category} onValueChange={(v) => setImportForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!selectedConfig || !importForm.name || saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateMarketplace;
