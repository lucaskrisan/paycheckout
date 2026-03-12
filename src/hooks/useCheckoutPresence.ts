import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

function safeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Robust real-time checkout visitor tracking.
 * Uses both Presence + Broadcast heartbeat fallback.
 */
export function useCheckoutPresence(mode: "track" | "watch", productId?: string) {
  const [onlineCount, setOnlineCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visitorIdRef = useRef(safeId());
  const presenceCountRef = useRef(0);
  const heartbeatMapRef = useRef<Map<string, number>>(new Map());

  const updateCount = useCallback(() => {
    const now = Date.now();
    const ttlMs = 25000;

    for (const [id, ts] of heartbeatMapRef.current.entries()) {
      if (now - ts > ttlMs) heartbeatMapRef.current.delete(id);
    }

    const heartbeatCount = heartbeatMapRef.current.size;
    setOnlineCount(Math.max(presenceCountRef.current, heartbeatCount));
  }, []);

  const cleanupChannel = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanupChannel();

    const channel = supabase.channel("checkout-presence", {
      config: {
        presence: { key: mode === "track" ? visitorIdRef.current : "_watcher" },
        broadcast: { self: false, ack: false },
      },
    });

    channelRef.current = channel;

    const syncPresence = () => {
      try {
        const state = channel.presenceState();
        const visitors = Object.keys(state).filter((k) => k !== "_watcher");
        presenceCountRef.current = visitors.length;
        updateCount();
      } catch {
        // ignore sync errors
      }
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "checkout_ping" }, ({ payload }) => {
        const id = (payload as { id?: string })?.id;
        if (!id || id === "_watcher") return;
        heartbeatMapRef.current.set(id, Date.now());
        updateCount();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
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
            } catch {
              // presence can fail silently on unstable connections; heartbeat fallback will still work
            }

            const sendPing = async () => {
              try {
                await channel.send({
                  type: "broadcast",
                  event: "checkout_ping",
                  payload: {
                    id: visitorIdRef.current,
                    product_id: productId || "unknown",
                    ts: Date.now(),
                  },
                });
              } catch {
                // noop
              }
            };

            await sendPing();
            heartbeatIntervalRef.current = setInterval(sendPing, 10000);
          } else {
            cleanupIntervalRef.current = setInterval(updateCount, 5000);
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          scheduleRetry();
        }
      });
  }, [cleanupChannel, mode, productId, updateCount]);

  const scheduleRetry = useCallback(() => {
    if (retryRef.current) return;
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      connect();
    }, 2500);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      cleanupChannel();
    };
  }, [connect, cleanupChannel]);

  return onlineCount;
}
