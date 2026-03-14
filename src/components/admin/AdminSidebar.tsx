import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  CreditCard,
  GraduationCap,
  ChevronDown,
  Crown,
  BarChart3,
  Wallet,
  Bell,
  MessageCircle,
  ShieldCheck,
  Webhook,
  Mail,
  Smartphone,
  Globe,
  Zap,
  User,
  Paintbrush,
  Activity,
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
  { title: "Checkouts", url: "/admin/settings", icon: Paintbrush },
  { title: "Área de Membros", url: "/admin/courses", icon: GraduationCap },
  { title: "Upsell", url: "/admin/upsell", icon: Zap },
  { title: "Clientes", url: "/admin/customers", icon: Users },
  { title: "Avaliações", url: "/admin/reviews", icon: MessageCircle },
  { title: "Meta Ads", url: "/admin/meta-ads", icon: BarChart3 },
  { title: "Relatórios", url: "/admin/abandoned", icon: Activity },
];

const configItems = [
  { title: "Métricas", url: "/admin/metrics", icon: BarChart3 },
  { title: "Domínios", url: "/admin/domains", icon: Globe },
  { title: "Gateways", url: "/admin/integrations", icon: CreditCard },
  { title: "Billing", url: "/admin/billing", icon: Wallet },
  { title: "Comunicações", url: "/admin/communications", icon: Mail },
  { title: "Webhook", url: "/admin/webhooks", icon: Webhook },
  { title: "WhatsApp", url: "/admin/whatsapp", icon: Smartphone },
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
    { title: "Fiscalizar", url: "/admin/health", icon: ShieldCheck },
  ];

  const renderItems = (items: { title: string; url: string; icon: any }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className="hover:bg-sidebar-accent/60 rounded-md transition-colors"
              activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-semibold"
            >
              <item.icon className="mr-3 h-4 w-4 shrink-0" />
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
        {/* Brand */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed ? (
              <div className="flex items-center gap-2.5 px-1 py-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shadow-lg">
                  P
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-bold text-sidebar-accent-foreground text-sm leading-tight">
                    PayCheckout
                  </span>
                  <span className="text-[10px] text-sidebar-foreground truncate max-w-[130px]">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Produtor"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-2">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold">
                  P
                </div>
              </div>
            )}
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* MENU */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 px-1">
                Menu
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(menuItems)}</SidebarGroupContent>
        </SidebarGroup>

        {/* GERAL */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 px-1">
                Geral
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {collapsed ? (
              renderItems(configItems)
            ) : (
              <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-sidebar-accent/60 transition-colors text-sm text-sidebar-foreground">
                  <Settings className="h-4 w-4 mr-1 shrink-0" />
                  <span>Configurações</span>
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${configOpen ? "rotate-180" : ""}`} />
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
                <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 flex items-center gap-1.5 px-1">
                  <Crown className="w-3 h-3 text-checkout-badge" /> Super Admin
                </span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(superAdminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && user && (
          <p className="text-[11px] text-sidebar-foreground/60 truncate px-3 mb-1">{user.email}</p>
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
