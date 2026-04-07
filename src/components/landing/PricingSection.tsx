import { motion } from "framer-motion";
import { Check, DollarSign, Zap, Shield, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const includedFeatures = [
  "Checkout otimizado para conversão",
  "Rastreamento DUAL (Pixel + CAPI)",
  "Área de membros integrada",
  "One-click upsell",
  "Multi-gateway (PIX, Cartão, Boleto)",
  "Builder visual de checkout",
  "Dashboard em tempo real",
  "Notificações push de venda",
  "Webhooks com HMAC",
  "Suporte incluso",
];

const transparencyItems = [
  {
    icon: DollarSign,
    title: "R$ 0,99 por venda aprovada",
    desc: "Cobrado apenas quando o pagamento é confirmado. Vendas pendentes, recusadas ou canceladas não geram taxa.",
  },
  {
    icon: Zap,
    title: "Sem mensalidade. Sem setup. Sem surpresa.",
    desc: "Você não paga nada para criar sua conta, configurar produtos ou publicar seu checkout.",
  },
  {
    icon: Shield,
    title: "Sem taxa sobre o gateway",
    desc: "A Panttera não cobra spread sobre a taxa do gateway de pagamento. Você paga apenas a taxa padrão do Pagar.me, Asaas ou Stripe diretamente.",
  },
];

const PricingSection = () => (
  <section
    id="pricing"
    aria-label="Preços e taxas da plataforma Panttera"
    className="relative z-10 py-28 lg:py-36 overflow-hidden"
  >
    {/* Background glow */}
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,_rgba(0,230,118,0.06)_0%,_transparent_60%)] blur-3xl" />
    </div>

    <div className="container max-w-5xl mx-auto px-6">
      {/* Header */}
      <motion.div
        className="text-center mb-16 space-y-5"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block text-[10px] font-bold text-primary uppercase tracking-[0.25em] mb-2 bg-primary/[0.06] border border-primary/15 rounded-full px-4 py-1.5">
          Preço transparente
        </span>
        <h2 className="text-3xl md:text-[2.75rem] lg:text-[3.5rem] font-black tracking-[-0.04em] leading-[1.05] font-display">
          Uma taxa.{" "}
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(90deg, #00E676, #00C853, #D4AF37)" }}
          >
            Sem letra miúda.
          </span>
        </h2>
        <p className="text-sm text-[#6A6A75] font-light max-w-lg mx-auto leading-relaxed">
          Acreditamos que transparência constrói confiança. Aqui você sabe exatamente o que paga — sempre.
        </p>
      </motion.div>

      {/* Main pricing card */}
      <motion.div
        className="relative max-w-xl mx-auto"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-sm" />
        <div className="relative bg-[#141417]/90 border border-white/[0.08] rounded-3xl overflow-hidden backdrop-blur-xl">
          {/* Price header */}
          <div className="p-8 pb-6 text-center border-b border-white/[0.06]">
            <p className="text-[11px] text-primary uppercase tracking-[0.2em] font-bold mb-4">
              Taxa única por venda
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-[#6A6A75] text-lg font-light">R$</span>
              <span className="text-6xl md:text-7xl font-black text-foreground font-display tracking-[-0.04em]">
                0,99
              </span>
            </div>
            <p className="text-[13px] text-[#6A6A75] font-light mt-3">
              por venda aprovada · pré-pago
            </p>
          </div>

          {/* Features list */}
          <div className="p-8 space-y-3">
            <p className="text-[11px] text-[#6A6A75] uppercase tracking-[0.15em] font-semibold mb-4">
              Tudo incluso:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {includedFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[13px] text-white/80 font-light">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="p-8 pt-4">
            <Link to="/login?signup=true">
              <Button className="w-full h-14 bg-gradient-to-r from-primary to-[#00C853] hover:from-[#00C853] hover:to-primary text-primary-foreground font-extrabold rounded-2xl text-[15px] shadow-[0_4px_40px_rgba(0,230,118,0.35)] hover:shadow-[0_8px_60px_rgba(0,230,118,0.55)] transition-all duration-500 group">
                Começar agora — é grátis
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
            <p className="text-center text-[11px] text-[#6A6A75] mt-3">
              Sem cartão de crédito. Sem compromisso.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Transparency section */}
      <motion.div
        className="mt-16 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] text-[#6A6A75] uppercase tracking-[0.15em] font-semibold">
            <Info className="w-3.5 h-3.5 text-primary/60" />
            Transparência total — sem asteriscos
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {transparencyItems.map((item, i) => (
            <motion.div
              key={item.title}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-primary/15 transition-all duration-300"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/[0.06] border border-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary/70" />
              </div>
              <h3 className="text-[14px] font-bold text-foreground mb-2">{item.title}</h3>
              <p className="text-[12px] text-[#6A6A75] font-light leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Fine print — full transparency */}
        <div className="mt-8 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-6">
          <h4 className="text-[12px] font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary/60" />
            Detalhamento completo de custos
          </h4>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-[12px] text-[#6A6A75] font-light">
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Taxa Panttera por venda</span>
              <span className="font-semibold text-foreground">R$ 0,99</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Mensalidade</span>
              <span className="font-semibold text-primary">R$ 0,00</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Setup / ativação</span>
              <span className="font-semibold text-primary">R$ 0,00</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Taxa sobre gateway</span>
              <span className="font-semibold text-primary">R$ 0,00</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>E-mails transacionais</span>
              <span className="font-semibold text-primary">Incluso</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Notificações push</span>
              <span className="font-semibold text-primary">Incluso</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Área de membros</span>
              <span className="font-semibold text-primary">Incluso</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
              <span>Rastreamento DUAL</span>
              <span className="font-semibold text-primary">Incluso</span>
            </div>
          </div>
          <p className="text-[11px] text-[#4A4A55] mt-4 leading-relaxed">
            * As taxas dos gateways de pagamento (Pagar.me, Asaas, Stripe, Mercado Pago) são cobradas
            diretamente pelo gateway, não pela Panttera. Consulte as condições do seu gateway para detalhes.
          </p>
        </div>
      </motion.div>
    </div>
  </section>
);

export default PricingSection;
