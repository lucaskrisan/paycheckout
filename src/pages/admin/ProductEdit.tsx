// @ts-nocheck
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
import UpsellOfferDialog from "@/components/admin/UpsellOfferDialog";

interface PixelEntry {
  id?: string;
  platform: string;
  pixel_id: string;
  domain: string;
  fire_on_pix: boolean;
  fire_on_boleto: boolean;
  capi_token: string;
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

const PUBLISHED_URL = "https://app.panttera.com.br";
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
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("0.00");
  const [planFrequency, setPlanFrequency] = useState("monthly");
  const [planRenewal, setPlanRenewal] = useState<"until_cancel" | "fixed">("until_cancel");
  const [planDifferentFirst, setPlanDifferentFirst] = useState(false);
  const [showNewCheckoutDialog, setShowNewCheckoutDialog] = useState(false);
  const [newCheckoutName, setNewCheckoutName] = useState("");
  const [newCheckoutPrice, setNewCheckoutPrice] = useState("");
  const [newCheckoutDefault, setNewCheckoutDefault] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const [editCheckoutName, setEditCheckoutName] = useState("");
  const [editCheckoutPrice, setEditCheckoutPrice] = useState("");
  const [savingCheckoutEdit, setSavingCheckoutEdit] = useState(false);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [orderBumps, setOrderBumps] = useState<any[]>([]);
  const [upsellOffers, setUpsellOffers] = useState<any[]>([]);
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const [fbDomains, setFbDomains] = useState<{ id: string; domain: string; verified: boolean }[]>([]);
  const [moderationStatus, setModerationStatus] = useState<string>("approved");
  const [rejectionReason, setRejectionReason] = useState<string>("");
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
    show_coupon: true,
    delivery_method: "appsell" as "panttera" | "appsell" | "email",
    currency: "BRL" as "BRL" | "USD",
    payment_settings: {
      payment_method: "all",
      max_installments: 12,
      boleto_days: 2,
      two_cards: false,
      card_pix: false,
      smart_installments: false,
      repeat_email: true,
      collect_address: false,
      collect_instagram: false,
      currency_conversion: false,
      statement_descriptor: "",
    },
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
        capi_token: p.capi_token || "",
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

  const loadUpsellOffers = useCallback(async () => {
    if (isNew || !productId) return;
    const { data } = await supabase
      .from("upsell_offers" as any)
      .select("*, upsell_product:products!upsell_offers_upsell_product_id_fkey(name, price, image_url)")
      .eq("product_id", productId)
      .order("sort_order");
    if (data) setUpsellOffers(data);
  }, [isNew, productId]);

  const loadCheckouts = useCallback(async () => {
    if (isNew || !productId) return;
    const { data, error } = await supabase
      .from("checkout_builder_configs")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar checkouts:", error);
      toast.error("Erro ao carregar checkouts");
      return;
    }

    setCheckouts(data || []);
  }, [isNew, productId]);

  const openNewCheckoutDialog = () => {
    setNewCheckoutName("");
    setNewCheckoutPrice("");
    setNewCheckoutDefault(false);

    // Evita conflito de evento que pode fechar o dialog no mesmo clique
    window.setTimeout(() => setShowNewCheckoutDialog(true), 0);
  };

  const createCheckoutConfig = async () => {
    if (!productId || isNew) {
      toast.error("Salve o produto primeiro");
      return;
    }

    const checkoutName = newCheckoutName.trim();
    if (!checkoutName) {
      toast.error("Informe o nome do checkout");
      return;
    }

    setCreatingCheckout(true);
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      if (newCheckoutDefault) {
        const { error: unsetDefaultError } = await supabase
          .from("checkout_builder_configs")
          .update({ is_default: false })
          .eq("product_id", productId)
          .eq("user_id", authUser.id);

        if (unsetDefaultError) throw unsetDefaultError;
      }

      const parsedPrice = newCheckoutPrice.trim()
        ? parseFloat(newCheckoutPrice.replace(",", "."))
        : null;

      const { error } = await supabase.from("checkout_builder_configs").insert({
        product_id: productId,
        name: checkoutName,
        is_default: newCheckoutDefault,
        user_id: authUser.id,
        price: parsedPrice,
      } as any);

      if (error) throw error;

      await loadCheckouts();
      toast.success("Checkout criado!");
      setShowNewCheckoutDialog(false);
      setNewCheckoutName("");
      setNewCheckoutPrice("");
      setNewCheckoutDefault(false);
    } catch (err: any) {
      console.error("Erro ao criar checkout:", err);
      toast.error(err?.message || "Erro ao criar checkout");
    } finally {
      setCreatingCheckout(false);
    }
  };

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
            show_coupon: (data as any).show_coupon !== false,
            delivery_method: (data as any).delivery_method || "appsell",
            currency: (data as any).currency || "BRL",
            payment_settings: {
              payment_method: "all",
              max_installments: 12,
              boleto_days: 2,
              two_cards: false,
              card_pix: false,
              smart_installments: false,
              repeat_email: true,
              collect_address: false,
              collect_instagram: false,
              currency_conversion: false,
              statement_descriptor: "",
              ...((data as any).payment_settings || {}),
            },
          });
          setModerationStatus((data as any).moderation_status || "approved");
          setRejectionReason((data as any).rejection_reason || "");
          setLoading(false);
        });
      loadPixels();
      loadOrderBumps();
      loadUpsellOffers();
      loadCheckouts();
    }
  }, [productId]);

  const addPixel = () => {
    if (pixels.length >= 50) { toast.error("Máximo de 50 pixels"); return; }
    setPixels((prev) => [...prev, { platform: activePixelPlatform.toLowerCase(), pixel_id: "", domain: "", fire_on_pix: false, fire_on_boleto: false, capi_token: "" }]);
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
            capi_token: p.capi_token.trim() || null,
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
      show_coupon: form.show_coupon,
      delivery_method: form.delivery_method,
      currency: form.currency,
      payment_settings: form.payment_settings,
      updated_at: new Date().toISOString(),
    };

    let savedProductId = productId;

    if (isNew) {
      payload.user_id = user?.id;
      payload.moderation_status = "pending_review";
      const { data: inserted, error } = await supabase.from("products" as any).insert(payload).select("id").single();
      if (error) { toast.error("Erro ao criar produto"); setSaving(false); return; }
      savedProductId = (inserted as any)?.id;
      toast.success("Produto criado! Aguarde a aprovação para começar a vender.");
    } else {
      // If product was rejected, resubmit for review
      if (moderationStatus === "rejected") {
        payload.moderation_status = "pending_review";
        payload.rejection_reason = null;
      }
      const { error } = await supabase.from("products" as any).update(payload).eq("id", productId);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      if (moderationStatus === "rejected") {
        setModerationStatus("pending_review");
        setRejectionReason("");
        toast.success("Produto reenviado para revisão!");
      } else {
        toast.success("Produto salvo!");
      }
    }

    // Auto-sync to Stripe for USD products
    if (form.currency === "USD" && savedProductId) {
      try {
        const { error: syncError } = await supabase.functions.invoke("sync-product-stripe", {
          body: { product_id: savedProductId },
        });
        if (syncError) {
          console.error("Stripe sync error:", syncError);
          toast.error("Produto salvo, mas falha ao sincronizar com Stripe. Verifique o gateway.");
        } else {
          toast.success("Produto sincronizado com Stripe ✓");
        }
      } catch (e) {
        console.error("Stripe sync exception:", e);
      }
    }

    if (isNew) navigate("/admin/products");
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

  const defaultCheckout = checkouts.find((c: any) => c.is_default) || checkouts[0] || null;
  const checkoutLink = isNew ? "" : `${getPublicUrl()}/checkout/${productId}${defaultCheckout?.id ? `?config=${defaultCheckout.id}` : ""}`;

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

        {/* Moderation status banner */}
        {!isNew && moderationStatus === "pending_review" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-400 text-sm font-medium">⏳ Este produto está em revisão. Os links de checkout ficarão ativos após aprovação.</span>
          </div>
        )}
        {!isNew && moderationStatus === "rejected" && (
          <div className="space-y-1 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 text-sm font-medium">❌ Este produto foi reprovado.</span>
            {rejectionReason && <p className="text-red-300/80 text-xs">Motivo: {rejectionReason}</p>}
            <p className="text-red-300/60 text-[11px]">Edite o produto e salve para reenviar à revisão.</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="general">
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 w-full justify-start overflow-x-auto">
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
                      <Label>Moeda</Label>
                      <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as "BRL" | "USD" })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">🇧🇷 BRL — Real Brasileiro</SelectItem>
                          <SelectItem value="USD">🇺🇸 USD — Dólar Americano (Stripe)</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.currency === "USD" && (
                        <p className="text-xs text-muted-foreground">Produtos em USD serão processados via Stripe automaticamente.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preço</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">{form.currency === "USD" ? "$" : "R$"}</span>
                        <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-l-none" placeholder="0.00" />
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 border-input rounded-r-md">{form.currency}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preço original (riscado)</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">{form.currency === "USD" ? "$" : "R$"}</span>
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
              )}

              {/* Bottom actions */}
              {!isNew && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      Excluir produto
                    </Button>
                    {form.is_subscription && (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                        Cancelar assinaturas
                      </Button>
                    )}
                  </div>
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
              {/* Método de Entrega */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Método de Entrega</h2>
                  <p className="text-sm text-primary mt-1">
                    Escolha como o conteúdo será entregue ao comprador após a confirmação do pagamento.
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                    <RadioGroup
                      value={form.delivery_method}
                      onValueChange={(v: "panttera" | "appsell" | "email") => setForm({ ...form, delivery_method: v })}
                      className="space-y-3"
                    >
                      <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${form.delivery_method === "panttera" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <RadioGroupItem value="panttera" className="mt-0.5" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏠</span>
                            <span className="font-semibold text-sm text-foreground">Área de Membros Panttera</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            O comprador recebe acesso automático à área de membros interna. Ideal para cursos hospedados na Panttera.
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${form.delivery_method === "appsell" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <RadioGroupItem value="appsell" className="mt-0.5" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🔗</span>
                            <span className="font-semibold text-sm text-foreground">Plataforma Externa (AppSell)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            O evento de pagamento é enviado via API para a AppSell ou outra plataforma externa configurada em Integrações.
                          </p>
                        </div>
                      </label>

                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Área de membros select — only visible if panttera */}
              {form.delivery_method === "panttera" && (
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
                            if (selectedCourseId) {
                              await supabase.from("courses").update({ product_id: null }).eq("id", selectedCourseId);
                            }
                            if (v) {
                              await supabase.from("courses").update({ product_id: productId, user_id: user?.id }).eq("id", v);
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
                        {!selectedCourseId && (
                          <p className="text-xs text-destructive mt-1">⚠️ Vincule uma área de membros para que o acesso seja criado automaticamente.</p>
                        )}
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
              )}

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
                          <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Entrega</TableHead>
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
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                                form.delivery_method === "panttera" ? "bg-primary/10 text-primary" :
                                form.delivery_method === "appsell" ? "bg-blue-500/10 text-blue-400" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {form.delivery_method === "panttera" ? "🏠 Panttera" :
                                 form.delivery_method === "appsell" ? "🔗 AppSell" :
                                 "📩 E-mail"}
                              </span>
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
                      <Select value={form.payment_settings.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, payment_method: v } }))}>
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
                        <Input value={form.payment_settings.statement_descriptor} onChange={(e) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, statement_descriptor: e.target.value } }))} placeholder="MEUPRODUTO" className="rounded-l-none uppercase" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Parcelamento</Label>
                      <Select value={String(form.payment_settings.max_installments)} onValueChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, max_installments: Number(v) } }))}>
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
                        <Input type="number" value={form.payment_settings.boleto_days} onChange={(e) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, boleto_days: Number(e.target.value) } }))} className="w-20" />
                        <span className="text-sm text-muted-foreground">dias corridos</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.two_cards} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, two_cards: v } }))} />
                        <Label className="text-sm">Habilitar pagamento com 2 cartões</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.card_pix} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, card_pix: v } }))} />
                        <Label className="text-sm">Habilitar pagamento com Cartão + Pix</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.smart_installments} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, smart_installments: v } }))} />
                        <Label className="text-sm">Habilitar parcelamento inteligente</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.repeat_email} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, repeat_email: v } }))} />
                        <Label className="text-sm">Pedir para o comprador repetir o e-mail</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.collect_address} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, collect_address: v } }))} />
                        <Label className="text-sm">Coletar o endereço do comprador</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.collect_instagram} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, collect_instagram: v } }))} />
                        <Label className="text-sm">Coletar o Instagram do comprador</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={form.payment_settings.currency_conversion} onCheckedChange={(v) => setForm((f) => ({ ...f, payment_settings: { ...f.payment_settings, currency_conversion: v } }))} />
                        <Label className="text-sm">Conversão automática de moedas (recomendado)</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={form.show_coupon}
                          onCheckedChange={(v) => setForm((f) => ({ ...f, show_coupon: v }))}
                        />
                        <Label className="text-sm">Exibir campo de cupom de desconto no checkout</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upsell One-Click pós-compra */}
              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                  <h2 className="text-base font-semibold text-foreground">Upsell One-Click</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ofertas exibidas na página de sucesso após pagamento com cartão. O cliente compra com 1 clique sem redigitar os dados.
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                    {upsellOffers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Produto</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Desconto</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upsellOffers.map((uo: any) => (
                            <TableRow key={uo.id}>
                              <TableCell className="text-sm">
                                <div>
                                  <p className="font-medium text-foreground">{uo.title || uo.upsell_product?.name}</p>
                                  <p className="text-xs text-muted-foreground">{uo.description}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {uo.discount_percent > 0 ? `${uo.discount_percent}%` : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={async () => {
                                    await supabase.from("upsell_offers").delete().eq("id", uo.id);
                                    loadUpsellOffers();
                                    toast.success("Upsell removido");
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum upsell configurado. Adicione um produto para oferecer após a compra.
                      </p>
                    )}
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowUpsellDialog(true)}>
                      <Plus className="w-4 h-4" /> Adicionar upsell
                    </Button>
                  </div>
                </div>
              </div>

              {showUpsellDialog && productId && (
                <UpsellOfferDialog
                  open={showUpsellDialog}
                  onClose={() => setShowUpsellDialog(false)}
                  productId={productId}
                  onSaved={loadUpsellOffers}
                />
              )}

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
                                <Select value={px.domain || "app.panttera.com.br"} onValueChange={(v) => updatePixel(idx, "domain", v)}>
                                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um domínio" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="app.panttera.com.br">app.panttera.com.br (padrão)</SelectItem>
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
                          {px.platform === "facebook" && (
                            <div className="space-y-1.5">
                              <Label>
                                Token da API de Conversão (opcional){" "}
                                <a href="https://developers.facebook.com/docs/marketing-api/conversions-api/get-started" target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">
                                  O que é isso?
                                </a>
                              </Label>
                              <Textarea
                                value={px.capi_token}
                                onChange={(e) => updatePixel(idx, "capi_token", e.target.value)}
                                placeholder="EAAxxxxxxxxx..."
                                rows={2}
                                className="font-mono text-xs"
                              />
                            </div>
                          )}
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
                <Button type="button" size="sm" variant="outline" className="text-sm relative z-10" onClick={openNewCheckoutDialog}>
                  Criar novo checkout
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Nome</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Oferta</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Link</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Dynamic checkouts from DB */}
                    {checkouts.map((co) => (
                      <TableRow key={co.id}>
                        <TableCell className="text-sm text-foreground">
                          {co.name}
                          {co.is_default && (
                            <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Padrão</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {co.price != null ? `${form.currency === "USD" ? "$" : "R$"} ${Number(co.price).toFixed(2).replace(".", form.currency === "USD" ? "." : ",")}` : `${form.currency === "USD" ? "$" : "R$"} ${Number(form.price).toFixed(2).replace(".", form.currency === "USD" ? "." : ",")} (padrão)`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Input value={`${getPublicUrl()}/checkout/${productId}?config=${co.id}`} readOnly className="h-7 text-[10px] bg-muted/50 max-w-[180px]" />
                            <button onClick={() => { navigator.clipboard.writeText(`${getPublicUrl()}/checkout/${productId}?config=${co.id}`); toast.success("Link copiado!"); }} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                              <LinkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted transition-colors">
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => {
                                setEditingCheckout(co);
                                setEditCheckoutName(co.name);
                                setEditCheckoutPrice(co.price != null ? String(co.price).replace(".", ",") : "");
                              }} className="gap-2 text-sm">
                                <Settings2 className="w-3.5 h-3.5" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/products/${productId}/checkout-builder/${co.id}`)} className="gap-2 text-sm">
                                <ExternalLink className="w-3.5 h-3.5" /> Personalizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                await supabase.from("checkout_builder_configs").insert({
                                  product_id: productId!,
                                  name: co.name + " (cópia)",
                                  layout: co.layout || [],
                                  settings: co.settings || {},
                                  is_default: false,
                                  user_id: user?.id,
                                  price: co.price || null,
                                } as any);
                                toast.success("Checkout duplicado!");
                                loadCheckouts();
                              }} className="gap-2 text-sm">
                                <LinkIcon className="w-3.5 h-3.5" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                await supabase.from("checkout_builder_configs").delete().eq("id", co.id);
                                toast.success("Checkout excluído!");
                                loadCheckouts();
                              }} className="gap-2 text-sm text-destructive focus:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!checkoutLink && checkouts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
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
                            {form.price ? `${form.currency === "USD" ? "$" : "R$"} ${Number(form.price).toFixed(2).replace(".", form.currency === "USD" ? "." : ",")}` : "—"}
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
                                <DropdownMenuItem onClick={() => navigate(`/admin/products/${productId}/checkout-builder${defaultCheckout?.id ? `/${defaultCheckout.id}` : ""}`)} className="gap-2 text-sm"><Settings2 className="w-3.5 h-3.5" /> Personalizar</DropdownMenuItem>
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

      {/* Adicionar plano dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">R$</span>
                <Input type="number" step="0.01" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} className="rounded-l-none rounded-r-none" />
                <Select defaultValue="BRL">
                  <SelectTrigger className="w-24 rounded-l-none border-l-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={planFrequency} onValueChange={setPlanFrequency}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannually">Semestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Renovação automática</Label>
              <RadioGroup value={planRenewal} onValueChange={(v) => setPlanRenewal(v as "until_cancel" | "fixed")}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="until_cancel" id="until_cancel" />
                  <Label htmlFor="until_cancel" className="font-normal cursor-pointer">Até o cliente cancelar</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="font-normal cursor-pointer">Número fixo de cobranças</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={planDifferentFirst} onCheckedChange={setPlanDifferentFirst} />
              <Label className="font-normal">Preço diferente na primeira cobrança</Label>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!planPrice || parseFloat(planPrice) <= 0) {
                  toast.error("Informe um preço válido");
                  return;
                }
                setForm((f) => ({
                  ...f,
                  price: planPrice,
                  billing_cycle: planFrequency,
                  is_subscription: true,
                }));
                setShowPlanDialog(false);
                setPlanName("");
                setPlanPrice("0.00");
                setPlanFrequency("monthly");
                toast.success("Plano adicionado! Salve o produto para aplicar.");
              }}
            >
              Adicionar plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Criar novo checkout dialog */}
      <Dialog open={showNewCheckoutDialog} onOpenChange={setShowNewCheckoutDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar novo checkout</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={newCheckoutName} onChange={(e) => setNewCheckoutName(e.target.value)} autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>Preço personalizado (opcional)</Label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 text-xs text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md h-10 font-semibold">R$</span>
                <Input
                  value={newCheckoutPrice}
                  onChange={(e) => setNewCheckoutPrice(e.target.value)}
                  placeholder={form.price ? Number(form.price).toFixed(2).replace(".", ",") : "0,00"}
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">Deixe vazio para usar o preço padrão do produto</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={newCheckoutDefault} onCheckedChange={setNewCheckoutDefault} />
              <Label className="font-normal">Definir esse checkout como padrão</Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewCheckoutDialog(false)}>Cancelar</Button>
              <Button
                onClick={createCheckoutConfig}
                disabled={!newCheckoutName.trim() || creatingCheckout}
              >
                {creatingCheckout && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Criar novo checkout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar checkout dialog */}
      <Dialog open={!!editingCheckout} onOpenChange={(open) => { if (!open) setEditingCheckout(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar checkout</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editCheckoutName} onChange={(e) => setEditCheckoutName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Preço personalizado</Label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 text-xs text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md h-10 font-semibold">R$</span>
                <Input
                  value={editCheckoutPrice}
                  onChange={(e) => setEditCheckoutPrice(e.target.value)}
                  placeholder={form.price ? Number(form.price).toFixed(2).replace(".", ",") : "0,00"}
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">Deixe vazio para usar o preço padrão do produto</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingCheckout(null)}>Cancelar</Button>
              <Button
                disabled={!editCheckoutName.trim() || savingCheckoutEdit}
                onClick={async () => {
                  setSavingCheckoutEdit(true);
                  try {
                    const parsedPrice = editCheckoutPrice.trim()
                      ? parseFloat(editCheckoutPrice.replace(",", "."))
                      : null;
                    const { error } = await supabase
                      .from("checkout_builder_configs")
                      .update({ name: editCheckoutName.trim(), price: parsedPrice } as any)
                      .eq("id", editingCheckout.id);
                    if (error) throw error;
                    toast.success("Checkout atualizado!");
                    setEditingCheckout(null);
                    await loadCheckouts();
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao atualizar");
                  } finally {
                    setSavingCheckoutEdit(false);
                  }
                }}
              >
                {savingCheckoutEdit && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductEdit;
