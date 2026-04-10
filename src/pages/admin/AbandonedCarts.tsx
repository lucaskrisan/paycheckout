import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ShoppingBag, ChevronLeft, ChevronRight, Download, Copy, Check, MessageCircle, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const { user } = useAuth();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("7d");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [periodOpen, setPeriodOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [cartsRes, productsRes] = await Promise.all([
        supabase
          .from("abandoned_carts")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("products").select("id, name").eq("user_id", user?.id),
      ]);
      setCarts((cartsRes.data as any) || []);
      setProducts(productsRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const periodLabel = useMemo(() => {
    if (filterPeriod === "today") return "Hoje";
    if (filterPeriod === "7d") return "Últimos 7 dias";
    if (filterPeriod === "30d") return "Últimos 30 dias";
    if (filterPeriod === "all") return "Tempo todo";
    if (filterPeriod === "custom" && customDate) return format(customDate, "dd/MM/yyyy");
    return "Últimos 7 dias";
  }, [filterPeriod, customDate]);

  const filtered = useMemo(() => {
    let result = carts;

    // Period
    if (filterPeriod === "today") {
      const today = startOfDay(new Date());
      result = result.filter(c => new Date(c.created_at) >= today);
    } else if (filterPeriod === "custom" && customDate) {
      const dayStart = startOfDay(customDate);
      const dayEnd = addDays(dayStart, 1);
      result = result.filter(c => {
        const d = new Date(c.created_at);
        return d >= dayStart && d < dayEnd;
      });
    } else if (filterPeriod !== "all") {
      const days = filterPeriod === "7d" ? 7 : 30;
      const from = new Date(Date.now() - days * 86400000);
      result = result.filter(c => new Date(c.created_at) >= from);
    }

    if (filterProduct !== "all") {
      result = result.filter(c => c.product_id === filterProduct);
    }

    if (filterStatus === "recovered") {
      result = result.filter(c => c.recovered);
    } else if (filterStatus === "abandoned") {
      result = result.filter(c => !c.recovered);
    }

    return result;
  }, [carts, filterProduct, filterStatus, filterPeriod, customDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [filterProduct, filterStatus, filterPeriod, customDate]);

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

  const selectPreset = (preset: string) => {
    setFilterPeriod(preset);
    setCustomDate(undefined);
    if (preset !== "custom") setPeriodOpen(false);
  };

  const selectDate = (date: Date | undefined) => {
    if (date) {
      setCustomDate(date);
      setFilterPeriod("custom");
      setPeriodOpen(false);
    }
  };


  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Vendas abandonadas</h1>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      <Card className="overflow-hidden border border-border shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-4 md:px-5">
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-full bg-background sm:w-[270px]"><SelectValue placeholder="Todos os produtos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full bg-background sm:w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="abandoned">Abandonados</SelectItem>
                  <SelectItem value="recovered">Recuperados</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-background font-normal sm:w-[200px]">
                    {periodLabel}
                    <ChevronRight className="w-4 h-4 rotate-90 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex flex-col">
                    <div className="border-b border-border">
                      {[
                        { value: "today", label: "Hoje" },
                        { value: "7d", label: "Últimos 7 dias" },
                        { value: "30d", label: "Últimos 30 dias" },
                        { value: "all", label: "Tempo todo" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => selectPreset(opt.value)}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${filterPeriod === opt.value ? "font-medium text-primary" : "text-foreground"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={selectDate}
                      locale={ptBR}
                      disabled={(date) => date > new Date()}
                      className="p-3"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loading ? (
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
                        <TableCell className="max-w-[280px] font-medium">
                          <p className="truncate">{cart.products?.name || "—"}</p>
                        </TableCell>
                        <TableCell className="min-w-[240px]">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{cart.customer_name || "—"}</p>
                            {cart.customer_email && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{cart.customer_email}</span>
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cart.customer_phone ? (
                            <button
                              onClick={() => openWhatsApp(cart.customer_phone, cart)}
                              className="flex items-center gap-2 text-sm text-primary transition-opacity hover:opacity-80"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4 shrink-0" />
                              <span className="truncate">{cart.customer_phone}</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => copyUrl(cart)}
                            className="flex max-w-[360px] items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-mono transition-colors hover:bg-muted/50"
                            title="Copiar link"
                          >
                            {copiedId === cart.id ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Exibindo {page} de {totalPages} página{totalPages > 1 ? "s" : ""}
                </p>
                {totalPages > 1 && (
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
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AbandonedCarts;
