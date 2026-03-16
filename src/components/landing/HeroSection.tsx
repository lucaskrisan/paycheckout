import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";
import { useEffect, useState } from "react";

function AnimatedCounter({ target, duration = 2 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.floor(v)),
    });
    return () => controls.stop();
  }, [target, duration]);
  return <>{value.toLocaleString("pt-BR")}</>;
}

const HeroSection = () => (
  <section className="relative z-10 container max-w-7xl mx-auto px-6 pt-28 pb-36 lg:pt-40 lg:pb-52">
    {/* Floating particles */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{ left: `${15 + i * 18}%`, top: `${20 + i * 12}%` }}
          animate={{ y: [-20, 20, -20], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>

    <div className="grid lg:grid-cols-2 gap-20 items-center">
      {/* Left — copy */}
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Live badge */}
        <motion.div
          className="inline-flex items-center gap-2.5 bg-primary/[0.06] border border-primary/15 rounded-full px-5 py-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.18em]">
            +2.847 produtores migrando agora
          </span>
        </motion.div>

        <h1 className="font-display text-[2.75rem] md:text-[3.5rem] lg:text-[4.25rem] font-black leading-[1.02] tracking-[-0.035em]">
          Seus concorrentes
          <br />
          já estão vendendo
          <br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
            enquanto você lê isso.
          </span>
        </h1>

        <p className="text-[17px] text-muted-foreground max-w-lg leading-[1.8] font-light">
          O checkout que <span className="text-foreground font-semibold">converte 3x mais</span> que qualquer plataforma do mercado.
          Rastreamento perfeito. Área de membros. Zero mensalidade.{" "}
          <span className="text-primary font-medium">E é grátis pra começar.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-3">
          <Link to="/login?signup=true">
            <Button className="h-[60px] px-12 bg-primary hover:bg-[#00C853] text-primary-foreground font-extrabold rounded-full text-base shadow-[0_4px_40px_rgba(0,230,118,0.4)] hover:shadow-[0_8px_60px_rgba(0,230,118,0.6)] hover:scale-[1.02] transition-all duration-300 w-full sm:w-auto group">
              Começar agora — é grátis
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </Button>
          </Link>
          <a href="#proof">
            <Button variant="ghost" className="h-[60px] px-8 text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/20 rounded-full text-[15px] font-medium transition-all duration-300 w-full sm:w-auto gap-2">
              <Play className="w-4 h-4 fill-current" />
              Ver como funciona
            </Button>
          </a>
        </div>

        {/* Urgency micro-copy */}
        <motion.div
          className="flex items-center gap-3 pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="flex -space-x-2">
            {["🟢", "🟢", "🟢"].map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-[#1E1E22] border-2 border-background flex items-center justify-center text-[10px]">
                {["👤", "👤", "👤"][i]}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">
            <span className="text-primary font-semibold">147 pessoas</span> criaram conta nas últimas 2h
          </p>
        </motion.div>
      </motion.div>

      {/* Right — dashboard mockup */}
      <motion.div
        className="relative hidden lg:block"
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Glow behind */}
        <div className="absolute -inset-16 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,118,0.08)_0%,_transparent_70%)]" />

        <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#141417] to-[#0B0B0D] shadow-pantera overflow-hidden">
          {/* Window bar */}
          <div className="h-11 bg-white/[0.02] flex items-center gap-2 px-5 border-b border-white/[0.04]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            <div className="ml-4 h-5 w-52 rounded-full bg-white/[0.04] flex items-center justify-center">
              <span className="text-[9px] text-[#6A6A75] font-mono">app.panterapay.com/dashboard</span>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Revenue header */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-[#6A6A75] uppercase tracking-[0.2em] font-medium">Faturamento Hoje</p>
                <p className="text-[2.5rem] font-black text-white font-mono mt-1 tracking-tight">
                  R$ <AnimatedCounter target={47390} />
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#6A6A75] uppercase tracking-[0.2em] font-medium">Vendas</p>
                <p className="text-[2.5rem] font-black text-primary font-mono mt-1 tracking-tight">
                  <AnimatedCounter target={184} />
                </p>
              </div>
            </div>

            {/* Chart bars */}
            <div className="h-32 flex items-end gap-1.5">
              {[25, 40, 35, 55, 70, 50, 65, 85, 60, 80, 92, 88, 95, 78].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/50 to-primary/90"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: 0.7 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Conversão PIX", value: "94.2%", accent: "text-primary" },
                { label: "Aprovação Cartão", value: "91.7%", accent: "text-[#00C853]" },
                { label: "Ticket Médio", value: "R$ 257", accent: "text-gold" },
              ].map((m) => (
                <div key={m.label} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 text-center">
                  <p className="text-[9px] text-[#6A6A75] uppercase tracking-[0.15em]">{m.label}</p>
                  <p className={`text-xl font-black font-mono mt-1.5 ${m.accent}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating sale notification — animated */}
        <motion.div
          className="absolute -right-4 top-20 bg-[#141417]/95 border border-primary/25 rounded-2xl px-5 py-4 shadow-pantera backdrop-blur-md"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Venda agora!</p>
              <p className="text-xl font-black text-white font-mono">R$ 1.497</p>
              <p className="text-[9px] text-[#6A6A75] mt-0.5">PIX · há 3 segundos</p>
            </div>
          </div>
        </motion.div>

        {/* Second notification */}
        <motion.div
          className="absolute -left-6 bottom-24 bg-[#141417]/95 border border-gold/20 rounded-2xl px-4 py-3 shadow-pantera backdrop-blur-md"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">🏆</span>
            <div>
              <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Meta batida!</p>
              <p className="text-[11px] text-white/70">R$ 50.000 em 24h</p>
            </div>
          </div>
        </motion.div>

        {/* Mascot */}
        <motion.img
          src={panteraMascot}
          alt="PanteraPay mascot"
          className="absolute -bottom-4 -left-6 w-20 h-20 drop-shadow-[0_0_25px_rgba(0,230,118,0.3)]"
          initial={{ opacity: 0, y: 20, rotate: -12 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, delay: 1.8 }}
        />
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
