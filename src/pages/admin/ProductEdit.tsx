import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PUBLISHED_URL = "https://paycheckout.lovable.app";
const getPublicUrl = () =>
  window.location.hostname.includes("preview") ? PUBLISHED_URL : window.location.origin;

const ProductEdit = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = productId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    original_price: "",
    active: true,
    image_url: "",
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
          });
          setLoading(false);
        });
    }
  }, [productId]);

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
      if (error) {
        toast.error("Erro ao criar produto");
        setSaving(false);
        return;
      }
      toast.success("Produto criado!");
      navigate("/admin/products");
    } else {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) {
        toast.error("Erro ao atualizar");
        setSaving(false);
        return;
      }
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
        <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-1 text-sm"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger
            value="checkout"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-1 text-sm"
          >
            Checkout
          </TabsTrigger>
          <TabsTrigger
            value="links"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-1 text-sm"
          >
            Links
          </TabsTrigger>
        </TabsList>

        {/* Tab: Geral */}
        <TabsContent value="general" className="mt-6">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left info */}
            <div className="lg:col-span-4">
              <h2 className="text-base font-semibold text-foreground">Produto</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Você pode cadastrar o produto e já começar a vender.
                A imagem do produto será exibida na Área de membros e no seu programa de afiliados.
              </p>
            </div>

            {/* Right form */}
            <div className="lg:col-span-8 space-y-5">
              <div className="border border-border rounded-lg p-6 bg-card space-y-5">
                <div className="space-y-1.5">
                  <Label>Nome do produto</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Curso Completo de Marketing"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder="Descreva seu produto..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Imagem do produto</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/30">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Arraste aqui ou{" "}
                      <span className="text-primary cursor-pointer underline">selecione do computador</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                    <span className="text-checkout-badge">★</span> Tamanho recomendado: 800x250 pixels
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>URL da imagem (alternativo)</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Produto ativo</Label>
                </div>
              </div>

              {/* Preços */}
              <h2 className="text-base font-semibold text-foreground pt-2">Preços</h2>
              <div className="border border-border rounded-lg p-6 bg-card space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Preço</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="rounded-l-none"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preço original (riscado)</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.original_price}
                        onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                        className="rounded-l-none"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete */}
              {!isNew && (
                <div className="flex justify-between pt-4">
                  <Button variant="destructive" onClick={handleDelete}>
                    Excluir produto
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Checkout */}
        <TabsContent value="checkout" className="mt-6">
          <div className="border border-border rounded-lg p-6 bg-card space-y-4 max-w-2xl">
            <h2 className="text-base font-semibold text-foreground">Configurações do Checkout</h2>
            <p className="text-sm text-muted-foreground">
              Personalize como o checkout deste produto aparece para seus clientes.
            </p>
            <div className="space-y-1.5">
              <Label>Link do checkout</Label>
              {checkoutLink ? (
                <div className="flex items-center gap-2">
                  <Input value={checkoutLink} readOnly className="bg-muted/50" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(checkoutLink);
                      toast.success("Link copiado!");
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Salve o produto primeiro para gerar o link.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Links */}
        <TabsContent value="links" className="mt-6">
          <div className="border border-border rounded-lg p-6 bg-card space-y-4 max-w-2xl">
            <h2 className="text-base font-semibold text-foreground">Links do produto</h2>
            {checkoutLink ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Link de checkout</Label>
                  <div className="flex items-center gap-2">
                    <Input value={checkoutLink} readOnly className="bg-muted/50 text-sm" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(checkoutLink);
                        toast.success("Link copiado!");
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Salve o produto primeiro.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductEdit;
