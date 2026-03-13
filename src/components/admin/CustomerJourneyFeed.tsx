import { useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ShoppingCart, UserCheck, CreditCard, MousePointerClick, TrendingUp, Zap, CheckCircle2, Loader2 } from "lucide-react";

interface PixelEvent {
  id: string;
  product_id: string;
  event_name: string;
  source: string;
  created_at: string;
  customer_name: string | null;
  visitor_id: string | null;
}

interface Props {
  events: PixelEvent[];
  products: { id: string; name: string }[];
}

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: any; order: number }> = {
  PageView: { label: "Acessou a página", color: "#818cf8", icon: Eye, order: 0 },
  InitiateCheckout: { label: "Entrou no checkout", color: "#fbbf24", icon: ShoppingCart, order: 1 },
  Lead: { label: "Preencheu os dados", color: "#60a5fa", icon: UserCheck, order: 2 },
  AddToCart: { label: "Clicou em comprar", color: "#f472b6", icon: MousePointerClick, order: 3 },
  AddPaymentInfo: { label: "Informou pagamento", color: "#a78bfa", icon: CreditCard, order: 4 },
  Purchase: { label: "Pagou! 🎉", color: "#34d399", icon: TrendingUp, order: 5 },
};

const JOURNEY_END = "Purchase";

const CustomerJourneyFeed = ({ events, products }: Props) => {
  const journeys = useMemo(() => {
    // Group events by visitor_id (full journey), fall back to customer_name
    const map = new Map<string, PixelEvent[]>();
    
    events.forEach((e) => {
      const key = e.visitor_id || (e.customer_name ? `name:${e.customer_name.trim().toLowerCase()}` : null);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });

    // Build journey objects sorted by most recent activity
    const result = Array.from(map.entries()).map(([key, evts]) => {
      const sorted = [...evts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // Find the best name from any event in this journey
      const namedEvent = sorted.find((e) => e.customer_name);
      const displayName = namedEvent?.customer_name || "Visitante";
      const firstName = displayName.split(" ")[0];
      const lastEvent = sorted[sorted.length - 1];
      const completed = sorted.some((e) => e.event_name === JOURNEY_END);
      const productName = products.find((p) => p.id === sorted[0].product_id)?.name;

      // Deduplicate event types, keep first occurrence
      const seenTypes = new Set<string>();
      const uniqueSteps = sorted.filter((e) => {
        if (seenTypes.has(e.event_name)) return false;
        seenTypes.add(e.event_name);
        return true;
      });

      return {
        key,
        displayName,
        firstName,
        events: uniqueSteps,
        lastEvent,
        completed,
        productName,
        lastActivity: new Date(lastEvent.created_at).getTime(),
      };
    });

    return result.sort((a, b) => b.lastActivity - a.lastActivity);
  }, [events, products]);

  if (journeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }}>
          <UserCheck className="w-8 h-8 text-slate-700" />
        </motion.div>
        <p className="text-sm text-slate-600 font-medium">Nenhuma jornada identificada</p>
        <p className="text-[11px] text-slate-700">As jornadas aparecem quando clientes preenchem o formulário</p>
      </div>
    );
  }

  const completedCount = journeys.filter((j) => j.completed).length;
  const pendingCount = journeys.length - completedCount;

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/40">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/50 border border-slate-700/30">
          <UserCheck className="w-3 h-3 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-300">{journeys.length}</span>
          <span className="text-[10px] text-slate-500">visitantes</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
          <Loader2 className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-semibold text-amber-400">{pendingCount}</span>
          <span className="text-[10px] text-amber-400/60">aguardando</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-400">{completedCount}</span>
          <span className="text-[10px] text-emerald-400/60">convertidos</span>
        </div>
        {journeys.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/50 border border-slate-700/30">
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px] font-semibold text-cyan-400">
              {journeys.length > 0 ? ((completedCount / journeys.length) * 100).toFixed(0) : 0}%
            </span>
            <span className="text-[10px] text-slate-500">taxa</span>
          </div>
        )}
      </div>
      <AnimatePresence mode="popLayout">
        {journeys.map((journey) => (
          <motion.div
            key={journey.key}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-5 py-4 hover:bg-slate-800/20 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  journey.completed
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/30"
                }`}
              >
                {journey.firstName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-200 truncate">
                    {journey.firstName}
                  </span>
                  {journey.completed ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" /> COMPROU
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> AGUARDANDO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {journey.productName && (
                    <span className="text-[10px] text-slate-500 truncate">{journey.productName}</span>
                  )}
                  <span className="text-[10px] text-slate-600">
                    · {format(new Date(journey.lastEvent.created_at), "HH:mm:ss")}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline steps */}
            <div className="flex items-center gap-1 ml-10 flex-wrap">
              {journey.events.map((e, i) => {
                const cfg = EVENT_CONFIG[e.event_name];
                const Icon = cfg?.icon || Zap;
                return (
                  <div key={e.id} className="flex items-center gap-1">
                    {i > 0 && (
                      <div className="w-4 h-[1px] bg-slate-700/60" />
                    )}
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium"
                      style={{
                        backgroundColor: `${cfg?.color || "#475569"}15`,
                        color: cfg?.color || "#94a3b8",
                        border: `1px solid ${cfg?.color || "#475569"}25`,
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{cfg?.label || e.event_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CustomerJourneyFeed;
