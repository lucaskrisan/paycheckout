import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/notificationSounds";

const PAID_STATUSES = new Set(["paid", "approved"]);
const SUPER_ADMIN_EMAILS = new Set(["trafegocomkrisan@gmail.com"]);

export function useAdminOrders(userId: string | undefined, userEmail: string | undefined) {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const notificationSoundRef = useRef("kaching");
  const playApprovedSaleSoundRef = useRef(true);

  const fetchRevenue = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc("get_revenue_summary", { p_user_id: userId });
    if (!error && data && data.length > 0) {
      setTotalRevenue(Number(data[0].total_revenue));
    }
  }, [userId]);

  // Load initial revenue + notification settings
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const [, settingsRes] = await Promise.all([
        fetchRevenue(),
        supabase
          .from("notification_settings")
          .select("notification_sound, send_approved")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      notificationSoundRef.current = settingsRes.data?.notification_sound || "kaching";
      playApprovedSaleSoundRef.current = settingsRes.data?.send_approved ?? true;
    };

    load();
  }, [userId, fetchRevenue]);

  // Realtime order updates — only play sound + refresh aggregated total
  useEffect(() => {
    if (!userId) return;
    if (SUPER_ADMIN_EMAILS.has(userEmail ?? "")) return;

    const channel = supabase
      .channel(`admin-orders-sound-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          const newStatus = String(payload?.new?.status || "").toLowerCase();
          const oldStatus = String(payload?.old?.status || "").toLowerCase();

          const becamePaid =
            (payload?.eventType === "INSERT" && PAID_STATUSES.has(newStatus)) ||
            (payload?.eventType === "UPDATE" && PAID_STATUSES.has(newStatus) && !PAID_STATUSES.has(oldStatus));

          if (becamePaid && playApprovedSaleSoundRef.current) {
            playNotificationSound(notificationSoundRef.current);
          }

          // Refresh aggregated revenue via server-side RPC instead of fetching all rows
          if (payload?.eventType === "INSERT" || payload?.eventType === "UPDATE") {
            fetchRevenue();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userEmail, fetchRevenue]);

  return { totalRevenue };
}
