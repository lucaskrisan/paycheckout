import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";
import { useState } from "react";
import HeroSparkles from "./hero/HeroSparkles";
import HeroLaptopMockup from "./hero/HeroLaptopMockup";

const HeroSection = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="relative z-10 overflow-hidden">
      <HeroSparkles />

      {/* Animated aurora glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] opacity-40"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(0,230,118,0.12) 0%, rgba(212,175,55,0.04) 40%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container max-w-7xl mx-auto px-6 pt-20 pb-28 lg:pt-32 lg:pb-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — copy + mascot */}
          <motion.div
            className="space-y-7 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Mascot with glow ring */}
            <div className="relative w-fit">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src={panteraMascot}
                alt="PanteraPay"
                className="relative w-28 h-28 md:w-36 md:h-36 drop-shadow-[0_0_40px_rgba(0,230,118,0.35)]"
                initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 120 }}
              />
            </div>

            <h1 className="font-display text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black leading-[1.05] tracking-[-0.03em]">
              Venda com o
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #00E676, #00C853, #D4AF37)" }}
              >
                instinto de um
              </span>
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #00E676, #00C853, #D4AF37)" }}
              >
                predador.
              </span>
            </h1>

            <p className="text-[16px] text-muted-foreground max-w-md leading-[1.8] font-light">
              Mais controle, mais conversão,{" "}
              <span className="text-foreground font-medium">menos gambiarra.</span> O checkout que
              produtores inteligentes usam para dominar o mercado.
            </p>

            {/* Email capture */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[52px] flex-1 bg-secondary border border-border rounded-lg px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <Link to={`/login?signup=true${email ? `&email=${encodeURIComponent(email)}` : ""}`}>
                <Button className="h-[52px] px-7 bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-lg text-[14px] shadow-[0_4px_30px_rgba(0,230,118,0.35)] hover:shadow-[0_4px_45px_rgba(0,230,118,0.55)] transition-all duration-300 w-full sm:w-auto whitespace-nowrap group">
                  Criar conta grátis
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <p className="text-[12px] text-muted-foreground font-light">
              Grátis e criptografado. Cancele quando quiser.
            </p>
          </motion.div>

          {/* Right — Laptop mockup */}
          <div className="relative hidden lg:block">
            <HeroLaptopMockup />

            {/* Floating sale notification */}
            <motion.div
              className="absolute -right-2 top-8 bg-card/95 border border-primary/25 rounded-xl px-4 py-3 shadow-[0_8px_32px_rgba(0,230,118,0.15)] backdrop-blur-md z-20"
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
                  <p className="text-lg font-black text-foreground font-mono">R$ 750,00</p>
                  <p className="text-[8px] text-muted-foreground">Pagamento via PIX</p>
                </div>
              </div>
            </motion.div>

            {/* Second floating notification */}
            <motion.div
              className="absolute -left-6 bottom-16 bg-card/95 border border-[#D4AF37]/25 rounded-xl px-4 py-3 shadow-[0_8px_32px_rgba(212,175,55,0.1)] backdrop-blur-md z-20"
              initial={{ opacity: 0, x: -40, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <span className="text-sm">⚡</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#D4AF37]">Conversão recorde</p>
                  <p className="text-lg font-black text-foreground font-mono">34.2%</p>
                  <p className="text-[8px] text-muted-foreground">Checkout otimizado</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Partners bar */}
      <div className="border-t border-border bg-card/30 py-6">
        <div className="container max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-4 font-medium">
            Integrado com as maiores plataformas
          </p>
          <div className="flex items-center justify-center gap-6 md:gap-12 flex-wrap">
            {[
              "Mercado Pago", "Asaas", "Appmax", "PCI DSS",
              "Pagar.me", "Stripe", "Meta",
            ].map((name, i) => (
              <motion.span
                key={name}
                className="text-[11px] md:text-[12px] font-bold text-muted-foreground/50 uppercase tracking-[0.12em] hover:text-muted-foreground transition-colors"
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
