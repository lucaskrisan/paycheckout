import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminAccessRedirect from "./AdminAccessRedirect";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOneSignalInit } from "@/hooks/useOneSignalInit";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useVisitorToasts } from "@/hooks/useVisitorToasts";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut, refreshRoles } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [isVerified, setIsVerified] = useState(false);

  useOneSignalInit(user?.id ?? undefined);
  const { totalRevenue } = useAdminOrders(user?.id ?? undefined, user?.email ?? undefined);
  useVisitorToasts(user?.id ?? undefined, user?.email ?? undefined);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("verified")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsVerified(data?.verified === true));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return <AdminAccessRedirect refreshRoles={refreshRoles} userId={user.id} />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            totalRevenue={totalRevenue}
            isDark={isDark}
            toggleTheme={toggleTheme}
            user={user}
            signOut={signOut}
            isVerified={isVerified}
          />
          <main className="flex-1 p-6 bg-background overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
