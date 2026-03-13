import { useEffect, useState, useRef } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User, Eye, Bell, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HeaderGamification from "./HeaderGamification";
import { playNotificationSound } from "@/lib/notificationSounds";
import { toast } from "sonner";
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SUPER_ADMIN_EMAIL = "trafegocomkrisan@gmail.com";
const PAID_STATUSES = new Set(["paid", "approved"]);

function useOneSignalInit(email: string | undefined) {
  useEffect(() => {
    if (!email || email !== SUPER_ADMIN_EMAIL) return;
    if ((window as any).__oneSignalLoaded) return;
    (window as any).__oneSignalLoaded = true;

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.init({
          appId: "5ba5218a-5026-4270-92ce-d2e0ab5509e0",
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "/pwa-sw.js",
          serviceWorkerUpdaterPath: "/pwa-sw.js",
          notifyButton: { enable: true },
          allowLocalhostAsSecureOrigin: true,
          promptOptions: {
            slidedown: {
              prompts: [{
                type: "push",
                autoPrompt: true,
                text: {
                  actionMessage: "Deseja receber notificações de vendas em tempo real?",
                  acceptButton: "Permitir",
                  cancelButton: "Agora não",
                },
                delay: { pageViews: 1, timeDelay: 3 },
              }],
            },
          },
        });
      });
    };
    document.head.appendChild(script);
  }, [email]);
}

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [notificationSound, setNotificationSound] = useState("kaching");
  const [playApprovedSaleSound, setPlayApprovedSaleSound] = useState(true);

  useOneSignalInit(user?.email ?? undefined);

  useEffect(() => {
    if (!user?.id) return;

    const loadRevenueAndSound = async () => {
      const [{ data: orders }, { data: settings }] = await Promise.all([
        supabase
          .from("orders")
          .select("amount, status"),
        supabase
          .from("notification_settings")
          .select("notification_sound, send_approved")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const revenue = (orders || [])
        .filter((o) => PAID_STATUSES.has(String(o.status).toLowerCase()))
        .reduce((s, o) => s + Number(o.amount), 0);

      setTotalRevenue(revenue);
      setNotificationSound(settings?.notification_sound || "kaching");
      setPlayApprovedSaleSound(settings?.send_approved ?? true);
    };

    loadRevenueAndSound();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`admin-orders-sound-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: undefined,
        },
        (payload: any) => {
          const newStatus = String(payload?.new?.status || "").toLowerCase();
          const oldStatus = String(payload?.old?.status || "").toLowerCase();

          const becamePaid =
            (payload?.eventType === "INSERT" && PAID_STATUSES.has(newStatus)) ||
            (payload?.eventType === "UPDATE" && PAID_STATUSES.has(newStatus) && !PAID_STATUSES.has(oldStatus));

          if (becamePaid && playApprovedSaleSound) {
            playNotificationSound(notificationSound);
          }

          if (payload?.eventType === "INSERT" || payload?.eventType === "UPDATE") {
            supabase
              .from("orders")
              .select("amount, status")
              .then(({ data }) => {
                const revenue = (data || [])
                  .filter((o) => PAID_STATUSES.has(String(o.status).toLowerCase()))
                  .reduce((s, o) => s + Number(o.amount), 0);
                setTotalRevenue(revenue);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, notificationSound, playApprovedSaleSound]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="font-display text-xl font-bold text-foreground">Acesso negado</p>
          <p className="text-sm text-muted-foreground">Você não tem permissão de administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Green top bar with gamification — Kiwify style */}
          <div className="h-10 bg-primary flex items-center justify-between px-4">
            <HeaderGamification totalRevenue={totalRevenue} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground text-sm font-medium transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden md:inline max-w-[180px] truncate">{user?.email}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/notifications")}>
                  <Bell className="w-4 h-4 mr-2" />
                  Notificações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // Open member area preview — find first course access token
                  window.open("/membros", "_blank");
                }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Mudar para painel do aluno
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/login"); }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <header className="h-14 flex items-center border-b border-border px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <span className="font-display font-bold text-foreground">Painel Admin</span>
          </header>
          <main className="flex-1 p-6 bg-background overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
