import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  CreditCard,
  ShoppingBag,
  Link2,
  Megaphone,
  GraduationCap,
  ChevronDown,
  Crown,
  BarChart3,
  Wallet,
  Bell,
  Crosshair,
  MessageCircle,
  ShieldCheck,
  Webhook,
  Mail,
  Smartphone,
  Globe,
  Zap,
  User,
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
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Pagamentos", url: "/admin/orders", icon: ShoppingCart },
  { title: "Produtos", url: "/admin/products", icon: Package },
  { title: "Checkouts", url: "/admin/settings", icon: Settings },
  { title: "Área de Membros", url: "/admin/courses", icon: GraduationCap },
  { title: "Upsell", url: "/admin/products", icon: Zap },
  { title: "Clientes", url: "/admin/customers", icon: Users },
  { title: "Avaliações", url: "/admin/reviews", icon: MessageCircle },
  { title: "Meta Ads", url: "/admin/meta-ads", icon: Megaphone },
  { title: "Relatórios", url: "/admin/abandoned", icon: BarChart3 },
];

const configItems = [
  { title: "Métricas", url: "/admin/metrics", icon: BarChart3 },
  { title: "Domínios", url: "/admin/domains", icon: Globe },
  { title: "Gateways", url: "/admin/integrations", icon: CreditCard },
  { title: "Billing", url: "/admin/billing", icon: Wallet },
  { title: "Comunicações", url: "/admin/communications", icon: Mail },
  { title: "Webhook", url: "/admin/webhooks", icon: Webhook },
  { title: "WhatsApp", url: "/admin/whatsapp", icon: MessageCircle },
  { title: "Notificações", url: "/admin/notifications", icon: Bell },
  { title: "App Mobile", url: "/admin/pwa", icon: Smartphone },
  { title: "Minha conta", url: "/admin/my-account", icon: User },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user, isSuperAdmin } = useAuth();
  const [configOpen, setConfigOpen] = useState(() =>
    configItems.some((item) => location.pathname === item.url)
  );

  const superAdminItems = [
    { title: "Painel Plataforma", url: "/admin/platform", icon: Crown },
    { title: "Billing Global", url: "/admin/billing", icon: CreditCard },
    { title: "Fiscalizar", url: "/admin/health", icon: ShieldCheck },
  ];

  const renderItems = (items: { title: string; url: string; icon: any }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title + item.url}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className="hover:bg-sidebar-accent/60 rounded-md transition-colors"
              activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-semibold"
            >
              <item.icon className="mr-3 h-4 w-4" />
              {!collapsed && <span className="text-sm">{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* User / Brand */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <div className="flex items-center gap-2 px-1 py-2">
                <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() || "P"}
                </div>
                <span className="font-semibold text-sidebar-accent-foreground text-sm truncate max-w-[140px]">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Produtor"}
                </span>
                <ChevronDown className="w-3 h-3 text-sidebar-foreground ml-auto" />
              </div>
            )}
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* MENU */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Menu</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(menuItems)}</SidebarGroupContent>
        </SidebarGroup>

        {/* GERAL - Configurações (collapsible) */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Geral</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {collapsed ? (
              renderItems(configItems)
            ) : (
              <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-sidebar-accent/60 transition-colors text-sm text-sidebar-foreground">
                  <Settings className="h-4 w-4 mr-1" />
                  <span>Configurações</span>
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${configOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-2 mt-1">
                  {renderItems(configItems)}
                </CollapsibleContent>
              </Collapsible>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Super Admin */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!collapsed && (
                <span className="text-xs font-semibold text-checkout-badge uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" /> Super Admin
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(superAdminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground truncate px-3 mb-1">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent/60"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
