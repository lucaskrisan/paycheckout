import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, ShoppingCart, TrendingUp, Search, ShieldCheck, ShieldX, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Producer {
  id: string;
  full_name: string | null;
  created_at: string;
  product_count: number;
  order_count: number;
  total_revenue: number;
}

interface UserWithRoles {
  id: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

const SuperAdminDashboard = () => {
  const { isSuperAdmin, user } = useAuth();
  const [producers, setProducers] = useState<Producer[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
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
      loadAllUsers();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "super_admin"]);
    const adminUserIds = [...new Set((adminRoles || []).map((r: any) => r.user_id))];

    const { data: profiles } = adminUserIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", adminUserIds).order("created_at", { ascending: false })
      : { data: [] };

    const { data: orders } = await supabase.from("orders").select("user_id, amount, status");
    const { data: products } = await supabase.from("products").select("user_id");
    const { data: settings } = await supabase.from("platform_settings" as any).select("*").limit(1).single();
    const feePercent = (settings as any)?.platform_fee_percent || 4.99;

    const totalRevenue = (orders || [])
      .filter((o: any) => o.status === "paid" || o.status === "confirmed")
      .reduce((acc: number, o: any) => acc + Number(o.amount), 0);

    const producerMap = new Map<string, Producer>();
    (profiles || []).forEach((p: any) => {
      producerMap.set(p.id, { id: p.id, full_name: p.full_name, created_at: p.created_at, product_count: 0, order_count: 0, total_revenue: 0 });
    });

    (products || []).forEach((p: any) => {
      if (p.user_id && producerMap.has(p.user_id)) producerMap.get(p.user_id)!.product_count++;
    });

    (orders || []).forEach((o: any) => {
      if (o.user_id && producerMap.has(o.user_id)) {
        const prod = producerMap.get(o.user_id)!;
        prod.order_count++;
        if (o.status === "paid" || o.status === "confirmed") prod.total_revenue += Number(o.amount);
      }
    });

    setProducers(Array.from(producerMap.values()));
    setPlatformStats({ totalProducers: producerMap.size, totalOrders: (orders || []).length, totalRevenue, platformFees: totalRevenue * (feePercent / 100), feePercent });
    setLoading(false);
  };

  const loadAllUsers = async () => {
    setUsersLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map<string, string[]>();
    (roles || []).forEach((r: any) => {
      if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
      roleMap.get(r.user_id)!.push(r.role);
    });

    const users: UserWithRoles[] = (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      created_at: p.created_at,
      roles: roleMap.get(p.id) || [],
    }));

    setAllUsers(users);
    setUsersLoading(false);
  };

  const promoteToAdmin = async (userId: string) => {
    if (userId === user?.id) return;
    setActionLoading(userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    if (error) {
      toast.error("Erro ao promover: " + error.message);
    } else {
      toast.success("Usuário promovido a Produtor!");
      await Promise.all([loadAllUsers(), loadData()]);
    }
    setActionLoading(null);
  };

  const demoteFromAdmin = async (userId: string) => {
    if (userId === user?.id) return;
    setActionLoading(userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
    if (error) {
      toast.error("Erro ao rebaixar: " + error.message);
    } else {
      toast.success("Acesso de produtor removido!");
      await Promise.all([loadAllUsers(), loadData()]);
    }
    setActionLoading(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Acesso restrito ao Super Admin.</p>
      </div>
    );
  }

  const filteredProducers = producers.filter(
    (p) => (p.full_name || "").toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
  );

  const filteredUsers = allUsers.filter(
    (u) => (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) || u.id.includes(userSearch)
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

      <Tabs defaultValue="producers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="producers">Produtores</TabsTrigger>
          <TabsTrigger value="users">Gerenciar Usuários</TabsTrigger>
        </TabsList>

        {/* Producers Tab */}
        <TabsContent value="producers">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg">Produtores Ativos</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar produtor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
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
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducers.map((p) => {
                      const isSelf = p.id === user?.id;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.full_name || "Sem nome"}
                            {isSelf && <Badge variant="outline" className="ml-2 text-xs">Você</Badge>}
                          </TableCell>
                          <TableCell className="text-center">{p.product_count}</TableCell>
                          <TableCell className="text-center">{p.order_count}</TableCell>
                          <TableCell className="text-right font-semibold">R$ {p.total_revenue.toFixed(2).replace(".", ",")}</TableCell>
                          <TableCell className="text-right text-primary font-semibold">R$ {(p.total_revenue * (platformStats.feePercent / 100)).toFixed(2).replace(".", ",")}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-center">
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                disabled={actionLoading === p.id}
                                onClick={() => demoteFromAdmin(p.id)}
                              >
                                {actionLoading === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldX className="w-3 h-3" />}
                                Remover
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredProducers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produtor encontrado.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg">Todos os Usuários</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar usuário..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9 h-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p className="text-sm text-muted-foreground py-4">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead className="text-center">Cadastro</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === user?.id;
                      const isAdmin = u.roles.includes("admin");
                      const isSA = u.roles.includes("super_admin");
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.full_name || "Sem nome"}
                            {isSelf && <Badge variant="outline" className="ml-2 text-xs">Você</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {u.roles.map((r) => (
                                <Badge
                                  key={r}
                                  variant={r === "super_admin" ? "default" : r === "admin" ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {r === "super_admin" ? "Super Admin" : r === "admin" ? "Produtor" : "Comprador"}
                                </Badge>
                              ))}
                              {u.roles.length === 0 && <Badge variant="outline" className="text-xs">Sem role</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-center">
                            {isSelf || isSA ? null : isAdmin ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                disabled={actionLoading === u.id}
                                onClick={() => demoteFromAdmin(u.id)}
                              >
                                {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldX className="w-3 h-3" />}
                                Rebaixar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1"
                                disabled={actionLoading === u.id}
                                onClick={() => promoteToAdmin(u.id)}
                              >
                                {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                Promover
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
