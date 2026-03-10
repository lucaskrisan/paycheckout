import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MoreVertical, Search, Pencil, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PUBLISHED_URL = "https://paycheckout.lovable.app";
const getPublicUrl = () => (window.location.hostname.includes("preview") ? PUBLISHED_URL : window.location.origin);

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  active: boolean;
  image_url: string | null;
}

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "", description: "", price: "", original_price: "", active: true,
    payment_type: "one_time", delivery: "members_area", course_id: "new",
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", original_price: "", active: true });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      original_price: p.original_price ? String(p.original_price) : "",
      active: p.active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    const payload: any = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      active: form.active,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Produto atualizado!");
    } else {
      payload.user_id = user?.id;
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Produto criado!");
    }
    setOpen(false);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto excluído");
    loadProducts();
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? p.active : !p.active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
        <Button onClick={openNew} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          Criar produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
              <TableRow key={p.id} className="hover:bg-muted/30">
                <TableCell className="font-medium text-sm text-foreground">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmt(p.price)}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${p.active ? "text-primary" : "text-muted-foreground"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        navigator.clipboard.writeText(`${getPublicUrl()}/checkout/${p.id}`);
                        toast.success("Link copiado!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(`${getPublicUrl()}/checkout/${p.id}`, "_blank")}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-2" /> Ver checkout
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(`${getPublicUrl()}/checkout/${p.id}`);
                            toast.success("Link copiado!");
                          }}
                        >
                          <Copy className="w-3.5 h-3.5 mr-2" /> Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(p.id)}
                        >
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
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Exibindo {filtered.length} de {products.length} produtos
      </p>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Preço original (R$)</Label>
                <Input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Produto ativo</Label>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
