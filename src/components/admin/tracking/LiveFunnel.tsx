import { motion } from "framer-motion";
import NinaWatermark from "./NinaWatermark";

interface Props {
  eventCounts: Record<string, number>;
}

const STAGES = [
  { key: "PageView", label: "PageView", color: "#14B8A6" },
  { key: "ViewContent", label: "ViewContent", color: "#22C39B" },
  { key: "InitiateCheckout", label: "InitiateCheckout", color: "#5BB07F" },
  { key: "AddPaymentInfo", label: "AddPaymentInfo", color: "#A89A52" },
  { key: "Purchase", label: "Purchase", color: "#D4AF37" },
];

const LiveFunnel = ({ eventCounts }: Props) => {
  const top = Math.max(eventCounts[STAGES[0].key] || 0, 1);

  return (
    <div className="relative rounded-xl bg-muted/40 border border-border/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
        <p className="text-xs text-muted-foreground font-medium">
          Funil Live · {STAGES.length} etapas
        </p>
      </div>

      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const value = eventCounts[stage.key] || 0;
          const widthPct = Math.max((value / top) * 100, 4);
          const prevValue = idx > 0 ? eventCounts[STAGES[idx - 1].key] || 0 : null;
          const conversion =
            prevValue && prevValue > 0 ? Math.round((value / prevValue) * 100) : null;

          return (
            <div key={stage.key}>
              {conversion !== null && (
                <div className="flex justify-end mb-1 pr-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      color: "#D4AF37",
                      backgroundColor: "rgba(212, 175, 55, 0.12)",
                      border: "1px solid rgba(212, 175, 55, 0.3)",
                    }}
                  >
                    {conversion}% →
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-[11px] text-muted-foreground font-medium truncate">
                  {stage.label}
                </div>
                <div className="flex-1 h-9 bg-muted/30 rounded-md overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-md flex items-center px-3"
                    style={{
                      background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color})`,
                      boxShadow: `0 0 12px ${stage.color}33`,
                    }}
                  >
                    <span className="text-[11px] font-bold text-white tabular-nums">
                      {value.toLocaleString()}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <NinaWatermark />
    </div>
  );
};

export default LiveFunnel;
