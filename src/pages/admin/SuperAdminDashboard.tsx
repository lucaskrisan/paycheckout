import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, ShoppingCart, TrendingUp, Search, Ban, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface Producer {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  product_count: number;
  order_count: number;
  total_revenue: number;
}

const SuperAdminDashboard = () => {
  const { isSuperAdmin } = useAuth();
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformStats, setPlatformStats] = useState({
    totalProducers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    platformFees: 0,
    feePercent: 4.99,
  });

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    // Load profiles (producers)
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

    // Load all orders for stats
    const { data: orders } = await supabase.from("orders").select("user_id, amount, status");

    // Load all products count per user
    const { data: products } = await supabase.from("products").select("user_id");

    // Load platform settings
    const { data: settings } = await supabase.from("platform_settings" as any).select("*").limit(1).single();
    const feePercent = (settings as any)?.platform_fee_percent || 4.99;

    const totalRevenue = (orders || [])
      .filter((o: any) => o.status === "paid" || o.status === "confirmed")
      .reduce((acc: number, o: any) => acc + Number(o.amount), 0);

    const producerMap = new Map<string, Producer>();
    (profiles || []).forEach((p: any) => {
      producerMap.set(p.id, {
        id: p.id,
        email: "",
        full_name: p.full_name,
        created_at: p.created_at,
        product_count: 0,
        order_count: 0,
        total_revenue: 0,
      });
    });

    (products || []).forEach((p: any) => {
      if (p.user_id && producerMap.has(p.user_id)) {
        producerMap.get(p.user_id)!.product_count++;
      }
    });

    (orders || []).forEach((o: any) => {
      if (o.user_id && producerMap.has(o.user_id)) {
        const prod = producerMap.get(o.user_id)!;
        prod.order_count++;
        if (o.status === "paid" || o.status === "confirmed") {
          prod.total_revenue += Number(o.amount);
        }
      }
    });

    setProducers(Array.from(producerMap.values()));
    setPlatformStats({
      totalProducers: producerMap.size,
      totalOrders: (orders || []).length,
      totalRevenue,
      platformFees: totalRevenue * (feePercent / 100),
      feePercent,
    });
    setLoading(false);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Acesso restrito ao Super Admin.</p>
      </div>
    );
  }

  const filteredProducers = producers.filter(
    (p) =>
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      p.id.includes(search)
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Painel da Plataforma</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Produtores</p>
                <p className="text-2xl font-display font-bold text-foreground">{platformStats.totalProducers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><ShoppingCart className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pedidos Totais</p>
                <p className="text-2xl font-display font-bold text-foreground">{platformStats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  R$ {platformStats.totalRevenue.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-checkout-badge/10"><TrendingUp className="w-5 h-5 text-checkout-badge" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Comissão ({platformStats.feePercent}%)</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  R$ {platformStats.platformFees.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Producers list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">Produtores</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Produtos</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Sua Comissão</TableHead>
                  <TableHead className="text-center">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell>
                    <TableCell className="text-center">{p.product_count}</TableCell>
                    <TableCell className="text-center">{p.order_count}</TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {p.total_revenue.toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      R$ {(p.total_revenue * (platformStats.feePercent / 100)).toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum produtor encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
