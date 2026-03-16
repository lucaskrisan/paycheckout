import { CreditCard, QrCode, GraduationCap, Paintbrush, Sparkles, Target } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: CreditCard,
    title: "Checkout que hipnotiza",
    desc: "Seu cliente entra, não consegue sair sem comprar. Timer inteligente, prova social em tempo real e design que elimina objeções.",
    tag: "Conversão",
  },
  {
    icon: QrCode,
    title: "PIX, cartão e boleto",
    desc: "94% de aprovação no PIX. Desconto inteligente que empurra o cliente pro pagamento instantâneo. Dinheiro na conta em segundos.",
    tag: "Pagamento",
  },
  {
    icon: GraduationCap,
    title: "Área de membros inclusa",
    desc: "Entrega cursos, módulos e materiais automaticamente. Zero trabalho manual. O aluno comprou? Acesso liberado. Ponto.",
    tag: "Entrega",
  },
  {
    icon: Paintbrush,
    title: "Checkout builder visual",
    desc: "Monte seu checkout perfeito em minutos. Drag & drop. Sem código. Sem pedir favor pra designer. Você no controle.",
    tag: "Criação",
  },
  {
    icon: Sparkles,
    title: "One-click upsell",
    desc: "O cliente acabou de comprar e já recebe uma oferta irrecusável. Sem redigitar dados. Ticket médio explode.",
    tag: "Receita",
  },
  {
    icon: Target,
    title: "Rastreamento militar",
    desc: "Pixel + CAPI com deduplicação DUAL ✓. EMQ otimizado. Cada centavo de anúncio rastreado. Seu ROAS agradece.",
    tag: "Tracking",
  },
];

const FeaturesGrid = () => (
  <section id="features" className="relative z-10 container max-w-7xl mx-auto px-6 py-32">
    <SectionHeader
      badge="Por que PanteraPay?"
      title="Enquanto você perde vendas, "
      highlight="seus concorrentes lucram."
      subtitle="Cada funcionalidade foi desenhada com um único objetivo: colocar mais dinheiro no seu bolso."
    />
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-20">
      {features.map((f, i) => (
        <FeatureCard key={f.title} {...f} index={i} />
      ))}
    </div>
  </section>
);

export function SectionHeader({ title, highlight, subtitle, badge }: { title: string; highlight: string; subtitle: string; badge?: string }) {
  return (
    <motion.div
      className="text-center max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {badge && (
        <span className="inline-block text-[10px] font-bold text-primary uppercase tracking-[0.25em] mb-5 bg-primary/[0.06] border border-primary/15 rounded-full px-4 py-1.5">
          {badge}
        </span>
      )}
      <h2 className="text-3xl md:text-[2.75rem] font-black tracking-[-0.025em] leading-[1.1]">
        {title}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#00C853] to-gold">
          {highlight}
        </span>
      </h2>
      <p className="text-sm text-[#6A6A75] mt-5 font-light leading-relaxed max-w-lg mx-auto">{subtitle}</p>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, tag, index }: { icon: any; title: string; desc: string; tag: string; index: number }) {
  return (
    <motion.div
      className="group relative bg-white/[0.015] border border-white/[0.05] rounded-2xl p-8 hover:border-primary/20 hover:bg-white/[0.03] transition-all duration-500 overflow-hidden"
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 bg-primary/[0.07] border border-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/[0.12] group-hover:border-primary/20 transition-all duration-500">
            <Icon className="w-5 h-5 text-primary/70 group-hover:text-primary transition-colors duration-300" />
          </div>
          <span className="text-[9px] font-bold text-[#3A3A40] uppercase tracking-[0.2em] group-hover:text-primary/40 transition-colors">
            {tag}
          </span>
        </div>
        <h3 className="font-bold text-[16px] text-white mb-2.5 tracking-tight">{title}</h3>
        <p className="text-[13px] text-[#6A6A75] leading-[1.7] font-light">{desc}</p>
      </div>
    </motion.div>
  );
}

export default FeaturesGrid;
