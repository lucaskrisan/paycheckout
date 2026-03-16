import { motion } from "framer-motion";
import {
  CreditCard, Globe, BarChart3, Webhook, Mail, Shield,
  Smartphone, ShoppingCart, Bell, Zap, Package, Link2,
} from "lucide-react";

const integrations = [
  { icon: CreditCard, label: "Pagar.me", color: "text-[#00C853]" },
  { icon: Globe, label: "Asaas", color: "text-[#00E676]" },
  { icon: ShoppingCart, label: "Mercado Pago", color: "text-[#00B0FF]" },
  { icon: Zap, label: "Stripe", color: "text-[#6772E5]" },
  { icon: BarChart3, label: "Meta Ads", color: "text-[#1877F2]" },
  { icon: Mail, label: "Resend", color: "text-[#9A9AA5]" },
  { icon: Webhook, label: "Webhooks", color: "text-primary" },
  { icon: Bell, label: "OneSignal", color: "text-[#FF6B6B]" },
  { icon: Smartphone, label: "WhatsApp", color: "text-[#25D366]" },
  { icon: Shield, label: "PCI DSS", color: "text-gold" },
  { icon: Package, label: "Appmax", color: "text-[#FF9800]" },
  { icon: Link2, label: "Zapier", color: "text-[#FF4A00]" },
];

const IntegrationsSection = () => (
  <section className="relative z-10 py-28 lg:py-36 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent overflow-hidden">
    <div className="container max-w-5xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="space-y-5 mb-16"
      >
        <span className="inline-block text-[10px] font-bold text-primary uppercase tracking-[0.25em] bg-primary/[0.06] border border-primary/15 rounded-full px-4 py-1.5">
          Ecossistema
        </span>
        <h2 className="text-3xl md:text-[2.75rem] font-black tracking-[-0.025em] leading-[1.1]">
          Conecte-se às principais plataformas{" "}
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #00E676, #00C853, #D4AF37)' }}>
            do mercado.
          </span>
        </h2>
        <p className="text-sm text-[#6A6A75] font-light max-w-lg mx-auto leading-relaxed">
          O PanteraPay se integra com as ferramentas que você já usa. Dados em tempo real, automações e entrega sem complicação.
        </p>
      </motion.div>

      {/* Integration icons grid */}
      <div className="relative">
        {/* Center glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] h-[300px] bg-[radial-gradient(circle,_rgba(0,230,118,0.08)_0%,_transparent_60%)] blur-2xl" />
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 gap-4 max-w-2xl mx-auto">
          {integrations.map((item, i) => (
            <motion.div
              key={item.label}
              className="group flex flex-col items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#1E1E22] border border-white/[0.06] flex items-center justify-center group-hover:border-primary/20 group-hover:bg-[#2A2A2F] transition-all duration-500 shadow-lg">
                <item.icon className={`w-6 h-6 ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </div>
              <span className="text-[9px] text-[#6A6A75] font-medium uppercase tracking-wider group-hover:text-white/60 transition-colors">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-[13px] text-[#9A9AA5] mt-12 font-light"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          Você vende. A tecnologia trabalha junto.{" "}
          <span className="text-primary font-medium">Só conectar e usar.</span>
        </motion.p>
      </div>
    </div>
  </section>
);

export default IntegrationsSection;
