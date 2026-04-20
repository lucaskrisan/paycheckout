import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ninaAvatar from "@/assets/nina-avatar.png";

interface Props {
  period: string;
  onPeriodChange: (value: string) => void;
  filterProduct: string;
  onProductChange: (value: string) => void;
  products: { id: string; name: string }[];
}

const PERIODS = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
];

const NinaTrackingHeader = ({
  period,
  onPeriodChange,
  filterProduct,
  onProductChange,
  products,
}: Props) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Brand identity */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={ninaAvatar}
            alt="Nina"
            width={48}
            height={48}
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#D4AF37]/60"
            style={{
              boxShadow: "0 0 16px rgba(212, 175, 55, 0.35)",
            }}
          />
          <motion.span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-hidden
          />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold leading-tight flex items-center gap-1.5">
            <span
              style={{
                background: "linear-gradient(135deg, #14B8A6 0%, #D4AF37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Nina Tracking
            </span>
            <span className="text-[10px] text-[#D4AF37] font-bold align-top">™</span>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Inteligência de conversão ao vivo
          </p>
        </div>

        {/* LIVE badge */}
        <div className="ml-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[9px] font-bold tracking-wider text-emerald-300 uppercase">
            Live
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Select value={filterProduct} onValueChange={onProductChange}>
          <SelectTrigger className="w-[170px] bg-muted/60 border-border text-foreground text-xs h-8">
            <SelectValue placeholder="Todos os produtos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period pills */}
        <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/40">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                period === p.value
                  ? "bg-gradient-to-r from-[#14B8A6]/90 to-[#D4AF37]/90 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NinaTrackingHeader;
