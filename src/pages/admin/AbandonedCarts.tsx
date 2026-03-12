import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
}

const AbandonedCarts = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarts = async () => {
      const { data } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setCarts((data as any) || []);
      setLoading(false);
    };
    fetchCarts();
  }, []);

  const stats = {
    total: carts.length,
    recovered: carts.filter(c => c.recovered).length,
    withEmail: carts.filter(c => c.customer_email).length,
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Carrinho Abandonado</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Abandonos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.recovered}</p>
            <p className="text-xs text-muted-foreground">Recuperados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.withEmail}</p>
            <p className="text-xs text-muted-foreground">Com e-mail</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando...</div>
          ) : carts.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum carrinho abandonado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.customer_name || "—"}</TableCell>
                    <TableCell className="text-sm">{c.customer_email || "—"}</TableCell>
                    <TableCell className="text-sm">{c.customer_phone || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.utm_source || c.utm_campaign
                        ? `${c.utm_source || ""}${c.utm_campaign ? ` / ${c.utm_campaign}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.recovered ? "default" : "secondary"}>
                        {c.recovered ? "Recuperado" : "Abandonado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AbandonedCarts;
