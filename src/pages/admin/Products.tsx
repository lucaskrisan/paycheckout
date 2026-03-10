import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MoreVertical, Search, Pencil, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PUBLISHED_URL = "https://paycheckout.lovable.app";
const getPublicUrl = () => (window.location.hostname.includes("preview") ? PUBLISHED_URL : window.location.origin);

interface Product {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, price, active").order("created_at", { ascending: false });
    setProducts(data || []);
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
        <Button onClick={() => navigate("/admin/products/new/edit")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
                <TableCell className="font-medium text-sm text-foreground">{p.name}</TableCell>
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
    </div>
  );
};

export default Products;
