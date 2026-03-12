import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const SUPER_ADMIN_EMAIL = "trafegocomkrisan@gmail.com";

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
  const { user, isAdmin, loading } = useAuth();

  useOneSignalInit(user?.email ?? undefined);

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
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <span className="font-display font-bold text-foreground">Painel Admin</span>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
