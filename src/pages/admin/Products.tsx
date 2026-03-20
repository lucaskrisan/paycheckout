// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreVertical, Search, Pencil, Trash2, Copy, ExternalLink, ArrowLeft, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const PUBLISHED_URL = "https://app.panttera.com.br";
const getPublicUrl = () => (window.location.hostname.includes("lovable") ? PUBLISHED_URL : window.location.origin);

interface Product {
  id: string;
  name: string;
  price: number;
  active: boolean;
  is_subscription: boolean;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentType, setPaymentType] = useState<"one_time" | "subscription">("one_time");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSalesPage, setNewSalesPage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("products").select("id, name, price, active, is_subscription").eq("user_id", user.id).order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto e todos os dados relacionados?")) return;
    try {
      // Delete dependent records in order to avoid FK constraint violations
      // 1. Tables referencing product_id directly
      await Promise.all([
        supabase.from("abandoned_carts").delete().eq("product_id", id),
        supabase.from("pixel_events").delete().eq("product_id", id),
        supabase.from("emq_snapshots").delete().eq("product_id", id),
        supabase.from("product_pixels").delete().eq("product_id", id),
        supabase.from("checkout_builder_configs").delete().eq("product_id", id),
        supabase.from("coupons").delete().eq("product_id", id),
        supabase.from("email_logs").delete().eq("product_id", id),
        supabase.from("sales_pages").delete().eq("product_id", id),
      ]);

      // 2. Order bumps (references product_id AND bump_product_id)
      await Promise.all([
        supabase.from("order_bumps").delete().eq("product_id", id),
        supabase.from("order_bumps").delete().eq("bump_product_id", id),
      ]);

      // 3. Upsell offers (references product_id AND upsell_product_id)
      await Promise.all([
        supabase.from("upsell_offers").delete().eq("product_id", id),
        supabase.from("upsell_offers").delete().eq("upsell_product_id", id),
      ]);

      // 4. Courses and nested content (lessons → modules → courses)
      const { data: courses } = await supabase.from("courses").select("id").eq("product_id", id);
      if (courses && courses.length > 0) {
        const courseIds = courses.map((c) => c.id);
        const { data: modules } = await supabase.from("course_modules").select("id").in("course_id", courseIds);
        if (modules && modules.length > 0) {
          const moduleIds = modules.map((m) => m.id);
          const { data: lessons } = await supabase.from("course_lessons").select("id").in("module_id", moduleIds);
          if (lessons && lessons.length > 0) {
            const lessonIds = lessons.map((l) => l.id);
            await Promise.all([
              supabase.from("lesson_materials").delete().in("lesson_id", lessonIds),
              supabase.from("lesson_progress").delete().in("lesson_id", lessonIds),
              supabase.from("lesson_reviews").delete().in("lesson_id", lessonIds),
            ]);
          }
          await supabase.from("course_lessons").delete().in("module_id", moduleIds);
        }
        await supabase.from("course_modules").delete().in("course_id", courseIds);
        await Promise.all([
          supabase.from("member_access").delete().in("course_id", courseIds),
          supabase.from("courses").delete().in("id", courseIds),
        ]);
      }

      // 5. Orders referencing this product
      await supabase.from("orders").delete().eq("product_id", id);

      // 6. Finally delete the product itself
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      loadProducts();
    } catch (err: any) {
      console.error("Erro ao excluir produto:", err);
      toast.error("Erro ao excluir produto: " + (err.message || "Erro desconhecido"));
    }
  };

  const openDialog = () => {
    setStep(1);
    setPaymentType("one_time");
    setNewName("");
    setNewDescription("");
    setNewSalesPage("");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }
    setCreating(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from("products").insert({
        name: newName.trim(),
        description: newDescription.trim() || null,
        is_subscription: paymentType === "subscription",
        billing_cycle: paymentType === "subscription" ? "monthly" : "monthly",
        price: 0,
        user_id: currentUser.id,
      }).select("id").single();

      if (error) throw error;
      toast.success("Produto criado!");
      setDialogOpen(false);
      navigate(`/admin/products/${data.id}/edit`);
    } catch (err: any) {
      toast.error("Erro ao criar produto: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? p.active : !p.active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
        <Button onClick={openDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Criar produto
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Nome</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Preço</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/admin/products/${p.id}/edit`)}>
                <TableCell className="font-medium text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.is_subscription && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Assinatura
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmt(p.price)}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${p.active ? "text-primary" : "text-muted-foreground"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(`${getPublicUrl()}/checkout/${p.id}`); toast.success("Link copiado!"); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/products/${p.id}/edit`)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`${getPublicUrl()}/checkout/${p.id}`, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5 mr-2" /> Ver checkout
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${getPublicUrl()}/checkout/${p.id}`); toast.success("Link copiado!"); }}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">Nenhum produto encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-center text-xs text-muted-foreground">Exibindo {filtered.length} de {products.length} produtos</p>

      {/* Dialog de criação em duas etapas */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Criar produto</DialogTitle>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de pagamento</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "one_time" | "subscription")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Pagamento único</SelectItem>
                    <SelectItem value="subscription">Assinatura recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setStep(2)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                Continuar →
              </Button>
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome do produto</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder=""
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explique seu produto em pelo menos 100 caracteres"
                  className="resize-y min-h-[80px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{newDescription.length}/500</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Página de vendas</Label>
                <p className="text-xs text-muted-foreground">Se você não tem um site, coloque o seu perfil do Instagram</p>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={newSalesPage}
                    onChange={(e) => setNewSalesPage(e.target.value)}
                    placeholder="https://example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {creating ? "Criando..." : "Criar produto"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
