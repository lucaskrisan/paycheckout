import { motion } from "framer-motion";
import { Bell, Volume2 } from "lucide-react";

const notifications = [
  { name: "Lucas M.", value: "R$ 497,00", time: "agora", method: "PIX", emoji: "🔥" },
  { name: "Ana C.", value: "R$ 1.297,00", time: "2 min", method: "Cartão", emoji: "💳" },
  { name: "Pedro R.", value: "R$ 247,00", time: "5 min", method: "PIX", emoji: "⚡" },
  { name: "Julia S.", value: "R$ 897,00", time: "8 min", method: "PIX", emoji: "🎯" },
];

const NotificationsSection = () => (
  <section className="relative z-10 py-28 lg:py-36">
    <div className="container max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/[0.06] border border-primary/15 rounded-full px-4 py-1.5">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.15em]">
              Tempo Real
            </span>
          </div>

          <h2 className="font-display text-3xl md:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.08]">
            Notificações em{" "}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #00E676, #00C853, #D4AF37)" }}>
              Tempo Real.
            </span>
          </h2>

          <p className="text-[15px] text-[#9A9AA5] max-w-md leading-[1.8] font-light">
            Com o app da Panttera você acompanha suas vendas em tempo real.{" "}
            <span className="text-white font-medium">Cada venda, um som de Ka-CHING</span> que vicia.
          </p>

          <div className="flex items-center gap-3 bg-[#141417] border border-white/[0.06] rounded-xl px-5 py-3 w-fit">
            <Volume2 className="w-5 h-5 text-primary animate-pulse" />
            <div>
              <p className="text-[12px] font-bold text-white">Ka-CHING! 🔔</p>
              <p className="text-[10px] text-[#6A6A75]">Dopamina de empreendedor em cada venda</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="max-w-sm ml-auto space-y-3">
            {notifications.map((n, i) => (
              <motion.div
                key={i}
                className="group flex items-center justify-between bg-[#111114] border border-white/[0.05] rounded-2xl px-5 py-4 hover:border-primary/15 hover:bg-[#141417] transition-all duration-500"
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                    <span className="text-sm">{n.emoji}</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-primary">Venda realizada</p>
                    <p className="text-[11px] text-[#7A7A85]">
                      {n.name} · {n.method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-black text-white font-mono">{n.value}</p>
                  <p className="text-[9px] text-[#5A5A65]">{n.time}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,118,0.04)_0%,_transparent_70%)] pointer-events-none blur-2xl" />
        </motion.div>
      </div>
    </div>
  </section>
);

export default NotificationsSection;
