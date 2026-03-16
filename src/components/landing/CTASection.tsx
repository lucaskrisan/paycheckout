import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";

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
        <motion.img
          src={panteraMascot}
          alt=""
          className="w-16 h-16 mx-auto drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]"
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />

        <h2 className="text-3xl md:text-[2.75rem] font-black tracking-[-0.02em] leading-tight">
          Pronto para vender como{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400">
            predador?
          </span>
        </h2>

        <p className="text-zinc-500 max-w-lg mx-auto text-[15px] font-light leading-relaxed">
          Crie sua conta gratuita agora e tenha seu checkout profissional no ar em minutos.
        </p>

        <Link to="/login?signup=true">
          <Button className="h-14 px-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full text-[15px] shadow-[0_4px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_40px_rgba(16,185,129,0.55)] transition-all duration-300 mt-4 group">
            Criar Conta Grátis
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>

        <div className="flex items-center justify-center gap-8 pt-4">
          {["Sem mensalidade", "Setup em 5 min", "Suporte incluso"].map((t) => (
            <span key={t} className="flex items-center gap-2 text-[11px] text-zinc-600 uppercase tracking-[0.12em] font-medium">
              <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
