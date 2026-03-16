import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";

const CTASection = () => (
  <section id="cta" className="relative z-10 py-36 overflow-hidden">
    {/* Background glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,_rgba(0,230,118,0.06)_0%,_transparent_70%)]" />
    </div>

    <div className="container max-w-3xl mx-auto px-6 text-center relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8"
      >
        <motion.img
          src={panteraMascot}
          alt="PanteraPay"
          className="w-20 h-20 mx-auto drop-shadow-[0_0_30px_rgba(0,230,118,0.35)]"
          initial={{ scale: 0.7, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
        />

        <div className="space-y-4">
          <h2 className="text-3xl md:text-[2.75rem] lg:text-[3.25rem] font-black tracking-[-0.03em] leading-[1.08]">
            A cada minuto que você
            <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
              não está aqui,
            </span>
            <br />
            alguém lucra no seu lugar.
          </h2>
        </div>

        <p className="text-[#6A6A75] max-w-md mx-auto text-[15px] font-light leading-relaxed">
          Seu checkout atual está te custando vendas.{" "}
          <span className="text-white/80 font-medium">Você sabe disso.</span>{" "}
          A pergunta é: quanto tempo mais vai aceitar perder dinheiro?
        </p>

        <div className="pt-4 space-y-4">
          <Link to="/login?signup=true">
            <Button className="h-16 px-16 bg-primary hover:bg-[#00C853] text-primary-foreground font-extrabold rounded-full text-[17px] shadow-[0_4px_50px_rgba(0,230,118,0.4)] hover:shadow-[0_8px_70px_rgba(0,230,118,0.6)] hover:scale-[1.03] transition-all duration-300 group">
              <Zap className="w-5 h-5 mr-2 fill-current" />
              Criar Conta Grátis Agora
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </Button>
          </Link>
          <p className="text-[11px] text-[#3A3A40]">
            Sem cartão de crédito · Sem mensalidade · Setup em 3 minutos
          </p>
        </div>

        {/* Final urgency */}
        <motion.div
          className="mt-12 pt-8 border-t border-white/[0.04]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-[13px] text-[#6A6A75] font-light italic">
            "Quem chega primeiro, <span className="text-primary font-medium not-italic">domina o território.</span>"
          </p>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
