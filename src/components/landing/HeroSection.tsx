import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";
import { useState } from "react";

/* ── Sparkle particles ── */
function Sparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] h-[2px] rounded-full bg-primary/60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Green glow orbs */}
      <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(0,230,118,0.08)_0%,_transparent_60%)] blur-2xl" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[radial-gradient(circle,_rgba(0,200,83,0.05)_0%,_transparent_60%)] blur-2xl" />
    </div>
  );
}

/* ── Laptop Mockup ── */
function LaptopMockup() {
  return (
    <div className="relative">
      {/* Laptop frame */}
      <div className="relative mx-auto" style={{ perspective: "1200px" }}>
        <motion.div
          className="relative"
          initial={{ opacity: 0, rotateY: -8, rotateX: 5 }}
          animate={{ opacity: 1, rotateY: -3, rotateX: 2 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Screen bezel */}
          <div className="bg-[#1a1a1e] rounded-t-xl p-[6px] border border-white/[0.08] shadow-[0_-10px_60px_rgba(0,230,118,0.08)]">
            {/* Screen */}
            <div className="bg-[#0B0B0D] rounded-lg overflow-hidden">
              {/* Top bar */}
              <div className="h-7 bg-[#141417] flex items-center px-3 gap-1.5 border-b border-white/[0.04]">
                <div className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                <div className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                <div className="w-2 h-2 rounded-full bg-[#28C840]" />
                <div className="ml-3 h-3.5 w-36 rounded bg-white/[0.04] flex items-center justify-center">
                  <span className="text-[7px] text-[#6A6A75] font-mono">app.panterapay.com</span>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-primary/10" />
                    <div className="h-2.5 w-20 rounded bg-white/10" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-5 w-14 rounded bg-white/[0.04]" />
                    <div className="h-5 w-14 rounded bg-primary/20" />
                  </div>
                </div>

                {/* Revenue section */}
                <div className="bg-[#141417] rounded-lg p-3 border border-white/[0.04]">
                  <p className="text-[7px] text-[#6A6A75] uppercase tracking-wider">Faturamento Total</p>
                  <p className="text-lg font-black text-white font-mono mt-0.5">R$ 127.390,00</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="text-[7px] text-primary font-bold">↑ 34.2%</div>
                    <div className="text-[7px] text-[#6A6A75]">vs. mês anterior</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-[#141417] rounded-lg p-3 border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[7px] text-[#6A6A75] uppercase tracking-wider">Vendas (7 dias)</div>
                    <div className="flex gap-1">
                      {["1D", "7D", "1M"].map((l) => (
                        <span key={l} className={`text-[6px] px-1.5 py-0.5 rounded ${l === "7D" ? "bg-primary/20 text-primary" : "text-[#6A6A75]"}`}>{l}</span>
                      ))}
                    </div>
                  </div>
                  {/* Chart bars */}
                  <div className="h-16 flex items-end gap-[3px]">
                    {[30, 45, 55, 40, 70, 85, 65, 90, 75, 95, 88, 78, 92, 60, 82].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary/80"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 0.8 + i * 0.04 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Vendas", value: "847", color: "text-primary" },
                    { label: "PIX", value: "94%", color: "text-primary" },
                    { label: "Cartão", value: "91%", color: "text-[#00C853]" },
                    { label: "Ticket", value: "R$ 257", color: "text-gold" },
                  ].map((m) => (
                    <div key={m.label} className="bg-[#1E1E22] rounded p-2 text-center border border-white/[0.03]">
                      <p className="text-[6px] text-[#6A6A75] uppercase">{m.label}</p>
                      <p className={`text-[10px] font-black font-mono mt-0.5 ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Laptop base */}
          <div className="h-3 bg-gradient-to-b from-[#2A2A2F] to-[#1E1E22] rounded-b-xl mx-4 border-x border-b border-white/[0.06]" />
          <div className="h-1.5 bg-[#1E1E22] rounded-b-2xl mx-16 border-x border-b border-white/[0.04]" />
        </motion.div>
      </div>
    </div>
  );
}

const HeroSection = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="relative z-10 overflow-hidden">
      <Sparkles />

      <div className="container max-w-7xl mx-auto px-6 pt-20 pb-28 lg:pt-32 lg:pb-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — copy + mascot */}
          <motion.div
            className="space-y-7 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Mascot */}
            <motion.img
              src={panteraMascot}
              alt="PanteraPay"
              className="w-28 h-28 md:w-36 md:h-36 drop-shadow-[0_0_40px_rgba(0,230,118,0.35)] mb-2"
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 120 }}
            />

            <h1 className="font-display text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black leading-[1.05] tracking-[-0.03em]">
              Venda com o
              <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
                instinto de um
              </span>
              <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
                predador.
              </span>
            </h1>

            <p className="text-[16px] text-[#9A9AA5] max-w-md leading-[1.8] font-light">
              Mais controle, mais conversão,{" "}
              <span className="text-white font-medium">menos gambiarra.</span>{" "}
              O checkout que produtores inteligentes usam para dominar o mercado.
            </p>

            {/* Email capture */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[52px] flex-1 bg-[#1E1E22] border border-white/[0.08] rounded-lg px-4 text-sm text-white placeholder:text-[#6A6A75] focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <Link to={`/login?signup=true${email ? `&email=${encodeURIComponent(email)}` : ""}`}>
                <Button className="h-[52px] px-7 bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-lg text-[14px] shadow-[0_4px_30px_rgba(0,230,118,0.35)] hover:shadow-[0_4px_45px_rgba(0,230,118,0.55)] transition-all duration-300 w-full sm:w-auto whitespace-nowrap">
                  Criar conta grátis
                </Button>
              </Link>
            </div>

            <p className="text-[12px] text-[#6A6A75] font-light">
              Grátis e criptografado. Cancele quando quiser.
            </p>
          </motion.div>

          {/* Right — Laptop mockup */}
          <div className="relative hidden lg:block">
            <LaptopMockup />

            {/* Floating sale notification */}
            <motion.div
              className="absolute -right-2 top-8 bg-[#141417]/95 border border-primary/25 rounded-xl px-4 py-3 shadow-pantera backdrop-blur-md z-20"
              initial={{ opacity: 0, x: 40, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-sm">🎉</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary">Venda realizada 🔥</p>
                  <p className="text-lg font-black text-white font-mono">R$ 750,00</p>
                  <p className="text-[8px] text-[#6A6A75]">Pagamento via PIX</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Partners bar */}
      <div className="border-t border-white/[0.04] bg-white/[0.01] py-6 mt-8">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-6 md:gap-12 flex-wrap">
            {[
              "Mercado Pago", "Asaas", "Appmax", "PCI DSS",
              "Pagar.me", "Stripe", "Meta",
            ].map((name, i) => (
              <motion.span
                key={name}
                className="text-[11px] md:text-[12px] font-bold text-[#3A3A40] uppercase tracking-[0.12em] hover:text-[#6A6A75] transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.08 }}
              >
                {name}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
