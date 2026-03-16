import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CTASection = () => (
  <section id="cta" className="relative z-10 py-32">
    <div className="container max-w-3xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <h2 className="text-3xl md:text-[2.75rem] lg:text-[3.25rem] font-black tracking-[-0.03em] leading-[1.08] font-display">
          Pronto para vender como{" "}
          <span className="text-transparent bg-clip-text italic" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
            predador?
          </span>
        </h2>

        <p className="text-[#6A6A75] max-w-md mx-auto text-[15px] font-light leading-relaxed">
          Crie sua conta gratuita agora e tenha seu checkout profissional no ar em minutos.
        </p>

        <Link to="/login?signup=true">
          <Button className="h-16 px-14 bg-primary hover:bg-[#00C853] text-primary-foreground font-extrabold rounded-lg text-[16px] shadow-[0_4px_50px_rgba(0,230,118,0.4)] hover:shadow-[0_8px_70px_rgba(0,230,118,0.6)] hover:scale-[1.02] transition-all duration-300 mt-4 group">
            Criar Conta Grátis
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
          </Button>
        </Link>

        <div className="flex items-center justify-center gap-8 pt-4">
          {["Sem mensalidade", "Setup em 5 min", "Suporte incluso"].map((t) => (
            <span key={t} className="flex items-center gap-2 text-[11px] text-[#6A6A75] uppercase tracking-[0.12em] font-medium">
              <div className="w-1 h-1 rounded-full bg-primary/50" />
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
