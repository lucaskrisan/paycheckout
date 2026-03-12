import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Robust real-time checkout visitor tracking via Supabase Realtime Presence.
 * 
 * - "track" mode: registers this visitor (checkout page, anonymous users)
 * - "watch" mode: counts live visitors (dashboard, authenticated admin)
 * 
 * Includes automatic reconnection and heartbeat to prevent silent failures.
 */
export function useCheckoutPresence(mode: "track" | "watch", productId?: string) {
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceKeyRef = useRef(crypto.randomUUID());

  const connect = useCallback(() => {
    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const presenceKey = mode === "track" ? presenceKeyRef.current : "_watcher";

    const channel = supabase.channel("checkout-presence", {
      config: { presence: { key: presenceKey } },
    });

    channelRef.current = channel;

    const syncCount = () => {
      try {
        const state = channel.presenceState();
        const visitors = Object.keys(state).filter((k) => k !== "_watcher");
        setOnlineCount(visitors.length);
      } catch {
        // Ignore sync errors
      }
    };

    channel
      .on("presence", { event: "sync" }, syncCount)
      .on("presence", { event: "join" }, syncCount)
      .on("presence", { event: "leave" }, syncCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Clear any pending retry
          if (retryRef.current) {
            clearTimeout(retryRef.current);
            retryRef.current = null;
          }

          if (mode === "track") {
            try {
              await channel.track({
                product_id: productId || "unknown",
                joined_at: new Date().toISOString(),
              });
            } catch (err) {
              console.warn("[presence] track failed, will retry:", err);
              scheduleRetry();
            }
          } else {
            // Watcher: also track presence so channel stays alive
            try {
              await channel.track({ role: "watcher" });
            } catch {
              // Non-critical for watcher
            }
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[presence] channel error/timeout, reconnecting...");
          scheduleRetry();
        }
      });
  }, [mode, productId]);

  const scheduleRetry = useCallback(() => {
    if (retryRef.current) return;
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      connect();
    }, 3000);
  }, [connect]);

  useEffect(() => {
    connect();

    // Heartbeat: re-sync every 30s to catch silent disconnects
    const heartbeat = setInterval(() => {
      if (channelRef.current) {
        try {
          const state = channelRef.current.presenceState();
          const visitors = Object.keys(state).filter((k) => k !== "_watcher");
          setOnlineCount(visitors.length);
        } catch {
          // Channel may be dead, reconnect
          connect();
        }
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (retryRef.current) clearTimeout(retryRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [connect]);

  return onlineCount;
}
