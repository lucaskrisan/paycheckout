import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, ChevronLeft, ChevronRight, Download, Copy, Check, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface AbandonedCart {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  recovered: boolean;
  created_at: string;
  product_id: string;
  products?: { name: string } | null;
}

const ITEMS_PER_PAGE = 20;

const AbandonedCarts = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("7d");

  useEffect(() => {
    const load = async () => {
      const [cartsRes, productsRes] = await Promise.all([
        supabase
          .from("abandoned_carts")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("products").select("id, name"),
      ]);
      setCarts((cartsRes.data as any) || []);
      setProducts(productsRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = carts;

    // Period
    if (filterPeriod !== "all") {
      const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
      const from = new Date(Date.now() - days * 86400000);
      result = result.filter(c => new Date(c.created_at) >= from);
    }

    // Product
    if (filterProduct !== "all") {
      result = result.filter(c => c.product_id === filterProduct);
    }

    // Status
    if (filterStatus === "recovered") {
      result = result.filter(c => c.recovered);
    } else if (filterStatus === "abandoned") {
      result = result.filter(c => !c.recovered);
    }

    return result;
  }, [carts, filterProduct, filterStatus, filterPeriod]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [filterProduct, filterStatus, filterPeriod]);

  const buildCheckoutUrl = (cart: AbandonedCart) => {
    const base = `${window.location.origin}/checkout/${cart.product_id}`;
    const params = new URLSearchParams();
    if (cart.customer_name) params.set("name", cart.customer_name);
    if (cart.customer_email) params.set("email", cart.customer_email);
    return params.toString() ? `${base}?${params}` : base;
  };

  const copyUrl = (cart: AbandonedCart) => {
    navigator.clipboard.writeText(buildCheckoutUrl(cart));
    setCopiedId(cart.id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsApp = (phone: string | null, cart: AbandonedCart) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const url = buildCheckoutUrl(cart);
    const msg = encodeURIComponent(`Olá! Vi que você se interessou pelo nosso produto. Finalize sua compra aqui: ${url}`);
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  };

  const exportCSV = () => {
    const rows = [["Data", "Produto", "Cliente", "E-mail", "Celular", "Status"]];
    filtered.forEach(c => {
      rows.push([
        format(new Date(c.created_at), "dd/MM/yyyy HH:mm"),
        c.products?.name || "",
        c.customer_name || "",
        c.customer_email || "",
        c.customer_phone || "",
        c.recovered ? "Recuperado" : "Abandonado",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vendas-abandonadas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Vendas abandonadas</h1>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os produtos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="abandoned">Abandonados</SelectItem>
            <SelectItem value="recovered">Recuperados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Tempo todo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : paginated.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma venda abandonada encontrada.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DATA</TableHead>
                      <TableHead>PRODUTO</TableHead>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead>CELULAR</TableHead>
                      <TableHead>CHECKOUT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(cart => (
                      <TableRow key={cart.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(cart.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {cart.products?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cart.customer_name || "—"}</p>
                            {cart.customer_email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                ✉ {cart.customer_email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cart.customer_phone ? (
                            <button
                              onClick={() => openWhatsApp(cart.customer_phone, cart)}
                              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{cart.customer_phone}</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => copyUrl(cart)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-xs font-mono max-w-[280px] truncate transition-colors"
                            title="Copiar link"
                          >
                            {copiedId === cart.id ? (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{buildCheckoutUrl(cart)}</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Exibindo {page} de {totalPages} páginas
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                      return (
                        <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setPage(pageNum)}>
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AbandonedCarts;
