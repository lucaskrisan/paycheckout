// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, Clock, Search, Eye, Loader2, Package,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending_review: { label: "Em revisão", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  approved: { label: "Aprovado", icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Reprovado", icon: XCircle, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const ProductReview = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadProducts(); }, [statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("id, name, price, active, created_at, user_id, moderation_status, rejection_reason, image_url")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("moderation_status" as any, statusFilter);
    }

    const { data } = await query;

    // Fetch producer names
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
      setProducts(data.map((p: any) => ({ ...p, producer_name: profileMap.get(p.user_id) || "—" })));
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  const handleApprove = async (product: any) => {
    setProcessing(product.id);
    const { error } = await supabase
      .from("products")
      .update({ moderation_status: "approved", rejection_reason: null } as any)
      .eq("id", product.id);

    if (error) {
      toast.error("Erro ao aprovar produto");
    } else {
      toast.success(`"${product.name}" aprovado!`);
      // Send notification email
      await sendModerationEmail(product, "approved");
      loadProducts();
    }
    setProcessing(null);
  };

  const openRejectDialog = (product: any) => {
    setSelectedProduct(product);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      toast.error("Informe o motivo da reprovação");
      return;
    }
    setProcessing(selectedProduct.id);
    const { error } = await supabase
      .from("products")
      .update({ moderation_status: "rejected", rejection_reason: rejectionReason.trim() } as any)
      .eq("id", selectedProduct.id);

    if (error) {
      toast.error("Erro ao reprovar produto");
    } else {
      toast.success(`"${selectedProduct.name}" reprovado`);
      await sendModerationEmail(selectedProduct, "rejected", rejectionReason.trim());
      setRejectDialogOpen(false);
      loadProducts();
    }
    setProcessing(null);
  };

  const sendModerationEmail = async (product: any, status: string, reason?: string) => {
    try {
      // Get producer email from profiles or auth
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", product.user_id)
        .single();

      // We need to use the edge function to send email via Resend
      const { data: session } = await supabase.auth.getSession();
      await supabase.functions.invoke("product-moderation-email", {
        body: {
          product_id: product.id,
          product_name: product.name,
          producer_user_id: product.user_id,
          status,
          reason,
        },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
    } catch (err) {
      console.error("Error sending moderation email:", err);
      // Don't block the approval/rejection flow
    }
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.producer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Revisão de Produtos</h1>
        <p className="text-sm text-muted-foreground mt-1">Aprovar ou reprovar produtos antes de irem ao ar</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto ou produtor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending_review">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Reprovados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Produto</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Produtor</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Preço</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Criado em</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const cfg = STATUS_CONFIG[p.moderation_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending_review;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm text-foreground">{p.name}</p>
                            {p.rejection_reason && p.moderation_status === "rejected" && (
                              <p className="text-[11px] text-red-400 mt-0.5 max-w-[200px] truncate" title={p.rejection_reason}>
                                Motivo: {p.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.producer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(p.price)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] gap-1 border ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-end">
                          {p.moderation_status === "pending_review" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                                onClick={() => handleApprove(p)}
                                disabled={processing === p.id}
                              >
                                {processing === p.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                onClick={() => openRejectDialog(p)}
                                disabled={processing === p.id}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reprovar
                              </Button>
                            </>
                          )}
                          {p.moderation_status === "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                              onClick={() => handleApprove(p)}
                              disabled={processing === p.id}
                            >
                              {processing === p.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                              Aprovar
                            </Button>
                          )}
                          {p.moderation_status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => openRejectDialog(p)}
                              disabled={processing === p.id}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reprovar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Exibindo {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Reprovar Produto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Você está reprovando o produto <strong className="text-foreground">"{selectedProduct?.name}"</strong>.
              Informe o motivo para o produtor.
            </p>
            <Textarea
              placeholder="Ex: O produto não atende às diretrizes da plataforma. Por favor, revise a descrição e imagem."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px] resize-y"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing === selectedProduct?.id}
            >
              {processing === selectedProduct?.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductReview;
