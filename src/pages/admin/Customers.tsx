import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("*, orders(id, amount, status, created_at)")
      .order("created_at", { ascending: false });
    setCustomers(data || []);
  };

  const filtered = customers.filter((c) => {
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.cpf?.includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Clientes</h1>
        <span className="text-sm text-muted-foreground">{customers.length} clientes</span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou CPF..."
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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">E-mail</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Telefone</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">CPF</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pedidos</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total gasto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const totalSpent = (c.orders || [])
                      .filter((o: any) => o.status === "paid" || o.status === "approved")
                      .reduce((sum: number, o: any) => sum + Number(o.amount), 0);
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4 font-medium">{c.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{c.email}</td>
                        <td className="py-3 px-4 text-muted-foreground">{c.phone || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{c.cpf || "—"}</td>
                        <td className="py-3 px-4">{c.orders?.length || 0}</td>
                        <td className="py-3 px-4 font-medium">R$ {totalSpent.toFixed(2).replace(".", ",")}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
