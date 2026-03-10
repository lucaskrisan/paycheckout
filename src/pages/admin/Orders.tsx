import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, customers(name, email)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const filtered = orders.filter((o) => {
    const s = search.toLowerCase();
    return (
      o.id.includes(s) ||
      o.customers?.name?.toLowerCase().includes(s) ||
      o.customers?.email?.toLowerCase().includes(s) ||
      o.status.includes(s)
    );
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "approved":
        return "bg-primary/10 text-primary border-primary/20";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "refunded":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-destructive/10 text-destructive border-destructive/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Pedidos</h1>
        <span className="text-sm text-muted-foreground">{orders.length} pedidos</span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ID, cliente ou status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Método</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{order.customers?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{order.customers?.email || ""}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">R$ {Number(order.amount).toFixed(2).replace(".", ",")}</td>
                      <td className="py-3 px-4 capitalize">{order.payment_method}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={statusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
