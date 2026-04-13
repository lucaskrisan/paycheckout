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
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Download, Mail, Loader2, Package, ShoppingBag, Zap, TrendingUp, DollarSign } from "lucide-react";
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
  metadata: any;
  platform_fee_amount?: number;
  customers: { name: string; email: string; phone?: string; cpf?: string } | null;
  products: { name: string } | null;
}

const ITEMS_PER_PAGE = 20;

const STATUS_MAP: Record<string, { label: string; variant: "paid" | "pending" | "refunded" | "refused" | "default" }> = {
  paid: { label: "Pago", variant: "paid" },
  approved: { label: "Pago", variant: "paid" },
  confirmed: { label: "Pago", variant: "paid" },
  pending: { label: "Aguardando", variant: "pending" },
  refunded: { label: "Reembolsado", variant: "refunded" },
  refused: { label: "Recusado", variant: "refused" },
  failed: { label: "Recusado", variant: "refused" },
  chargeback: { label: "Chargeback", variant: "refused" },
  cancelled: { label: "Cancelado", variant: "default" },
};

const VARIANT_CLASSES: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  refunded: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  refused: "bg-red-500/10 text-red-400 border-red-500/20",
  default: "bg-muted/50 text-muted-foreground border-border",
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

const SALE_TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "front", label: "Produto principal" },
  { value: "with_bumps", label: "Com order bumps" },
  { value: "upsell", label: "Upsell" },
];

const CURRENCY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "BRL", label: "BRL" },
];

const PAYMENT_LABEL: Record<string, string> = {
  credit_card: "Cartão",
  pix: "Pix",
  boleto: "Boleto",
};

const DetailRow = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-border/30 last:border-0">
    <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className="text-sm text-foreground font-medium text-right max-w-[220px] break-all">
      {children || value || "—"}
    </span>
  </div>
);

const getBumpIds = (order: Order): string[] => {
  const ids = order.metadata?.bump_product_ids;
  if (!ids || !Array.isArray(ids)) return [];
  return ids.filter(Boolean);
};

const isUpsellOrder = (order: Order): boolean => {
  return !!order.metadata?.is_upsell || !!order.metadata?.upsell_from_order_id;
};

const Orders = () => {
  const { user, isSuperAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"approved" | "all">("approved");
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailTab, setDetailTab] = useState<"sale" | "customer" | "values" | "products">("sale");
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

  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSaleType, setFilterSaleType] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterOffer, setFilterOffer] = useState("all");
  const [filterAffiliate, setFilterAffiliate] = useState("");
  const [filterUtmParams, setFilterUtmParams] = useState("");
  const [filterMethods, setFilterMethods] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterSubscriptions, setFilterSubscriptions] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [products]);

  const handlePreviewReminder = async (orderId: string) => {
    setSendingReminder(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("send-pix-reminder", {
        body: { order_id: orderId, preview: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEmailPreview({ open: true, orderId, subject: data.subject, body: data.body, fullHtml: data.fullHtml, to: data.to, customerName: data.customerName, productName: data.productName });
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
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      let ordersQuery = supabase.from("orders").select("*, customers(name, email, phone, cpf), products(name)").order("created_at", { ascending: false }).limit(1000);
      if (!isSuperAdmin) ordersQuery = ordersQuery.eq("user_id", user.id);
      const [ordersRes, productsRes] = await Promise.all([
        ordersQuery,
        supabase.from("products").select("id, name").eq("user_id", user.id),
      ]);
      setOrders((ordersRes.data as any) || []);
      setProducts(productsRes.data || []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const toggleFilter = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const clearFilters = () => {
    setFilterPeriod("all"); setFilterCurrency("all"); setFilterType("all"); setFilterSaleType("all");
    setFilterProduct("all"); setFilterOffer("all"); setFilterAffiliate(""); setFilterUtmParams("");
    setFilterMethods(new Set()); setFilterStatuses(new Set()); setFilterSubscriptions(new Set()); setSearch("");
  };

  const hasActiveFilters = filterPeriod !== "all" || filterCurrency !== "all" || filterType !== "all" || filterSaleType !== "all" || filterProduct !== "all" || filterOffer !== "all" || filterAffiliate !== "" || filterUtmParams !== "" || filterMethods.size > 0 || filterStatuses.size > 0 || filterSubscriptions.size > 0;

  const filtered = useMemo(() => {
    let result = orders;
    if (filterStatuses.size > 0) {
      const expanded = new Set(filterStatuses);
      if (expanded.has("paid")) { expanded.add("approved"); expanded.add("confirmed"); }
      if (expanded.has("refused")) { expanded.add("failed"); }
      result = result.filter(o => expanded.has(o.status));
    } else if (activeTab === "approved") {
      result = result.filter(o => ["paid", "approved", "confirmed"].includes(o.status));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o => o.id.toLowerCase().includes(s) || o.customers?.name?.toLowerCase().includes(s) || o.customers?.email?.toLowerCase().includes(s) || o.products?.name?.toLowerCase().includes(s));
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
    if (filterProduct !== "all") result = result.filter(o => o.product_id === filterProduct);
    if (filterMethods.size > 0) result = result.filter(o => filterMethods.has(o.payment_method));
    if (filterSaleType !== "all") {
      result = result.filter(o => {
        const hasBumps = getBumpIds(o).length > 0;
        const isUpsell = isUpsellOrder(o);
        switch (filterSaleType) {
          case "front": return !hasBumps && !isUpsell;
          case "with_bumps": return hasBumps;
          case "upsell": return isUpsell;
          default: return true;
        }
      });
    }
    return result;
  }, [orders, search, activeTab, filterPeriod, filterProduct, filterMethods, filterStatuses, filterType, filterSubscriptions, filterSaleType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalAmount = filtered.reduce((sum, o) => sum + Number(o.amount), 0);

  useEffect(() => { setPage(1); }, [search, activeTab, filterPeriod, filterProduct, filterMethods, filterStatuses, filterType, filterSubscriptions, filterCurrency, filterSaleType]);

  const getStatus = (status: string) => STATUS_MAP[status] || { label: status, variant: "default" as const };

  const getSaleTypeBadge = (order: Order) => {
    const bumpIds = getBumpIds(order);
    const isUpsell = isUpsellOrder(order);
    const badges: React.ReactNode[] = [];
    if (isUpsell) badges.push(<Badge key="upsell" variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20 gap-1"><Zap className="w-2.5 h-2.5" />Upsell</Badge>);
    if (bumpIds.length > 0) badges.push(<Badge key="bump" variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1"><ShoppingBag className="w-2.5 h-2.5" />+{bumpIds.length} bump{bumpIds.length > 1 ? "s" : ""}</Badge>);
    return badges;
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("Nenhuma venda para exportar"); return; }
    const header = "Data,Produto,Cliente,Email,Status,Método,Valor,Order Bumps,UTM Source\n";
    const csv = filtered.map(o => {
      const bumpNames = getBumpIds(o).map(id => productMap[id] || id.slice(0, 8)).join("; ");
      return `"${format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}","${o.products?.name || ""}","${o.customers?.name || ""}","${o.customers?.email || ""}","${getStatus(o.status).label}","${PAYMENT_LABEL[o.payment_method] || o.payment_method}","${Number(o.amount).toFixed(2)}","${bumpNames}","${o.metadata?.utm_source || ""}"`;
    }).join("\n");
    const blob = new Blob([header + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vendas-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída!");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie e acompanhe todas as suas transações</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 group hover:border-primary/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Vendas encontradas</span>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {filtered.length.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 group hover:border-primary/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Valor líquido</span>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search + Filter + Tabs row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 w-full rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm px-3.5 py-2.5 focus-within:border-primary/40 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar por cliente, e-mail, produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card/60 backdrop-blur-sm rounded-lg border border-border/50 p-0.5">
            <button
              onClick={() => setActiveTab("approved")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "approved"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aprovadas
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "all"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
            </button>
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
              hasActiveFilters
                ? "border-primary/40 text-primary bg-primary/5 shadow-sm shadow-primary/10"
                : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border bg-card/60 backdrop-blur-sm"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3.5 px-5 font-semibold text-muted-foreground text-[11px] uppercase tracking-widest">Data</th>
                <th className="text-left py-3.5 px-5 font-semibold text-muted-foreground text-[11px] uppercase tracking-widest">Produto</th>
                <th className="text-left py-3.5 px-5 font-semibold text-muted-foreground text-[11px] uppercase tracking-widest">Cliente</th>
                <th className="text-left py-3.5 px-5 font-semibold text-muted-foreground text-[11px] uppercase tracking-widest">Status</th>
                <th className="text-right py-3.5 px-5 font-semibold text-muted-foreground text-[11px] uppercase tracking-widest">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span className="text-sm text-muted-foreground">Carregando vendas...</span>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted-foreground text-sm">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                paginated.map((order, idx) => {
                  const st = getStatus(order.status);
                  const isPendingPix = order.status === "pending" && order.payment_method === "pix" && order.customers?.email;
                  const typeBadges = getSaleTypeBadge(order);
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border/30 hover:bg-primary/[0.03] transition-colors cursor-pointer group"
                      onClick={() => { setSelectedOrder(order); setDetailTab("sale"); }}
                    >
                      <td className="py-4 px-5 text-muted-foreground whitespace-nowrap text-sm tabular-nums">
                        {format(new Date(order.created_at), "dd/MM/yyyy")}
                        <span className="text-muted-foreground/50 ml-1.5">{format(new Date(order.created_at), "HH:mm")}</span>
                      </td>
                      <td className="py-4 px-5 max-w-[240px]">
                        <span className="text-sm text-foreground font-medium truncate block group-hover:text-primary/90 transition-colors">
                          {order.products?.name || "—"}
                        </span>
                        {typeBadges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">{typeBadges}</div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm text-foreground font-medium">{order.customers?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{order.customers?.email || ""}</p>
                      </td>
                      <td className="py-4 px-5">
                        <div className="space-y-1.5">
                          <Badge variant="outline" className={`text-[11px] font-semibold ${VARIANT_CLASSES[st.variant]}`}>
                            {st.label}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground/60">
                            {PAYMENT_LABEL[order.payment_method] || order.payment_method}
                          </p>
                        </div>
                        {isPendingPix && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[11px] h-6 px-2 mt-1.5 text-primary/80 hover:text-primary hover:bg-primary/5"
                            disabled={sendingReminder === order.id}
                            onClick={(e) => { e.stopPropagation(); handlePreviewReminder(order.id); }}
                          >
                            {sendingReminder === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                            Lembrete
                          </Button>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right font-semibold whitespace-nowrap text-sm tabular-nums">
                        <span className="text-foreground">R$ {Number(order.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/30">
            <p className="text-xs text-muted-foreground/70">
              Página <span className="text-foreground font-medium">{page}</span> de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <Button
                    key={pageNum}
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 text-xs ${page === pageNum ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="w-[340px] overflow-y-auto border-l border-border/50 bg-background/95 backdrop-blur-xl">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold tracking-tight">Filtros</SheetTitle>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                  Limpar tudo
                </button>
              )}
            </div>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {/* Period */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="border-border/50 bg-card/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tempo todo</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sale Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de venda</Label>
              <Select value={filterSaleType} onValueChange={setFilterSaleType}>
                <SelectTrigger className="border-border/50 bg-card/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALE_TYPE_OPTIONS.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Product */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produto</Label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="border-border/50 bg-card/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {products.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="border-border/50 bg-card/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Moeda</Label>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger className="border-border/50 bg-card/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Offer */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Oferta</Label>
              <Select value={filterOffer} onValueChange={setFilterOffer}>
                <SelectTrigger className="border-border/50 bg-card/60"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
              </Select>
            </div>

            {/* Affiliate */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Afiliado</Label>
              <Input placeholder="Buscar afiliado..." value={filterAffiliate} onChange={(e) => setFilterAffiliate(e.target.value)} className="text-sm border-border/50 bg-card/60" />
            </div>

            {/* UTM */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parâmetros UTM</Label>
              <Input placeholder="utm_source, utm_medium..." value={filterUtmParams} onChange={(e) => setFilterUtmParams(e.target.value)} className="text-sm border-border/50 bg-card/60" />
            </div>

            {/* Payment method */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Método</Label>
                <button onClick={() => setFilterMethods(prev => prev.size === PAYMENT_METHODS.length ? new Set() : new Set(PAYMENT_METHODS.map(m => m.value)))} className="text-[11px] text-primary hover:underline font-medium">
                  {filterMethods.size === PAYMENT_METHODS.length ? "Limpar" : "Todos"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <div key={m.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${filterMethods.has(m.value) ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-border/60"}`} onClick={() => setFilterMethods(prev => toggleFilter(prev, m.value))}>
                    <Checkbox id={`method-${m.value}`} checked={filterMethods.has(m.value)} className="pointer-events-none" />
                    <label className="text-xs cursor-pointer">{m.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                <button onClick={() => setFilterStatuses(prev => prev.size === STATUS_FILTERS.length ? new Set() : new Set(STATUS_FILTERS.map(s => s.value)))} className="text-[11px] text-primary hover:underline font-medium">
                  {filterStatuses.size === STATUS_FILTERS.length ? "Limpar" : "Todos"}
                </button>
              </div>
              <div className="space-y-1.5">
                {STATUS_FILTERS.map(s => (
                  <div key={s.value} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${filterStatuses.has(s.value) ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-border/60"}`} onClick={() => setFilterStatuses(prev => toggleFilter(prev, s.value))}>
                    <Checkbox id={`status-${s.value}`} checked={filterStatuses.has(s.value)} className="pointer-events-none" />
                    <label className="text-xs cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assinatura</Label>
                <button onClick={() => setFilterSubscriptions(prev => prev.size === SUBSCRIPTION_FILTERS.length ? new Set() : new Set(SUBSCRIPTION_FILTERS.map(s => s.value)))} className="text-[11px] text-primary hover:underline font-medium">
                  {filterSubscriptions.size === SUBSCRIPTION_FILTERS.length ? "Limpar" : "Todos"}
                </button>
              </div>
              <div className="space-y-1.5">
                {SUBSCRIPTION_FILTERS.map(s => (
                  <div key={s.value} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${filterSubscriptions.has(s.value) ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-border/60"}`} onClick={() => setFilterSubscriptions(prev => toggleFilter(prev, s.value))}>
                    <Checkbox id={`sub-${s.value}`} checked={filterSubscriptions.has(s.value)} className="pointer-events-none" />
                    <label className="text-xs cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Order Detail Drawer */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <SheetContent className="w-[420px] overflow-y-auto border-l border-border/50 bg-background/95 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="text-base font-bold tracking-tight">Detalhes da venda</SheetTitle>
          </SheetHeader>
          {selectedOrder && (() => {
            const st = getStatus(selectedOrder.status);
            const bumpIds = getBumpIds(selectedOrder);
            const isUpsell = isUpsellOrder(selectedOrder);
            const meta = selectedOrder.metadata || {};
            const installments = meta.installments;
            const gateway = meta.gateway;
            const utmSource = meta.utm_source;
            const utmMedium = meta.utm_medium;
            const utmCampaign = meta.utm_campaign;
            const utmContent = meta.utm_content;
            const utmTerm = meta.utm_term;

            return (
              <div className="mt-5">
                {/* Tabs */}
                <div className="flex items-center bg-card/60 backdrop-blur-sm rounded-lg border border-border/50 p-0.5 mb-6">
                  {([
                    { key: "sale" as const, label: "Venda" },
                    { key: "products" as const, label: "Produtos", count: bumpIds.length > 0 ? 1 + bumpIds.length : undefined },
                    { key: "customer" as const, label: "Cliente" },
                    { key: "values" as const, label: "Valores" },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`flex-1 px-2.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                        detailTab === tab.key
                          ? "bg-primary/15 text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      {tab.count && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary/20 text-primary text-[10px] font-bold px-1">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {detailTab === "sale" && (
                  <div className="space-y-0">
                    <DetailRow label="ID" value={selectedOrder.id.slice(0, 8).toUpperCase()} />
                    <DetailRow label="Status">
                      <Badge variant="outline" className={`text-[11px] font-semibold ${VARIANT_CLASSES[st.variant]}`}>{st.label}</Badge>
                    </DetailRow>
                    <DetailRow label="Tipo">
                      {isUpsell ? <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-400 border-purple-500/20">Upsell</Badge> : <span className="text-sm">Produtor</span>}
                    </DetailRow>
                    <DetailRow label="Pagamento" value={PAYMENT_LABEL[selectedOrder.payment_method] || selectedOrder.payment_method} />
                    {installments && Number(installments) > 1 && <DetailRow label="Parcelas" value={`${installments}x`} />}
                    {gateway && <DetailRow label="Gateway" value={String(gateway).charAt(0).toUpperCase() + String(gateway).slice(1)} />}
                    <DetailRow label="Criado em" value={format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm")} />
                    {selectedOrder.updated_at && ["paid", "approved", "confirmed"].includes(selectedOrder.status) && (
                      <DetailRow label="Aprovado em" value={format(new Date(selectedOrder.updated_at), "dd/MM/yyyy HH:mm")} />
                    )}
                    {(utmSource || utmCampaign) && (
                      <>
                        <div className="pt-4 pb-1">
                          <span className="text-[10px] font-bold uppercase text-primary/60 tracking-widest">Rastreamento</span>
                        </div>
                        {utmSource && <DetailRow label="Source" value={utmSource} />}
                        {utmMedium && <DetailRow label="Medium" value={String(utmMedium).slice(0, 40)} />}
                        {utmCampaign && <DetailRow label="Campaign" value={String(utmCampaign).slice(0, 50)} />}
                        {utmContent && <DetailRow label="Content" value={String(utmContent).slice(0, 40)} />}
                        {utmTerm && <DetailRow label="Term" value={utmTerm} />}
                      </>
                    )}
                  </div>
                )}

                {detailTab === "products" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/50 bg-card/60 p-4 hover:border-primary/20 transition-colors">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Produto principal</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">{selectedOrder.products?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">R$ {Number(selectedOrder.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>

                    {bumpIds.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingBag className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Order Bumps ({bumpIds.length})</span>
                        </div>
                        <div className="space-y-2">
                          {bumpIds.map((bumpId, idx) => (
                            <div key={bumpId} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 hover:border-blue-500/30 transition-colors">
                              <p className="text-sm font-medium text-foreground">{productMap[bumpId] || `Produto ${bumpId.slice(0, 8)}...`}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Bump #{idx + 1}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isUpsell && (
                      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-semibold text-foreground">Venda de Upsell</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Gerada a partir de uma oferta pós-compra.</p>
                      </div>
                    )}

                    {bumpIds.length === 0 && !isUpsell && (
                      <p className="text-sm text-muted-foreground text-center py-6">Apenas o produto principal nessa venda.</p>
                    )}
                  </div>
                )}

                {detailTab === "customer" && (
                  <div className="space-y-0">
                    <DetailRow label="Nome" value={selectedOrder.customers?.name || "—"} />
                    <DetailRow label="E-mail" value={selectedOrder.customers?.email || "—"} />
                    <DetailRow label="Telefone" value={selectedOrder.customers?.phone || "—"} />
                    <DetailRow label="CPF" value={selectedOrder.customers?.cpf || "—"} />
                  </div>
                )}

                {detailTab === "values" && (
                  <div className="space-y-0">
                    <DetailRow label="Valor bruto" value={`R$ ${Number(selectedOrder.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <DetailRow label="Taxa plataforma" value={`R$ ${Number(selectedOrder.platform_fee_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <div className="flex items-start justify-between py-3 border-b border-primary/20">
                      <span className="text-xs text-primary uppercase tracking-wider font-bold">Valor líquido</span>
                      <span className="text-sm text-primary font-bold">
                        R$ {(Number(selectedOrder.amount) - Number(selectedOrder.platform_fee_amount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {meta.coupon_id && meta.coupon_id !== "<nil>" && (
                      <DetailRow label="Cupom" value="Aplicado ✅" />
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

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
