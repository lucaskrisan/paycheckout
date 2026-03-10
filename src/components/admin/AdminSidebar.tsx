import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  CreditCard,
  Tag,
  ShoppingBag,
  Link2,
  Megaphone,
  GraduationCap,
  BarChart3,
  ChevronDown,
  Crown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Vendas", url: "/admin/orders", icon: ShoppingCart },
  { title: "Clientes", url: "/admin/customers", icon: Users },
];

const productItems = [
  { title: "Meus Produtos", url: "/admin/products", icon: Package },
  { title: "Cursos", url: "/admin/courses", icon: GraduationCap },
];

const marketingItems = [
  { title: "Cupons", url: "/admin/coupons", icon: Tag },
  { title: "Carrinho Abandonado", url: "/admin/abandoned", icon: ShoppingBag },
];

const configItems = [
  { title: "Gateways", url: "/admin/gateways", icon: CreditCard },
  { title: "Integrações", url: "/admin/integrations", icon: Link2 },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user, isSuperAdmin } = useAuth();

  const superAdminItems = [
    { title: "Painel Plataforma", url: "/admin/platform", icon: Crown },
  ];

  const isInGroup = (items: { url: string }[]) =>
    items.some((i) => location.pathname === i.url || location.pathname.startsWith(i.url + "/"));

  const renderItems = (items: { title: string; url: string; icon: any }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className="hover:bg-muted/50"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="font-display font-bold text-sm">Admin Panel</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        {/* Produtos */}
        <SidebarGroup>
          {!collapsed ? (
            <Collapsible defaultOpen={isInGroup(productItems)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <span>Produtos</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>{renderItems(productItems)}</SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarGroupContent>{renderItems(productItems)}</SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Marketing */}
        <SidebarGroup>
          {!collapsed ? (
            <Collapsible defaultOpen={isInGroup(marketingItems)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Marketing</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>{renderItems(marketingItems)}</SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarGroupContent>{renderItems(marketingItems)}</SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Configurações */}
        <SidebarGroup>
          {!collapsed ? (
            <Collapsible defaultOpen={isInGroup(configItems)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <span>Configurações</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>{renderItems(configItems)}</SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarGroupContent>{renderItems(configItems)}</SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate px-2 mb-1">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
