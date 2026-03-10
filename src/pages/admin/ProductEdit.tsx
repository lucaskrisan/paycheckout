import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Loader2, X, Link as LinkIcon, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PUBLISHED_URL = "https://paycheckout.lovable.app";
const getPublicUrl = () =>
  window.location.hostname.includes("preview") ? PUBLISHED_URL : window.location.origin;

const tabStyle =
  "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-1 text-sm";

const ProductEdit = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = productId === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    original_price: "",
    active: true,
    image_url: "",
    sales_page_url: "",
  });

  useEffect(() => {
    if (!isNew && productId) {
      supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            toast.error("Produto não encontrado");
            navigate("/admin/products");
            return;
          }
          setForm({
            name: data.name,
            description: data.description || "",
            price: String(data.price),
            original_price: data.original_price ? String(data.original_price) : "",
            active: data.active,
            image_url: data.image_url || "",
            sales_page_url: "",
          });
          setLoading(false);
        });
    }
  }, [productId]);

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user?.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast.error("Erro ao fazer upload");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Imagem enviada!");
  }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file);
  }, [uploadImage]);

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setSaving(true);
    const payload: any = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      active: form.active,
      image_url: form.image_url || null,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      payload.user_id = user?.id;
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar produto"); setSaving(false); return; }
      toast.success("Produto criado!");
      navigate("/admin/products");
    } else {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Produto salvo!");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    await supabase.from("products").delete().eq("id", productId);
    toast.success("Produto excluído");
    navigate("/admin/products");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const checkoutLink = isNew ? "" : `${getPublicUrl()}/checkout/${productId}`;

  return (
    <div className="space-y-0 -m-6">
      {/* Green top bar */}
      <div className="h-2 bg-primary w-full" />

      <div className="px-6 pt-6 pb-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/products")} className="text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-foreground">
              {isNew ? "Criar produto" : "Editar produto"}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar produto
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general">
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 w-full justify-start">
            <TabsTrigger value="general" className={tabStyle}>Geral</TabsTrigger>
            <TabsTrigger value="members" className={tabStyle}>Área de membros</TabsTrigger>
            <TabsTrigger value="config" className={tabStyle}>Configurações</TabsTrigger>
            <TabsTrigger value="checkout" className={tabStyle}>Checkout</TabsTrigger>
            <TabsTrigger value="links" className={tabStyle}>Links</TabsTrigger>
          </TabsList>

          {/* Geral */}
          <TabsContent value="general" className="mt-8">
            <div className="space-y-10">
              {/* Produto section */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Produto</h2>
                  <p className="text-sm text-primary mt-1">
                    Você pode cadastrar o produto e já começar a vender.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A imagem do produto será exibida na Área de membros e no seu programa de afiliados.
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-5">
                    <div className="space-y-1.5">
                      <Label>Nome do produto</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Curso Completo de Marketing" />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Descrição</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Descreva seu produto..." />
                    </div>

                    {/* Image upload */}
                    <div className="space-y-1.5">
                      <Label>Imagem do produto</Label>
                      {form.image_url ? (
                        <div className="relative border border-border rounded-lg overflow-hidden">
                          <img src={form.image_url} alt="Produto" className="w-full h-48 object-cover" />
                          <button
                            onClick={() => setForm({ ...form, image_url: "" })}
                            className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/50"
                          }`}
                        >
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">
                                Arraste aqui ou{" "}
                                <span className="text-primary underline">selecione do computador</span>
                              </p>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                      />
                      <div className="bg-checkout-badge/15 text-checkout-badge rounded-md px-3 py-2 text-xs flex items-center gap-1.5 mt-2">
                        <span>★</span> Tamanho recomendado: 800x250 pixels
                      </div>
                    </div>

                    {/* Sales page */}
                    <div className="space-y-1.5">
                      <Label>Página de vendas</Label>
                      <div className="flex items-center gap-2 border border-input rounded-md px-3 py-2 bg-card">
                        <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <input
                          value={form.sales_page_url}
                          onChange={(e) => setForm({ ...form, sales_page_url: e.target.value })}
                          className="flex-1 text-sm bg-transparent outline-none"
                          placeholder="https://www.instagram.com/..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preços section */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Preços</h2>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                    <div className="space-y-1.5">
                      <Label>Preço</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">R$</span>
                        <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-l-none" placeholder="0,00" />
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 border-input rounded-r-md">BRL</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preço original (riscado)</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">R$</span>
                        <Input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="rounded-l-none" placeholder="0,00" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                      <Label>Produto ativo</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom actions */}
              {!isNew && (
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Excluir produto
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar produto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Área de membros */}
          <TabsContent value="members" className="mt-8">
            <div className="border border-border rounded-lg p-6 bg-card max-w-2xl space-y-4">
              <h2 className="text-base font-semibold text-foreground">Área de membros</h2>
              <p className="text-sm text-muted-foreground">
                Configure a área de membros vinculada a este produto. Os compradores terão acesso automático após o pagamento.
              </p>
              <Button variant="outline" onClick={() => navigate("/admin/courses")}>
                Gerenciar cursos
              </Button>
            </div>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="config" className="mt-8">
            <div className="border border-border rounded-lg p-6 bg-card max-w-2xl space-y-4">
              <h2 className="text-base font-semibold text-foreground">Configurações</h2>
              <p className="text-sm text-muted-foreground">
                Configurações avançadas do produto como garantia, políticas de reembolso e notificações.
              </p>
            </div>
          </TabsContent>

          {/* Checkout */}
          <TabsContent value="checkout" className="mt-8">
            <div className="border border-border rounded-lg p-6 bg-card max-w-2xl space-y-4">
              <h2 className="text-base font-semibold text-foreground">Checkout</h2>
              <p className="text-sm text-muted-foreground">Personalize o checkout deste produto.</p>
              {checkoutLink && (
                <div className="space-y-1.5">
                  <Label>Link do checkout</Label>
                  <div className="flex items-center gap-2">
                    <Input value={checkoutLink} readOnly className="bg-muted/50" />
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success("Link copiado!"); }}>Copiar</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Links */}
          <TabsContent value="links" className="mt-8">
            <div className="border border-border rounded-lg p-6 bg-card max-w-2xl space-y-4">
              <h2 className="text-base font-semibold text-foreground">Links do produto</h2>
              {checkoutLink ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Link de checkout</Label>
                  <div className="flex items-center gap-2">
                    <Input value={checkoutLink} readOnly className="bg-muted/50 text-sm" />
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success("Link copiado!"); }}>Copiar</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Salve o produto primeiro.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProductEdit;
