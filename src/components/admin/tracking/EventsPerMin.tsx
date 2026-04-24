import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface Props {
  /** Recent event timestamps (ms since epoch) — used to compute events/min over the last 5 min. */
  timestamps: number[];
}

/**
 * Live "events per minute" counter — counts events from the last 300s and divides by 5.
 * Recomputes every 5s so the rate stays fresh even without new events.
 * Animates digits with framer-motion useSpring; green if above rolling baseline, red if below.
 */
const EventsPerMin = ({ timestamps }: Props) => {
  const [tick, setTick] = useState(0);
  const baselineRef = useRef<number | null>(null);

  // refresh every 5s so the rolling window slides
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const recent = timestamps.filter((t) => now - t <= windowMs).length;
  const rate = Math.round((recent / 5) * 10) / 10; // events per minute, 1 decimal

  // Establish baseline on first non-zero rate (smooth EMA afterwards)
  useEffect(() => {
    if (rate <= 0) return;
    if (baselineRef.current == null) {
      baselineRef.current = rate;
    } else {
      baselineRef.current = baselineRef.current * 0.85 + rate * 0.15;
    }
    // tick is in deps to recompute baseline as the window slides
  }, [rate, tick]);

  const baseline = baselineRef.current ?? rate;
  const trendUp = rate >= baseline;
  const color = rate === 0 ? "#64748b" : trendUp ? "#10b981" : "#ef4444";
  const glow =
    rate === 0
      ? "none"
      : trendUp
        ? "0 0 12px rgba(16,185,129,0.45)"
        : "0 0 12px rgba(239,68,68,0.4)";

  // animated number
  const spring = useSpring(rate, { stiffness: 90, damping: 18 });
  useEffect(() => {
    spring.set(rate);
  }, [rate, spring]);
  const display = useTransform(spring, (v) => {
    const n = Math.max(0, v);
    return n >= 10 ? Math.round(n).toString() : n.toFixed(1);
  });

  return (
    <span
      className="inline-flex items-baseline gap-1 font-mono tabular-nums leading-none"
      title={`${recent} eventos nos últimos 5 min`}
    >
      <motion.span
        className="text-base font-bold"
        style={{ color, textShadow: glow }}
      >
        {display}
      </motion.span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
        /min
      </span>
    </span>
  );
};

export default EventsPerMin;
