// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { subHours } from "date-fns";

interface PurchaseTick {
  id: string;
  customer_name: string | null;
  created_at: string;
  product_id: string;
  // Reservado para quando event_value chegar via backend (Claude Code).
  // Por enquanto, sempre indefinido — o componente esconde o campo de valor.
  event_value?: number | null;
  state?: string | null;
}

interface Props {
  userId?: string;
  filterProduct: string;
}

const flagFromCountry = "🇧🇷";

const TickerBar = ({ userId, filterProduct }: Props) => {
  const [ticks, setTicks] = useState<PurchaseTick[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  // Initial load — last 6h of Purchases
  useEffect(() => {
    const load = async () => {
      const since = subHours(new Date(), 6).toISOString();
      let q = supabase
        .from("pixel_events")
        .select("id, customer_name, created_at, product_id")
        .eq("event_name", "Purchase")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (userId) q = q.eq("user_id", userId);
      if (filterProduct !== "all") q = q.eq("product_id", filterProduct);
      const { data } = await q;
      const list = (data || []) as PurchaseTick[];
      list.forEach((t) => seenRef.current.add(t.id));
      setTicks(list);
    };
    load();
  }, [userId, filterProduct]);

  // Realtime — new Purchases prepend
  useEffect(() => {
    const channel = supabase
      .channel(`ticker-purchases-${filterProduct}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pixel_events", filter: "event_name=eq.Purchase" },
        (payload) => {
          const ne = payload.new as any;
          if (userId && ne.user_id !== userId) return;
          if (filterProduct !== "all" && ne.product_id !== filterProduct) return;
          if (ne.visitor_id?.startsWith("sim_")) return;
          if (seenRef.current.has(ne.id)) return;
          seenRef.current.add(ne.id);
          setTicks((prev) => [ne as PurchaseTick, ...prev].slice(0, 25));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterProduct, userId]);

  // Empty state
  if (ticks.length === 0) {
    return (
      <div
        className="relative w-full overflow-hidden border-b"
        style={{
          backgroundColor: "#050608",
          borderBottomColor: "rgba(212, 175, 55, 0.3)",
          height: 36,
        }}
      >
        <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/60 font-mono tracking-wide">
          <motion.span
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            ⟫ Aguardando próxima venda…
          </motion.span>
        </div>
      </div>
    );
  }

  // Duplicate the list so the marquee loop is seamless
  const marqueeItems = [...ticks, ...ticks];

  return (
    <div
      className="relative w-full overflow-hidden border-b group"
      style={{
        backgroundColor: "#050608",
        borderBottomColor: "rgba(212, 175, 55, 0.3)",
        height: 36,
      }}
    >
      {/* Edge fades */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
        style={{ background: "linear-gradient(90deg, #050608, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
        style={{ background: "linear-gradient(270deg, #050608, transparent)" }}
      />

      <div
        className="flex items-center h-full whitespace-nowrap"
        style={{
          animation: "ticker-marquee 60s linear infinite",
          animationPlayState: "running",
        }}
      >
        {marqueeItems.map((t, idx) => (
          <TickItem key={`${t.id}-${idx}`} tick={t} />
        ))}
      </div>

      <style>{`
        @keyframes ticker-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .group:hover [style*="ticker-marquee"] {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

const TickItem = ({ tick }: { tick: PurchaseTick }) => {
  const name = tick.customer_name?.split(" ")[0] || "Visitante";
  const hasValue = typeof tick.event_value === "number" && tick.event_value > 0;
  const formatted = hasValue
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      }).format(tick.event_value as number)
    : null;

  return (
    <div className="flex items-center gap-2 px-5 text-[11px] font-mono">
      <motion.span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: "#D4AF37", boxShadow: "0 0 8px #D4AF37" }}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      {formatted && (
        <span className="font-bold tabular-nums" style={{ color: "#D4AF37" }}>
          {formatted}
        </span>
      )}
      <span className="text-foreground/90 font-semibold">{name}</span>
      <span className="text-muted-foreground/70">{flagFromCountry}</span>
      <span className="text-muted-foreground/50 mx-2">⟫</span>
    </div>
  );
};

export default TickerBar;
