import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";

const HeroSection = () => (
  <section className="relative z-10 container max-w-7xl mx-auto px-6 pt-24 pb-32 lg:pt-36 lg:pb-44">
    <div className="grid lg:grid-cols-2 gap-16 items-center">
      {/* Left — copy */}
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-4 py-1.5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.15em]">
            Plataforma Ativa · Beta Exclusivo
          </span>
        </motion.div>

        <h1 className="font-display text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black leading-[1.05] tracking-[-0.03em]">
          Venda com
          <br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
            instinto de
          </span>
          <br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
            predador.
          </span>
        </h1>

        <p className="text-[17px] text-muted-foreground max-w-md leading-[1.7] font-light">
          A plataforma de checkout que une <span className="text-foreground font-medium">conversão agressiva</span>,{" "}
          rastreamento perfeito e área de membros — tudo num único painel.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Link to="/login?signup=true">
            <Button className="h-14 px-10 bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-full text-[15px] shadow-[0_4px_30px_rgba(0,230,118,0.35)] hover:shadow-[0_4px_40px_rgba(0,230,118,0.55)] transition-all duration-300 w-full sm:w-auto group">
              Criar conta grátis
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="ghost" className="h-14 px-8 text-muted-foreground hover:text-foreground border border-border hover:border-[#3A3A40] rounded-full text-[15px] font-medium transition-all duration-300 w-full sm:w-auto">
              Ver recursos
            </Button>
          </a>
        </div>

        <div className="flex items-center gap-6 pt-4">
          {["Sem mensalidade", "Setup em 5min", "Suporte incluso"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              <div className="w-1 h-1 rounded-full bg-primary/50" />
              {t}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Right — dashboard mockup */}
      <motion.div
        className="relative hidden lg:block"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute -inset-10 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent rounded-[40px] blur-3xl" />

        <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#141417] to-[#0B0B0D] shadow-pantera overflow-hidden backdrop-blur-sm">
          {/* Window bar */}
          <div className="h-10 bg-white/[0.03] flex items-center gap-2 px-5 border-b border-white/[0.04]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A2A2F]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A2A2F]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#2A2A2F]" />
            <div className="ml-4 h-5 w-48 rounded-full bg-white/[0.04]" />
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] text-[#6A6A75] uppercase tracking-wider font-medium">Faturamento Hoje</p>
                <p className="text-[2rem] font-black text-white font-mono mt-1">R$ 12.390</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#6A6A75] uppercase tracking-wider font-medium">Vendas</p>
                <p className="text-[2rem] font-black text-primary font-mono mt-1">47</p>
              </div>
            </div>

            {/* Chart bars */}
            <div className="h-28 flex items-end gap-1.5">
              {[30, 45, 25, 60, 80, 55, 70, 90, 65, 85, 95, 75].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-[#00C853]/60 to-primary/90"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: 0.6 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "PIX", value: "92%", accent: "text-primary" },
                { label: "Cartão", value: "87%", accent: "text-[#00C853]" },
                { label: "Conversão", value: "34%", accent: "text-gold" },
              ].map((m) => (
                <div key={m.label} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 text-center">
                  <p className="text-[10px] text-[#6A6A75] uppercase tracking-wider">{m.label}</p>
                  <p className={`text-xl font-black font-mono mt-1 ${m.accent}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating sale notification */}
        <motion.div
          className="absolute -right-6 top-16 bg-[#141417] border border-primary/20 rounded-2xl px-5 py-4 shadow-pantera backdrop-blur-sm"
          initial={{ opacity: 0, x: 30, y: -10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm">🎉</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9A9AA5]">Venda confirmada!</p>
              <p className="text-lg font-black text-primary font-mono">R$ 750</p>
            </div>
          </div>
        </motion.div>

        {/* Mascot peek */}
        <motion.img
          src={panteraMascot}
          alt=""
          className="absolute -bottom-6 -left-8 w-20 h-20 drop-shadow-[0_0_20px_rgba(0,230,118,0.25)]"
          initial={{ opacity: 0, y: 20, rotate: -10 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        />
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
