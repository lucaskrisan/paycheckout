import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Upload, Loader2, X, Link as LinkIcon, ExternalLink, Settings2, Trash2, MoreVertical, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FacebookDomainManager from "@/components/admin/FacebookDomainManager";
import OrderBumpDialog from "@/components/admin/OrderBumpDialog";

interface PixelEntry {
  id?: string;
  platform: string;
  pixel_id: string;
  domain: string;
  fire_on_pix: boolean;
  fire_on_boleto: boolean;
}
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
  window.location.hostname.includes("lovable") ? PUBLISHED_URL : window.location.origin;

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
  const [pixels, setPixels] = useState<PixelEntry[]>([]);
  const [activePixelPlatform, setActivePixelPlatform] = useState("Facebook");
  const [savingPixels, setSavingPixels] = useState(false);
  const [showDomainManager, setShowDomainManager] = useState(false);
  const [showBumpDialog, setShowBumpDialog] = useState(false);
  const [orderBumps, setOrderBumps] = useState<any[]>([]);
  const [fbDomains, setFbDomains] = useState<{ id: string; domain: string; verified: boolean }[]>([]);
  const CATEGORIES = [
    "Saúde e Esportes", "Finanças e Investimentos", "Relacionamentos", "Negócios e Carreira",
    "Espiritualidade", "Sexualidade", "Entretenimento", "Culinária e Gastronomia", "Idiomas",
    "Direito", "Apps & Software", "Literatura", "Casa e Construção", "Desenvolvimento Pessoal",
    "Moda e Beleza", "Animais e Plantas", "Educacional", "Hobbies", "Internet", "Outros",
  ];

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    original_price: "",
    active: true,
    image_url: "",
    sales_page_url: "",
    is_subscription: false,
    billing_cycle: "monthly",
  });

  // Load pixels for this product
  const loadPixels = useCallback(async () => {
    if (isNew || !productId) return;
    const { data } = await supabase
      .from("product_pixels")
      .select("*")
      .eq("product_id", productId);
    if (data) {
      setPixels(data.map((p: any) => ({
        id: p.id,
        platform: p.platform,
        pixel_id: p.pixel_id,
        domain: p.domain || "",
        fire_on_pix: p.fire_on_pix,
        fire_on_boleto: p.fire_on_boleto,
      })));
    }
  }, [isNew, productId]);

  const loadOrderBumps = useCallback(async () => {
    if (isNew || !productId) return;
    const { data } = await supabase
      .from("order_bumps")
      .select("*, bump_product:products!order_bumps_bump_product_id_fkey(name, price, image_url)")
      .eq("product_id", productId)
      .order("sort_order");
    if (data) setOrderBumps(data);
  }, [isNew, productId]);

  useEffect(() => {
    // Load courses
    supabase.from("courses").select("id, title, product_id").then(({ data }) => {
      setCourses(data || []);
      if (!isNew && productId) {
        const linked = data?.find((c) => c.product_id === productId);
        if (linked) setSelectedCourseId(linked.id);
      }
    });

    // Load facebook domains
    if (user) {
      supabase.from("facebook_domains").select("*").eq("user_id", user.id).then(({ data }) => {
        setFbDomains((data || []) as any);
      });
    }



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
            category: "",
            price: String(data.price),
            original_price: data.original_price ? String(data.original_price) : "",
            active: data.active,
            image_url: data.image_url || "",
            sales_page_url: "",
            is_subscription: (data as any).is_subscription || false,
            billing_cycle: (data as any).billing_cycle || "monthly",
          });
          setLoading(false);
        });
      loadPixels();
      loadOrderBumps();
    }
  }, [productId]);

  const addPixel = () => {
    if (pixels.length >= 50) { toast.error("Máximo de 50 pixels"); return; }
    setPixels((prev) => [...prev, { platform: activePixelPlatform.toLowerCase(), pixel_id: "", domain: "", fire_on_pix: false, fire_on_boleto: false }]);
  };

  const updatePixel = (index: number, field: keyof PixelEntry, value: any) => {
    setPixels((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePixel = async (index: number) => {
    const px = pixels[index];
    if (px.id) {
      await supabase.from("product_pixels").delete().eq("id", px.id);
    }
    setPixels((prev) => prev.filter((_, i) => i !== index));
    toast.success("Pixel removido");
  };

  const savePixels = async () => {
    if (isNew || !productId) { toast.error("Salve o produto primeiro"); return; }
    setSavingPixels(true);
    try {
      // Delete existing
      await supabase.from("product_pixels").delete().eq("product_id", productId);
      // Insert all
      const validPixels = pixels.filter((p) => p.pixel_id.trim());
      if (validPixels.length > 0) {
        const { error } = await supabase.from("product_pixels").insert(
          validPixels.map((p) => ({
            product_id: productId,
            platform: p.platform,
            pixel_id: p.pixel_id.trim(),
            domain: p.domain.trim() || null,
            fire_on_pix: p.fire_on_pix,
            fire_on_boleto: p.fire_on_boleto,
            user_id: user?.id,
          }))
        );
        if (error) throw error;
      }
      toast.success("Pixels salvos!");
      loadPixels();
    } catch (err) {
      toast.error("Erro ao salvar pixels");
    } finally {
      setSavingPixels(false);
    }
  };

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
      is_subscription: form.is_subscription,
      billing_cycle: form.billing_cycle,
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

                    <div className="space-y-1.5">
                      <Label>Categoria</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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

              {/* Planos de assinatura section - only for subscription products */}
              {form.is_subscription && (
                <div className="grid lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4">
                    <h2 className="text-base font-semibold text-foreground">Planos de assinatura</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      <a href="#" className="text-primary hover:underline">Aprenda mais sobre os planos</a>
                    </p>
                  </div>
                  <div className="lg:col-span-8">
                    <div className="border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between p-4 border-b border-border">
                        <h3 className="text-sm font-semibold text-foreground">Planos de assinatura</h3>
                        <Button size="sm" onClick={() => setShowPlanDialog(true)} className="gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Adicionar plano
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Nome</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Preço</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Primeira cobrança</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Frequência</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Show current plan based on product price/cycle */}
                          {parseFloat(form.price) > 0 ? (
                            <TableRow>
                              <TableCell className="text-sm">{form.name || "Plano padrão"}</TableCell>
                              <TableCell className="text-sm">R$ {parseFloat(form.price).toFixed(2).replace(".", ",")}</TableCell>
                              <TableCell className="text-sm">R$ {parseFloat(form.price).toFixed(2).replace(".", ",")}</TableCell>
                              <TableCell className="text-sm capitalize">
                                {{
                                  weekly: "Semanal",
                                  biweekly: "Quinzenal",
                                  monthly: "Mensal",
                                  quarterly: "Trimestral",
                                  semiannually: "Semestral",
                                  yearly: "Anual",
                                }[form.billing_cycle] || "Mensal"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                                Por favor crie um plano para configurar os preços
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )

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
            <div className="space-y-10">
              {/* Área de membros select */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Área de Membros</h2>
                  <p className="text-sm text-primary mt-1">
                    Ao comprar esse produto, o aluno será automaticamente adicionado na área de membros selecionada.
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                    <div className="space-y-1.5">
                      <Label>Área de Membros</Label>
                      <Select value={selectedCourseId} onValueChange={async (v) => {
                        setSelectedCourseId(v);
                        if (!isNew && productId) {
                          // Unlink old
                          if (selectedCourseId) {
                            await supabase.from("courses").update({ product_id: null }).eq("id", selectedCourseId);
                          }
                          // Link new
                          if (v) {
                            await supabase.from("courses").update({ product_id: productId }).eq("id", v);
                            toast.success("Área de membros vinculada!");
                          }
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma área de membros" /></SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedCourseId && (
                      <button
                        onClick={() => navigate("/admin/courses")}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Abrir editor da área de membros <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Controle de acesso */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Controle de Acesso</h2>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Oferta</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Valor</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Grupo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.name ? (
                          <TableRow>
                            <TableCell className="text-sm text-foreground truncate max-w-[200px]">{form.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {form.price ? `R$ ${Number(form.price).toFixed(2).replace(".", ",")}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Select defaultValue="default">
                                <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Grupo padrão (Grupo A)</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Salve o produto primeiro para configurar o acesso.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Bottom actions */}
              {!isNew && (
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Excluir produto</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar produto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="config" className="mt-8">
            <div className="space-y-10">
              {/* Pagamento */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Pagamento</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aprenda sobre as configurações de parcelamento no checkout
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-5">
                    <div className="space-y-1.5">
                      <Label>Método de pagamento</Label>
                      <Select defaultValue="all">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Cartão de crédito, boleto e Pix</SelectItem>
                          <SelectItem value="pix_only">Apenas Pix</SelectItem>
                          <SelectItem value="card_pix">Cartão de crédito e Pix</SelectItem>
                          <SelectItem value="card_only">Apenas Cartão de crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Descrição na fatura do cartão</Label>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 text-xs text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md h-10 font-semibold">KIWIFY*</span>
                        <Input defaultValue="" placeholder="MEUPRODUTO" className="rounded-l-none uppercase" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Parcelamento</Label>
                      <Select defaultValue="12">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10,11,12,15,18,21].map((n) => (
                            <SelectItem key={n} value={String(n)}>Até {n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Validade do boleto</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="2" className="w-20" />
                        <span className="text-sm text-muted-foreground">dias corridos</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <Switch />
                        <Label className="text-sm">Habilitar pagamento com 2 cartões</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch />
                        <Label className="text-sm">Habilitar pagamento com Cartão + Pix</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch />
                        <Label className="text-sm">Habilitar parcelamento inteligente</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch defaultChecked />
                        <Label className="text-sm">Pedir para o comprador repetir o e-mail</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch />
                        <Label className="text-sm">Coletar o endereço do comprador</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch />
                        <Label className="text-sm">Coletar o Instagram do comprador</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch />
                        <Label className="text-sm">Conversão automática de moedas (recomendado)</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Página de obrigado e upsell */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Página de obrigado e upsell</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aprenda sobre as páginas de obrigado personalizadas e também sobre a upsell de 1 clique.
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="flex items-center gap-3">
                      <Switch />
                      <Label className="text-sm">Esse produto tem uma página de obrigado personalizada ou upsell</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pixels de conversão */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Pixels de conversão</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aprenda sobre os <span className="text-primary underline cursor-pointer">pixels de conversão</span>
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                    {/* Platform tabs */}
                    <div className="flex flex-wrap gap-2">
                      {["Facebook", "G Ads", "G Analytics", "Taboola", "Outbrain", "TikTok", "Pinterest", "Kwai"].map((px) => (
                        <button
                          key={px}
                          onClick={() => setActivePixelPlatform(px)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            activePixelPlatform === px
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {px}
                        </button>
                      ))}
                    </div>

                    {/* Existing pixels for active platform */}
                    {pixels.filter((p) => p.platform === activePixelPlatform.toLowerCase()).length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">
                        Nenhum pixel de {activePixelPlatform} cadastrado.
                      </p>
                    )}

                    {pixels.map((px, idx) => {
                      if (px.platform !== activePixelPlatform.toLowerCase()) return null;
                      return (
                        <div key={idx} className="space-y-3 border border-border rounded-lg p-4 bg-muted/20">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label>Pixel ID</Label>
                              <Input
                                value={px.pixel_id}
                                onChange={(e) => updatePixel(idx, "pixel_id", e.target.value)}
                                placeholder="Ex: 1234567890"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                Domínio{" "}
                                <span
                                  onClick={() => setShowDomainManager(true)}
                                  className="text-primary text-xs cursor-pointer hover:underline"
                                >
                                  (Gerenciar domínios {activePixelPlatform})
                                </span>
                              </Label>
                              <div className="flex items-center gap-2">
                                <Select value={px.domain || ""} onValueChange={(v) => updatePixel(idx, "domain", v)}>
                                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um domínio" /></SelectTrigger>
                                  <SelectContent>
                                    {fbDomains.map((d) => (
                                      <SelectItem key={d.id} value={d.domain}>{d.domain}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button onClick={() => setShowDomainManager(true)} className="text-muted-foreground hover:text-foreground"><Settings2 className="w-4 h-4" /></button>
                                <button onClick={() => removePixel(idx)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Switch checked={px.fire_on_pix} onCheckedChange={(v) => updatePixel(idx, "fire_on_pix", v)} />
                              <Label className="text-sm">Disparar evento "Purchase" ao gerar um pix?</Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <Switch checked={px.fire_on_boleto} onCheckedChange={(v) => updatePixel(idx, "fire_on_boleto", v)} />
                              <Label className="text-sm">Disparar evento "Purchase" ao gerar um boleto?</Label>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-3">
                      <Button size="sm" onClick={addPixel} className="gap-1">Adicionar outro</Button>
                      <span className="text-xs text-muted-foreground">
                        {pixels.filter((p) => p.platform === activePixelPlatform.toLowerCase()).length}/50
                      </span>
                    </div>

                    <div className="pt-2">
                      <Button onClick={savePixels} disabled={savingPixels} size="sm" variant="outline">
                        {savingPixels && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                        Salvar pixels
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cupons de desconto */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Cupons de desconto</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aprenda sobre os cupons de desconto
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <div className="flex items-center gap-3">
                      <Switch />
                      <Label className="text-sm">Habilitar cupons de desconto</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order bump */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Order bump</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aprenda sobre os <span className="text-primary underline cursor-pointer">order bumps</span>
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Ordem</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Produto</TableHead>
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderBumps.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-sm text-primary py-6">
                              Não há nenhum order bump
                            </TableCell>
                          </TableRow>
                        ) : (
                          orderBumps.map((ob, idx) => (
                            <TableRow key={ob.id}>
                              <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="text-sm text-foreground">
                                {ob.bump_product?.name || ob.title} — R$ {Number(ob.bump_product?.price || 0).toFixed(2).replace(".", ",")}
                              </TableCell>
                              <TableCell>
                                <button
                                  onClick={async () => {
                                    await supabase.from("order_bumps").delete().eq("id", ob.id);
                                    toast.success("Order bump removido");
                                    loadOrderBumps();
                                  }}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <div className="px-6 pb-4">
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled={orderBumps.length >= 5}
                        onClick={() => setShowBumpDialog(true)}
                      >
                        Adicionar order bump
                      </Button>
                      <span className="text-xs text-muted-foreground ml-2">{orderBumps.length}/5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom actions */}
              {!isNew && (
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Excluir produto</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar produto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Checkout */}
          <TabsContent value="checkout" className="mt-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Input placeholder="Buscar..." className="pl-9 h-9 text-sm" />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <Button size="sm" variant="outline" className="text-sm">
                  Criar novo checkout
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Nome</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Oferta</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkoutLink ? (
                      <TableRow>
                        <TableCell className="text-sm text-foreground">
                          Checkout A
                          <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Padrão</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {form.price ? `R$ ${Number(form.price).toFixed(2).replace(".", ",")}` : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted transition-colors">
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => navigate(`/admin/products/${productId}/checkout-builder`)} className="gap-2 text-sm">
                                <ExternalLink className="w-3.5 h-3.5" /> Personalizar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-sm">
                                <Settings2 className="w-3.5 h-3.5" /> Configurações
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success("Link copiado!"); }} className="gap-2 text-sm">
                                <LinkIcon className="w-3.5 h-3.5" /> Duplicar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                          Salve o produto primeiro.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-primary">ℹ</span> Aprenda mais sobre o{" "}
                  <a href="#" className="text-primary underline">checkout builder</a>
                </p>
              </div>

              {!isNew && (
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Excluir produto</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar produto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Links */}
          <TabsContent value="links" className="mt-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Input placeholder="Buscar..." className="pl-9 h-9 text-sm" />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-sm">
                        <MoreVertical className="w-3.5 h-3.5" /> Ações
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-sm">Exportar links</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" className="gap-1 text-sm">
                    + Adicionar link
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-8">
                        <input type="checkbox" className="rounded border-border" />
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Nome do link</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">URL</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Tipo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Preço</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isNew && checkoutLink ? (
                      <>
                        {form.sales_page_url && (
                          <TableRow>
                            <TableCell><input type="checkbox" className="rounded border-border" /></TableCell>
                            <TableCell className="text-sm font-medium text-foreground">Sales Page</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Input value={form.sales_page_url} readOnly className="h-8 text-xs bg-muted/50 max-w-[220px]" />
                                <button onClick={() => { navigator.clipboard.writeText(form.sales_page_url); toast.success("Link copiado!"); }} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500">Página</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">—</TableCell>
                            <TableCell>
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-500">Ativo</span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded hover:bg-muted transition-colors"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(form.sales_page_url); toast.success("Link copiado!"); }} className="gap-2 text-sm"><LinkIcon className="w-3.5 h-3.5" /> Copiar link</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(form.sales_page_url, "_blank")} className="gap-2 text-sm"><ExternalLink className="w-3.5 h-3.5" /> Abrir</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell><input type="checkbox" className="rounded border-border" /></TableCell>
                          <TableCell className="text-sm font-medium text-foreground">{form.name || "Checkout"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Input value={checkoutLink} readOnly className="h-8 text-xs bg-muted/50 max-w-[220px]" />
                              <button onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success("Link copiado!"); }} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500">Checkout</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {form.price ? `R$ ${Number(form.price).toFixed(2).replace(".", ",")}` : "—"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${form.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                              {form.active ? "Ativo" : "Inativo"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded hover:bg-muted transition-colors"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success("Link copiado!"); }} className="gap-2 text-sm"><LinkIcon className="w-3.5 h-3.5" /> Copiar link</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(checkoutLink, "_blank")} className="gap-2 text-sm"><ExternalLink className="w-3.5 h-3.5" /> Abrir</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/products/${productId}/checkout-builder`)} className="gap-2 text-sm"><Settings2 className="w-3.5 h-3.5" /> Personalizar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                          Salve o produto primeiro para gerar os links.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Exibindo 1 de 1 página</span>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">&lt;</button>
                  <button className="w-7 h-7 rounded border border-primary bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">1</button>
                  <button className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">&gt;</button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-primary">ℹ</span> Aprenda mais sobre os{" "}
                  <a href="#" className="text-primary underline">links</a>
                </p>
              </div>

              {!isNew && (
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Excluir produto</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Salvar produto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <FacebookDomainManager
        open={showDomainManager}
        onClose={() => setShowDomainManager(false)}
        onDomainsChange={(d) => setFbDomains(d)}
      />
      {!isNew && productId && (
        <OrderBumpDialog
          open={showBumpDialog}
          onClose={() => setShowBumpDialog(false)}
          productId={productId}
          onSaved={loadOrderBumps}
        />
      )}
    </div>
  );
};

export default ProductEdit;
