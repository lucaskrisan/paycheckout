import { CreditCard, QrCode, GraduationCap, Paintbrush, Sparkles, Target } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: CreditCard, title: "Checkout ultra-conversivo", desc: "Otimizado para maximizar vendas com timer, prova social e design profissional." },
  { icon: QrCode, title: "PIX, cartão e boleto", desc: "Aceita todos os métodos de pagamento com desconto inteligente no PIX." },
  { icon: GraduationCap, title: "Área de membros integrada", desc: "Entregue cursos, módulos e materiais automaticamente após a compra." },
  { icon: Paintbrush, title: "Builder visual de checkout", desc: "Monte seu checkout perfeito sem código com drag & drop." },
  { icon: Sparkles, title: "One-click upsell", desc: "Aumente o ticket médio com ofertas pós-compra sem reentrada de dados." },
  { icon: Target, title: "Rastreamento Meta avançado", desc: "Pixel + CAPI com deduplicação DUAL ✓ e EMQ otimizado para ROAS máximo." },
];

const FeaturesGrid = () => (
  <section id="features" className="relative z-10 container max-w-7xl mx-auto px-6 py-28">
    <SectionHeader
      title="Uma plataforma, "
      highlight="controle total."
      subtitle="Tudo que você precisa para vender online com alta performance."
    />
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
      {features.map((f, i) => (
        <FeatureCard key={f.title} {...f} index={i} />
      ))}
    </div>
  </section>
);

export function SectionHeader({ title, highlight, subtitle }: { title: string; highlight: string; subtitle: string }) {
  return (
    <motion.div
      className="text-center max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="text-3xl md:text-[2.75rem] font-black tracking-[-0.02em] leading-tight">
        {title}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400">
          {highlight}
        </span>
      </h2>
      <p className="text-sm text-zinc-500 mt-4 font-light">{subtitle}</p>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: any; title: string; desc: string; index: number }) {
  return (
    <motion.div
      className="group relative bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="relative z-10">
        <div className="w-12 h-12 bg-emerald-500/[0.08] border border-emerald-500/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-500/[0.12] group-hover:border-emerald-500/20 transition-all duration-500">
          <Icon className="w-5 h-5 text-emerald-400/80 group-hover:text-emerald-400 transition-colors duration-300" />
        </div>
        <h3 className="font-bold text-[15px] text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-[13px] text-zinc-500 leading-relaxed font-light">{desc}</p>
      </div>
    </motion.div>
  );
}

export default FeaturesGrid;
