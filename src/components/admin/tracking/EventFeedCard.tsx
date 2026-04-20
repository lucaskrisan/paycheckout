import { motion } from "framer-motion";
import { Eye, ShoppingCart, UserCheck, CreditCard, Zap, MousePointerClick, TrendingUp, BookOpen } from "lucide-react";
import { format } from "date-fns";

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PageView: { label: "PageView", color: "#818cf8", icon: Eye },
  ViewContent: { label: "ViewContent", color: "#fb923c", icon: BookOpen },
  InitiateCheckout: { label: "Checkout", color: "#fbbf24", icon: ShoppingCart },
  Lead: { label: "Lead", color: "#60a5fa", icon: UserCheck },
  AddPaymentInfo: { label: "Payment", color: "#a78bfa", icon: CreditCard },
  AddToCart: { label: "Add Cart", color: "#f472b6", icon: MousePointerClick },
  Purchase: { label: "Purchase", color: "#D4AF37", icon: TrendingUp },
};

// Map ISO country code to flag emoji
function flagFromCountry(code?: string | null) {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  const offset = (c: string) => c.toUpperCase().charCodeAt(0) - 65;
  return String.fromCodePoint(A + offset(code[0])) + String.fromCodePoint(A + offset(code[1]));
}

interface Props {
  group: {
    event_id: string;
    event_name: string;
    product_id: string;
    customer_name: string | null;
    created_at: string;
    sources: string[];
  };
  productName?: string;
  geo?: { country?: string | null; city?: string | null };
}

const EventFeedCard = ({ group, productName, geo }: Props) => {
  const cfg = EVENT_CONFIG[group.event_name] || { label: group.event_name, color: "#94a3b8", icon: Zap };
  const Icon = cfg.icon;
  const hasBrowser = group.sources.includes("browser");
  const hasServer = group.sources.includes("server");
  const isDual = hasBrowser && hasServer;
  const isPurchase = group.event_name === "Purchase";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-all ${
        isPurchase ? "bg-gradient-to-r from-[#D4AF37]/10 to-transparent" : ""
      }`}
      style={
        isPurchase
          ? { boxShadow: "inset 3px 0 0 #D4AF37" }
          : undefined
      }
    >
      <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: `${cfg.color}18` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-base shrink-0" aria-hidden>
          {flagFromCountry(geo?.country)}
        </span>
        <span className="text-xs font-semibold text-foreground truncate">
          {group.customer_name || "Visitante"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        {productName && (
          <span className="text-[10px] text-muted-foreground truncate">
            · {productName}
          </span>
        )}
        {geo?.city && (
          <span className="text-[10px] text-muted-foreground/70">
            · {geo.city}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isDual ? (
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            DUAL
          </span>
        ) : hasBrowser ? (
          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
            PIXEL
          </span>
        ) : (
          <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
            CAPI
          </span>
        )}
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {format(new Date(group.created_at), "HH:mm:ss")}
        </span>
      </div>
    </motion.div>
  );
};

export default EventFeedCard;
