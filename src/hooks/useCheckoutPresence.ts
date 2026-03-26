// @ts-nocheck
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
 * Robust real-time checkout visitor tracking with multi-tenant isolation.
 *
 * "track" mode  → checkout page sends presence + heartbeat with product_id
 * "watch" mode  → dashboard counts only visitors on the current user's products
 *
 * ownerProductIds: When in "watch" mode, pass the list of product IDs owned
 * by the logged-in producer. If empty/undefined (super admin), counts ALL.
 */
export function useCheckoutPresence(
  mode: "track" | "watch",
  productId?: string,
  ownerProductIds?: string[],
) {
  const [onlineCount, setOnlineCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visitorIdRef = useRef(safeId());
  const presenceCountRef = useRef(0);
  const heartbeatMapRef = useRef<Map<string, { ts: number; product_id: string }>>(new Map());
  const ownerIdsRef = useRef<Set<string> | null>(null);

  // Keep ownerIdsRef in sync
  useEffect(() => {
    ownerIdsRef.current = ownerProductIds && ownerProductIds.length > 0
      ? new Set(ownerProductIds)
      : null; // null = super admin → show all
  }, [ownerProductIds]);

  /** Filter presence state to only count visitors on the producer's products */
  const countPresenceForOwner = useCallback((state: Record<string, any[]>) => {
    const allowed = ownerIdsRef.current;
    let count = 0;
    for (const [key, presences] of Object.entries(state)) {
      if (key.startsWith("_watcher")) continue;
      if (!allowed) { count++; continue; } // super admin sees all
      const pid = presences?.[0]?.product_id;
      if (pid && allowed.has(pid)) count++;
    }
    return count;
  }, []);

  const updateCount = useCallback((channel?: RealtimeChannel) => {
    const now = Date.now();
    const ttlMs = 25000;
    const allowed = ownerIdsRef.current;

    // Clean stale heartbeats
    for (const [id, entry] of heartbeatMapRef.current.entries()) {
      if (now - entry.ts > ttlMs) heartbeatMapRef.current.delete(id);
    }

    // Count heartbeats filtered by owner
    let heartbeatCount = 0;
    for (const entry of heartbeatMapRef.current.values()) {
      if (!allowed || allowed.has(entry.product_id)) heartbeatCount++;
    }

    // Presence count (already filtered in syncPresence)
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

    // All trackers AND watchers MUST join the SAME channel to see each other.
    const channelName = "checkout-presence-global";
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: mode === "track" ? visitorIdRef.current : `_watcher_${visitorIdRef.current}` },
        broadcast: { self: false, ack: false },
      },
    });

    channelRef.current = channel;

    const syncPresence = () => {
      try {
        const state = channel.presenceState();
        presenceCountRef.current = countPresenceForOwner(state);
        updateCount(channel);
      } catch {
        // ignore sync errors
      }
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "checkout_ping" }, ({ payload }) => {
        const p = payload as { id?: string; product_id?: string };
        if (!p?.id || p.id.startsWith("_watcher")) return;
        heartbeatMapRef.current.set(p.id, {
          ts: Date.now(),
          product_id: p.product_id || "unknown",
        });
        updateCount(channel);
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
              // presence can fail silently; heartbeat fallback will still work
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
            cleanupIntervalRef.current = setInterval(() => updateCount(channel), 5000);
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          scheduleRetry();
        }
      });
  }, [cleanupChannel, mode, productId, updateCount, countPresenceForOwner]);

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
