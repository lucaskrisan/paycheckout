import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, X, ChevronLeft, ChevronRight, DollarSign, ShoppingCart, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Order {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  product_id: string | null;
  customers: { name: string; email: string } | null;
  products: { name: string } | null;
}

const ITEMS_PER_PAGE = 20;

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  paid: { label: "Pago", class: "bg-primary/10 text-primary border-primary/20" },
  approved: { label: "Aprovado", class: "bg-primary/10 text-primary border-primary/20" },
  confirmed: { label: "Confirmado", class: "bg-primary/10 text-primary border-primary/20" },
  pending: { label: "Aguardando pagamento", class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  refunded: { label: "Reembolso", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  refused: { label: "Recusado", class: "bg-destructive/10 text-destructive border-destructive/20" },
  failed: { label: "Recusado", class: "bg-destructive/10 text-destructive border-destructive/20" },
  chargeback: { label: "Chargeback", class: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground border-border" },
};

const PAYMENT_METHODS = [
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
];

const STATUS_FILTERS = [
  { value: "paid", label: "Pago" },
  { value: "approved", label: "Aprovado" },
  { value: "pending", label: "Aguardando pagamento" },
  { value: "refused", label: "Recusado" },
  { value: "refunded", label: "Reembolso" },
  { value: "chargeback", label: "Chargeback" },
  { value: "cancelled", label: "Cancelado" },
];

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"approved" | "all">("approved");
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterMethods, setFilterMethods] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSendPixReminder = async (orderId: string) => {
    setSendingReminder(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("send-pix-reminder", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Lembrete enviado para ${data.email}! ✉️`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar lembrete");
    } finally {
      setSendingReminder(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, customers(name, email), products(name)")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, name"),
      ]);
      setOrders((ordersRes.data as any) || []);
      setProducts(productsRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const toggleFilter = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const clearFilters = () => {
    setFilterPeriod("all");
    setFilterProduct("all");
    setFilterMethods(new Set());
    setFilterStatuses(new Set());
    setSearch("");
  };

  const hasActiveFilters = filterPeriod !== "all" || filterProduct !== "all" || filterMethods.size > 0 || filterStatuses.size > 0;

  const filtered = useMemo(() => {
    let result = orders;

    // Tab filter
    if (activeTab === "approved") {
      result = result.filter(o => ["paid", "approved", "confirmed"].includes(o.status));
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(s) ||
        o.customers?.name?.toLowerCase().includes(s) ||
        o.customers?.email?.toLowerCase().includes(s) ||
        o.products?.name?.toLowerCase().includes(s)
      );
    }

    // Period
    if (filterPeriod !== "all") {
      const now = new Date();
      let from: Date;
      switch (filterPeriod) {
        case "today": from = new Date(now.setHours(0, 0, 0, 0)); break;
        case "7d": from = new Date(Date.now() - 7 * 86400000); break;
        case "30d": from = new Date(Date.now() - 30 * 86400000); break;
        case "90d": from = new Date(Date.now() - 90 * 86400000); break;
        default: from = new Date(0);
      }
      result = result.filter(o => new Date(o.created_at) >= from);
    }

    // Product
    if (filterProduct !== "all") {
      result = result.filter(o => o.product_id === filterProduct);
    }

    // Payment method
    if (filterMethods.size > 0) {
      result = result.filter(o => filterMethods.has(o.payment_method));
    }

    // Status
    if (filterStatuses.size > 0) {
      result = result.filter(o => filterStatuses.has(o.status));
    }

    return result;
  }, [orders, search, activeTab, filterPeriod, filterProduct, filterMethods, filterStatuses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalAmount = filtered.reduce((sum, o) => sum + Number(o.amount), 0);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, activeTab, filterPeriod, filterProduct, filterMethods, filterStatuses]);

  const getStatus = (status: string) => STATUS_MAP[status] || { label: status, class: "bg-muted text-muted-foreground border-border" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Vendas</h1>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-80 overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Filtros</SheetTitle>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                    Limpar filtros
                  </button>
                )}
              </div>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Period */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tempo todo</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Produto</Label>
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment method */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Método de pagamento</Label>
                  {filterMethods.size > 0 && (
                    <button onClick={() => setFilterMethods(new Set())} className="text-xs text-primary hover:underline">
                      Limpar
                    </button>
                  )}
                </div>
                {PAYMENT_METHODS.map(m => (
                  <div key={m.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`method-${m.value}`}
                      checked={filterMethods.has(m.value)}
                      onCheckedChange={() => setFilterMethods(prev => toggleFilter(prev, m.value))}
                    />
                    <label htmlFor={`method-${m.value}`} className="text-sm cursor-pointer">{m.label}</label>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Status</Label>
                  {filterStatuses.size > 0 && (
                    <button onClick={() => setFilterStatuses(new Set())} className="text-xs text-primary hover:underline">
                      Limpar
                    </button>
                  )}
                </div>
                {STATUS_FILTERS.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${s.value}`}
                      checked={filterStatuses.has(s.value)}
                      onCheckedChange={() => setFilterStatuses(prev => toggleFilter(prev, s.value))}
                    />
                    <label htmlFor={`status-${s.value}`} className="text-sm cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, e-mail, produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas encontradas</p>
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor líquido</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "approved"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Aprovadas
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Todas
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">DATA</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">PRODUTO</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">CLIENTE</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">STATUS</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">VALOR LÍQUIDO</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">AÇÕES</th>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                   <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                ) : (
                  paginated.map((order) => {
                    const st = getStatus(order.status);
                    return (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="py-3 px-4 font-medium max-w-[200px] truncate">
                          {order.products?.name || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{order.customers?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{order.customers?.email || ""}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={st.class}>
                            {st.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                          R$ {Number(order.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Exibindo {page} de {totalPages} páginas
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && page < totalPages - 2 && (
                  <span className="px-1 text-muted-foreground">...</span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
