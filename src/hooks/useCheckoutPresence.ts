import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to track real-time checkout visitors using Supabase Realtime Presence.
 * 
 * On the checkout page: call with `mode: "track"` to register presence.
 * On the dashboard: call with `mode: "watch"` to get the live count.
 */
export function useCheckoutPresence(mode: "track" | "watch", productId?: string) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channelName = "checkout-presence";
    const channel = supabase.channel(channelName, {
      config: { presence: { key: mode === "track" ? crypto.randomUUID() : "_watcher" } },
    });

    const syncCount = () => {
      const state = channel.presenceState();
      // Count all presence keys (each is a visitor)
      const keys = Object.keys(state).filter((k) => k !== "_watcher");
      setOnlineCount(keys.length);
    };

    channel
      .on("presence", { event: "sync" }, syncCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && mode === "track") {
          await channel.track({
            product_id: productId || "unknown",
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, productId]);

  return onlineCount;
}
