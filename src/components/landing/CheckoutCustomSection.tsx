import { motion } from "framer-motion";
import { Palette, Globe, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CheckoutCustomSection = () => (
  <section className="relative z-10 py-28 lg:py-36 overflow-hidden">
    {/* Glow */}
    <div className="absolute left-0 top-1/3 w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(0,230,118,0.04)_0%,_transparent_60%)] blur-3xl pointer-events-none" />

    <div className="container max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <motion.div
          className="space-y-7"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-3xl md:text-[2.5rem] font-black tracking-[-0.025em] leading-[1.1]">
            Checkout no seu
            <br />
            domínio.{" "}
            <span className="text-transparent bg-clip-text italic" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
              Do seu jeito.
            </span>
          </h2>

          <p className="text-[15px] text-[#9A9AA5] max-w-md leading-[1.8] font-light">
            A venda acontece dentro da sua identidade, sem rótulo genérico. Sem aquele visual padrão de plataforma.{" "}
            <span className="text-white font-medium">Isso aumenta conversão. E muito.</span>
          </p>

          <Link to="/login?signup=true">
            <Button className="h-12 px-7 bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-lg text-[13px] shadow-[0_4px_30px_rgba(0,230,118,0.3)] hover:shadow-[0_4px_45px_rgba(0,230,118,0.5)] transition-all duration-300 group">
              Criar checkout agora
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Right — Checkout mockup features */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {[
            {
              icon: Palette,
              title: "Checkout 100% personalizável",
              desc: "Cores, logo, textos, layout — tudo na sua mão com builder visual drag & drop.",
            },
            {
              icon: Globe,
              title: "Domínio e subdomínio próprio",
              desc: "checkout.seusite.com — o cliente nunca sai da sua marca.",
            },
            {
              icon: CheckCircle,
              title: "Experiência contínua sem quebra de credibilidade",
              desc: "Sem redirecionamentos estranhos. Da landing page ao pagamento em um fluxo perfeito.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="flex gap-4 bg-[#141417] border border-white/[0.06] rounded-xl p-5 hover:border-primary/15 transition-all duration-300"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
            >
              <div className="w-10 h-10 shrink-0 bg-primary/[0.07] border border-primary/10 rounded-xl flex items-center justify-center">
                <item.icon className="w-4.5 h-4.5 text-primary/70" />
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-white mb-1">{item.title}</h4>
                <p className="text-[12px] text-[#6A6A75] leading-relaxed font-light">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default CheckoutCustomSection;
