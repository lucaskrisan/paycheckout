import {
  BarChart3, Globe, ShoppingCart, Users, Layers, Webhook,
  Bell, Mail, TrendingUp, FileText, Shield, MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader } from "./FeaturesGrid";

const allFeatures = [
  { icon: BarChart3, title: "Dashboard em tempo real", desc: "Vendas, receita e métricas com notificação Ka-CHING." },
  { icon: Globe, title: "Multi-gateway", desc: "Pagar.me, Asaas, Mercado Pago e Stripe." },
  { icon: ShoppingCart, title: "Recuperação de carrinho", desc: "Capture e recupere vendas perdidas." },
  { icon: Users, title: "Cupons de desconto", desc: "Cupons por produto com limite e validade." },
  { icon: Layers, title: "Order bumps", desc: "Ofertas complementares direto no checkout." },
  { icon: Webhook, title: "Webhooks", desc: "Integre com qualquer plataforma via HMAC." },
  { icon: Bell, title: "Notificações push", desc: "Alertas de venda em tempo real via PWA." },
  { icon: Mail, title: "E-mails transacionais", desc: "Envio automático de confirmação e acesso." },
  { icon: TrendingUp, title: "Atribuição UTM", desc: "Saiba qual campanha gerou cada venda." },
  { icon: FileText, title: "Relatórios avançados", desc: "Métricas por método, chargeback e reembolso." },
  { icon: Shield, title: "Segurança total", desc: "RLS, SSL e antifraude em todos os gateways." },
  { icon: MessageCircle, title: "WhatsApp (em breve)", desc: "Recuperação e entrega via WhatsApp." },
];

const AllFeatures = () => (
  <section id="all-features" className="relative z-10 container max-w-7xl mx-auto px-6 py-28">
    <SectionHeader
      title="Tudo que um "
      highlight="predador precisa."
      subtitle="Funcionalidades completas para dominar o mercado digital."
    />
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-16">
      {allFeatures.map((f, i) => (
        <motion.div
          key={f.title}
          className="group bg-white/[0.015] border border-white/[0.04] rounded-xl p-5 hover:border-emerald-500/15 hover:bg-white/[0.03] transition-all duration-500"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
        >
          <f.icon className="w-[18px] h-[18px] text-emerald-500/50 mb-3 group-hover:text-emerald-400 transition-colors duration-300" />
          <h3 className="text-[13px] font-bold text-white mb-1 tracking-tight">{f.title}</h3>
          <p className="text-[12px] text-zinc-600 leading-relaxed font-light">{f.desc}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

export default AllFeatures;
