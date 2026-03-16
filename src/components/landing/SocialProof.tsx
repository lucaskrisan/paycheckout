import { motion } from "framer-motion";

const stats = [
  { value: "4+", label: "Gateways integrados" },
  { value: "100%", label: "Deduplicação DUAL ✓" },
  { value: "3", label: "Métodos de pagamento" },
  { value: "24/7", label: "Monitoramento ativo" },
];

const partners = ["Pagar.me", "Asaas", "Mercado Pago", "Stripe", "Meta Ads", "PCI DSS"];

const SocialProof = () => (
  <section className="relative z-10 border-y border-white/[0.04] bg-white/[0.01]">
    {/* Partners */}
    <div className="border-b border-white/[0.04] py-6">
      <div className="container max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
          {partners.map((name) => (
            <span key={name} className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.2em]">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>

    {/* Stats */}
    <div className="py-16">
      <div className="container max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 tracking-tight">
                {s.value}
              </p>
              <p className="text-[11px] text-zinc-600 mt-2 uppercase tracking-[0.15em] font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SocialProof;
