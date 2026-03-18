// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Download, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EmailPreviewModal } from "@/components/admin/EmailPreviewModal";

interface Order {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  product_id: string | null;
  customers: { name: string; email: string; phone?: string; cpf?: string } | null;
  products: { name: string } | null;
}

const ITEMS_PER_PAGE = 20;

const STATUS_MAP: Record<string, { label: string; variant: "paid" | "pending" | "refunded" | "refused" | "default" }> = {
  paid: { label: "Pago", variant: "paid" },
  approved: { label: "Pago", variant: "paid" },
  confirmed: { label: "Pago", variant: "paid" },
  pending: { label: "Aguardando pagamento", variant: "pending" },
  refunded: { label: "Reembolsado", variant: "refunded" },
  refused: { label: "Recusado", variant: "refused" },
  failed: { label: "Recusado", variant: "refused" },
  chargeback: { label: "Chargeback", variant: "refused" },
  cancelled: { label: "Cancelado", variant: "default" },
};

const VARIANT_CLASSES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  refunded: "bg-blue-50 text-blue-700 border-blue-200",
  refused: "bg-red-50 text-red-700 border-red-200",
  default: "bg-muted text-muted-foreground border-border",
};

const PAYMENT_METHODS = [
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "credit_card_pix", label: "Cartão + Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "Pix" },
];

const STATUS_FILTERS = [
  { value: "paid", label: "Pago" },
  { value: "refused", label: "Recusado" },
  { value: "pending", label: "Aguardando pagamento" },
  { value: "refunded", label: "Reembolso" },
  { value: "chargeback", label: "Chargeback" },
  { value: "refund_pending", label: "Reembolso pendente" },
  { value: "authorized", label: "Autorizado" },
];

const SUBSCRIPTION_FILTERS = [
  { value: "new", label: "Novas assinaturas" },
  { value: "renewal", label: "Renovações" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "single", label: "Venda única" },
  { value: "subscription", label: "Assinatura" },
];

const CURRENCY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "BRL", label: "BRL" },
];

const PAYMENT_LABEL: Record<string, string> = {
  credit_card: "Cartão de crédito",
  pix: "Pix",
  boleto: "Boleto",
};

const DetailRow = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
  <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground font-medium text-right max-w-[200px] break-all">
      {children || value || "—"}
    </span>
  </div>
);

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"approved" | "all">("approved");
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailTab, setDetailTab] = useState<"sale" | "customer" | "values">("sale");
  const [emailPreview, setEmailPreview] = useState<{
    open: boolean;
    orderId: string;
    subject: string;
    body: string;
    fullHtml: string;
    to: string;
    customerName: string;
    productName: string;
  } | null>(null);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterOffer, setFilterOffer] = useState("all");
  const [filterAffiliate, setFilterAffiliate] = useState("");
  const [filterUtmParams, setFilterUtmParams] = useState("");
  const [filterMethods, setFilterMethods] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterSubscriptions, setFilterSubscriptions] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handlePreviewReminder = async (orderId: string) => {
    setSendingReminder(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("send-pix-reminder", {
        body: { order_id: orderId, preview: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEmailPreview({
        open: true,
        orderId,
        subject: data.subject,
        body: data.body,
        fullHtml: data.fullHtml,
        to: data.to,
        customerName: data.customerName,
        productName: data.productName,
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar preview do email");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleConfirmSend = async (subject: string, body: string) => {
    if (!emailPreview) return;
    const { data, error } = await supabase.functions.invoke("send-pix-reminder", {
      body: { order_id: emailPreview.orderId, subject, body },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    toast.success(`Lembrete enviado para ${data.email}! ✉️`);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, customers(name, email, phone, cpf), products(name)")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, name").eq("user_id", user?.id),
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
    setFilterCurrency("all");
    setFilterType("all");
    setFilterProduct("all");
    setFilterOffer("all");
    setFilterAffiliate("");
    setFilterUtmParams("");
    setFilterMethods(new Set());
    setFilterStatuses(new Set());
    setFilterSubscriptions(new Set());
    setSearch("");
  };

  const hasActiveFilters = filterPeriod !== "all" || filterCurrency !== "all" || filterType !== "all" || filterProduct !== "all" || filterOffer !== "all" || filterAffiliate !== "" || filterUtmParams !== "" || filterMethods.size > 0 || filterStatuses.size > 0 || filterSubscriptions.size > 0;

  const filtered = useMemo(() => {
    let result = orders;

    if (activeTab === "approved") {
      result = result.filter(o => ["paid", "approved", "confirmed"].includes(o.status));
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(s) ||
        o.customers?.name?.toLowerCase().includes(s) ||
        o.customers?.email?.toLowerCase().includes(s) ||
        o.products?.name?.toLowerCase().includes(s)
      );
    }

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

    if (filterProduct !== "all") {
      result = result.filter(o => o.product_id === filterProduct);
    }

    if (filterMethods.size > 0) {
      result = result.filter(o => filterMethods.has(o.payment_method));
    }

    if (filterStatuses.size > 0) {
      result = result.filter(o => filterStatuses.has(o.status));
    }

    return result;
  }, [orders, search, activeTab, filterPeriod, filterProduct, filterMethods, filterStatuses, filterType, filterSubscriptions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalAmount = filtered.reduce((sum, o) => sum + Number(o.amount), 0);

  useEffect(() => { setPage(1); }, [search, activeTab, filterPeriod, filterProduct, filterMethods, filterStatuses, filterType, filterSubscriptions, filterCurrency]);

  const getStatus = (status: string) => STATUS_MAP[status] || { label: status, variant: "default" as const };

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("Nenhuma venda para exportar"); return; }
    const header = "Data,Produto,Cliente,Email,Status,Método,Valor\n";
    const csv = filtered.map(o =>
      `"${format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}","${o.products?.name || ""}","${o.customers?.name || ""}","${o.customers?.email || ""}","${getStatus(o.status).label}","${PAYMENT_LABEL[o.payment_method] || o.payment_method}","${Number(o.amount).toFixed(2)}"`
    ).join("\n");
    const blob = new Blob([header + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vendas-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Vendas</h1>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Search + Filter button */}
      <div className="flex items-center gap-3 border border-border rounded-lg bg-card px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Buscar por cliente, e-mail, produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          onClick={() => setFiltersOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors shrink-0 ${
            hasActiveFilters
              ? "border-primary text-primary bg-primary/5"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 border border-border rounded-lg bg-card overflow-hidden">
        <div className="p-5 border-r border-border">
          <p className="text-sm text-muted-foreground">Vendas encontradas</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {filtered.length.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">Valor líquido</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "approved"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          Aprovadas
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "all"
              ? "text-foreground border border-foreground/30"
              : "text-muted-foreground hover:text-foreground border border-border"
          }`}
        >
          Todas
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Data</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Produto</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Valor líquido</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Carregando vendas...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted-foreground">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                paginated.map((order) => {
                  const st = getStatus(order.status);
                  const isPendingPix = order.status === "pending" && order.payment_method === "pix" && order.customers?.email;
                  return (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setSelectedOrder(order); setDetailTab("sale"); }}>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap text-sm">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <span className="text-sm text-foreground truncate block">
                          {order.products?.name || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="text-sm text-foreground">{order.customers?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{order.customers?.email || ""}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <Badge variant="outline" className={`text-xs font-medium ${VARIANT_CLASSES[st.variant]}`}>
                            {st.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {PAYMENT_LABEL[order.payment_method] || order.payment_method}
                          </p>
                        </div>
                        {isPendingPix && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs h-6 px-2 mt-1 text-primary hover:text-primary"
                            disabled={sendingReminder === order.id}
                            onClick={() => handlePreviewReminder(order.id)}
                          >
                            {sendingReminder === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                            Enviar lembrete
                          </Button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium whitespace-nowrap text-sm">
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
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
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
      </div>

      {/* Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="w-80 overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Filtros</SheetTitle>
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

            {/* Currency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Moeda</Label>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
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

            {/* Offer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Oferta</Label>
              <Select value={filterOffer} onValueChange={setFilterOffer}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Affiliate */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Afiliado</Label>
              <Input
                placeholder="Selecione um afiliado (buscar)"
                value={filterAffiliate}
                onChange={(e) => setFilterAffiliate(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* UTM Params */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Parâmetros de URL</Label>
              <Input
                placeholder="utm_source, utm_medium..."
                value={filterUtmParams}
                onChange={(e) => setFilterUtmParams(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Payment method */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Método de pagamento</Label>
                <button onClick={() => setFilterMethods(prev => prev.size === PAYMENT_METHODS.length ? new Set() : new Set(PAYMENT_METHODS.map(m => m.value)))} className="text-xs text-primary hover:underline">
                  {filterMethods.size === PAYMENT_METHODS.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
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
                <button onClick={() => setFilterStatuses(prev => prev.size === STATUS_FILTERS.length ? new Set() : new Set(STATUS_FILTERS.map(s => s.value)))} className="text-xs text-primary hover:underline">
                  {filterStatuses.size === STATUS_FILTERS.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
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

            {/* Subscription */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Assinatura</Label>
                <button onClick={() => setFilterSubscriptions(prev => prev.size === SUBSCRIPTION_FILTERS.length ? new Set() : new Set(SUBSCRIPTION_FILTERS.map(s => s.value)))} className="text-xs text-primary hover:underline">
                  {filterSubscriptions.size === SUBSCRIPTION_FILTERS.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
              {SUBSCRIPTION_FILTERS.map(s => (
                <div key={s.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`sub-${s.value}`}
                    checked={filterSubscriptions.has(s.value)}
                    onCheckedChange={() => setFilterSubscriptions(prev => toggleFilter(prev, s.value))}
                  />
                  <label htmlFor={`sub-${s.value}`} className="text-sm cursor-pointer">{s.label}</label>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Order Detail Drawer */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <SheetContent className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Ver detalhes</SheetTitle>
            </div>
          </SheetHeader>
          {selectedOrder && (() => {
            const st = getStatus(selectedOrder.status);
            return (
              <div className="mt-4">
                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-border mb-5">
                  {([
                    { key: "sale" as const, label: "Venda" },
                    { key: "customer" as const, label: "Cliente" },
                    { key: "values" as const, label: "Valores" },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        detailTab === tab.key
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {detailTab === "sale" && (
                  <div className="space-y-4">
                    <DetailRow label="ID da venda" value={selectedOrder.id.slice(0, 8).toUpperCase()} />
                    <DetailRow label="Status">
                      <Badge variant="outline" className={`text-xs font-medium ${VARIANT_CLASSES[st.variant]}`}>
                        {st.label}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Tipo" value="Sou produtor" />
                    <DetailRow label="Valor líquido" value={`R$ ${Number(selectedOrder.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <DetailRow label="Produto" value={selectedOrder.products?.name || "—"} />
                    <DetailRow label="Método de pagamento" value={PAYMENT_LABEL[selectedOrder.payment_method] || selectedOrder.payment_method} />
                    <DetailRow label="Parcelas" value="1" />
                    <DetailRow label="Data da criação" value={format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")} />
                    {selectedOrder.updated_at && ["paid", "approved", "confirmed"].includes(selectedOrder.status) && (
                      <DetailRow label="Data da aprovação" value={format(new Date(selectedOrder.updated_at), "dd/MM/yyyy HH:mm")} />
                    )}
                  </div>
                )}

                {detailTab === "customer" && (
                  <div className="space-y-4">
                    <DetailRow label="Nome" value={selectedOrder.customers?.name || "—"} />
                    <DetailRow label="E-mail" value={selectedOrder.customers?.email || "—"} />
                    <DetailRow label="Telefone" value={selectedOrder.customers?.phone || "—"} />
                    <DetailRow label="CPF" value={selectedOrder.customers?.cpf || "—"} />
                  </div>
                )}

                {detailTab === "values" && (
                  <div className="space-y-4">
                    <DetailRow label="Valor bruto" value={`R$ ${Number(selectedOrder.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <DetailRow label="Taxa da plataforma" value={`R$ ${Number((selectedOrder as any).platform_fee_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <DetailRow label="Valor líquido" value={`R$ ${(Number(selectedOrder.amount) - Number((selectedOrder as any).platform_fee_amount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Email Preview Modal */}
      {emailPreview && (
        <EmailPreviewModal
          open={emailPreview.open}
          onOpenChange={(open) => { if (!open) setEmailPreview(null); }}
          subject={emailPreview.subject}
          body={emailPreview.body}
          fullHtml={emailPreview.fullHtml}
          to={emailPreview.to}
          customerName={emailPreview.customerName}
          productName={emailPreview.productName}
          onSend={handleConfirmSend}
        />
      )}
    </div>
  );
};

export default Orders;
