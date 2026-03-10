import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  approvedOrders: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0, approvedOrders: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [ordersRes, customersRes] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("customers").select("id"),
    ]);

    const orders = ordersRes.data || [];
    const approved = orders.filter((o) => o.status === "paid" || o.status === "approved");

    setStats({
      totalRevenue: approved.reduce((sum, o) => sum + Number(o.amount), 0),
      totalOrders: orders.length,
      totalCustomers: customersRes.data?.length || 0,
      approvedOrders: approved.length,
    });

    setRecentOrders(orders.slice(0, 10));

    // Build chart data (last 7 days)
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[key] = 0;
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (days[key] !== undefined) days[key] += Number(o.amount);
    });
    setChartData(Object.entries(days).map(([name, total]) => ({ name, total })));
  };

  const cards = [
    { title: "Faturamento", value: `R$ ${stats.totalRevenue.toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "text-primary" },
    { title: "Total de Pedidos", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-500" },
    { title: "Clientes", value: stats.totalCustomers, icon: Users, color: "text-purple-500" },
    { title: "Taxa de Aprovação", value: stats.totalOrders ? `${((stats.approvedOrders / stats.totalOrders) * 100).toFixed(0)}%` : "0%", icon: TrendingUp, color: "text-checkout-badge" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Faturamento (últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="total" fill="hsl(145, 65%, 42%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Últimos Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Método</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td className="py-2">R$ {Number(order.amount).toFixed(2).replace(".", ",")}</td>
                      <td className="py-2 capitalize">{order.payment_method}</td>
                      <td className="py-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                          order.status === "paid" || order.status === "approved"
                            ? "bg-primary/10 text-primary"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
