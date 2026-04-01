import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/notificationSounds";

const PAID_STATUSES = new Set(["paid", "approved"]);
const SUPER_ADMIN_EMAIL = "trafegocomkrisan@gmail.com";
const SUPER_ADMIN_EMAILS = new Set([SUPER_ADMIN_EMAIL]);

export function useAdminOrders(userId: string | undefined, userEmail: string | undefined) {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const notificationSoundRef = useRef("kaching");
  const playApprovedSaleSoundRef = useRef(true);

  // Load initial revenue + notification settings
  useEffect(() => {
    if (!userId) return;

    const loadRevenueAndSound = async () => {
      const [{ data: orders }, { data: settings }] = await Promise.all([
        supabase.from("orders").select("amount, status"),
        supabase
          .from("notification_settings")
          .select("notification_sound, send_approved")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const revenue = (orders || [])
        .filter((o) => PAID_STATUSES.has(String(o.status).toLowerCase()))
        .reduce((s, o) => s + Number(o.amount), 0);

      setTotalRevenue(revenue);
      notificationSoundRef.current = settings?.notification_sound || "kaching";
      playApprovedSaleSoundRef.current = settings?.send_approved ?? true;
    };

    loadRevenueAndSound();
  }, [userId]);

  // Realtime order updates
  useEffect(() => {
    if (!userId) return;
    if (SUPER_ADMIN_EMAILS.has(userEmail ?? "")) return;

    const channel = supabase
      .channel(`admin-orders-sound-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: undefined },
        (payload: any) => {
          const newStatus = String(payload?.new?.status || "").toLowerCase();
          const oldStatus = String(payload?.old?.status || "").toLowerCase();

          const becamePaid =
            (payload?.eventType === "INSERT" && PAID_STATUSES.has(newStatus)) ||
            (payload?.eventType === "UPDATE" && PAID_STATUSES.has(newStatus) && !PAID_STATUSES.has(oldStatus));

          if (becamePaid && playApprovedSaleSoundRef.current) {
            playNotificationSound(notificationSoundRef.current);
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
  }, [userId, userEmail]);

  return { totalRevenue };
}
