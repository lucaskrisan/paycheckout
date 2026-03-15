import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, CreditCard, GraduationCap, BarChart3, Shield, ArrowRight,
  CheckCircle2, Globe, Target, ShoppingCart, Paintbrush, Bell, Webhook,
  QrCode, FileText, Users, TrendingUp, Sparkles,
  Mail, MessageCircle, Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import panteraMascot from "@/assets/pantera-mascot.png";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setResolving(false); setResolved(false); return; }
    if (resolved) return;
    let cancelled = false;
    setResolving(true);
    resolveUserDestination()
      .then((dest) => { if (!cancelled) { setResolved(true); navigate(dest, { replace: true }); } })
      .catch(() => { if (!cancelled) { setResolved(true); navigate("/completar-perfil", { replace: true }); } });
    return () => { cancelled = true; };
  }, [user, loading, navigate, resolved]);

  if (loading || (user && resolving && !resolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const features = [
    { icon: CreditCard, title: "Checkout ultra-conversivo", desc: "Otimizado para maximizar suas vendas com timer, prova social e design profissional." },
    { icon: QrCode, title: "PIX, cartão e boleto", desc: "Aceita todos os métodos de pagamento com desconto inteligente no PIX." },
    { icon: GraduationCap, title: "Área de membros integrada", desc: "Entregue cursos, módulos e materiais automaticamente após a compra." },
    { icon: Paintbrush, title: "Builder visual de checkout", desc: "Monte seu checkout perfeito sem código com drag & drop." },
    { icon: Sparkles, title: "One-click upsell", desc: "Aumente o ticket médio com ofertas pós-compra sem reentrada de dados." },
    { icon: Target, title: "Rastreamento Meta avançado", desc: "Pixel + CAPI com deduplicação DUAL ✓ e EMQ otimizado para ROAS máximo." },
  ];

  const allFeatures = [
    { icon: BarChart3, title: "Dashboard em tempo real", desc: "Acompanhe vendas, receita e métricas com notificação sonora Ka-CHING." },
    { icon: Globe, title: "Multi-gateway", desc: "Pagar.me, Asaas, Mercado Pago e Stripe — escolha o seu favorito." },
    { icon: ShoppingCart, title: "Recuperação de carrinho", desc: "Capture carrinhos abandonados e recupere vendas perdidas." },
    { icon: Users, title: "Cupons de desconto", desc: "Crie cupons por produto com limite de uso, validade e valor mínimo." },
    { icon: Layers, title: "Order bumps", desc: "Adicione ofertas complementares direto no checkout." },
    { icon: Webhook, title: "Webhooks", desc: "Integre com qualquer plataforma via webhooks autenticados HMAC." },
    { icon: Bell, title: "Notificações push", desc: "Receba alertas de venda em tempo real no celular via PWA." },
    { icon: Mail, title: "E-mails transacionais", desc: "Envio automático de confirmação, acesso e lembretes." },
    { icon: TrendingUp, title: "Atribuição UTM", desc: "Saiba exatamente qual campanha gerou cada venda." },
    { icon: FileText, title: "Relatórios avançados", desc: "Métricas de conversão por método de pagamento, chargeback e reembolso." },
    { icon: Shield, title: "Segurança total", desc: "RLS, criptografia SSL e antifraude integrado em todos os gateways." },
    { icon: MessageCircle, title: "WhatsApp (em breve)", desc: "Recuperação de carrinho e entrega de acesso via WhatsApp." },
  ];

  const partners = ["Pagar.me", "Asaas", "Mercado Pago", "Stripe", "Meta", "PCI DSS"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* ═══ Particle BG ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.04)_0%,_transparent_50%)]" />
      </div>

      {/* ═══ Header ═══ */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#0a0a0a]/80 sticky top-0">
        <div className="container max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <img src={panteraMascot} alt="PanteraPay" className="w-9 h-9" />
            <span className="font-bold text-lg tracking-tight">
              Pantera<span className="text-emerald-400">Pay</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#all-features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#cta" className="hover:text-white transition-colors">Contato</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700">
                Entrar
              </Button>
            </Link>
            <Link to="/login?signup=true">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg">
                Criar Conta Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="relative z-10 container max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            className="space-y-7"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.img
              src={panteraMascot}
              alt="PanteraPay Mascot"
              className="w-24 h-24 lg:w-28 lg:h-28 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight">
              Venda com o{" "}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                instinto de um predador
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-lg leading-relaxed">
              Mais controle, mais conversão, menos gambiarra. A plataforma completa para produtores digitais que querem dominar suas vendas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Seu melhor e-mail"
                className="h-12 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 rounded-lg sm:w-64"
              />
              <Link to="/login?signup=true">
                <Button className="h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-base w-full sm:w-auto">
                  Criar conta grátis <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-zinc-600">Grátis e criptografado. Cancele quando quiser.</p>
          </motion.div>

          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Dashboard mockup */}
            <div className="relative">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-2xl shadow-emerald-500/5 overflow-hidden">
                <div className="h-8 bg-zinc-800/80 flex items-center gap-1.5 px-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">Faturamento Hoje</p>
                      <p className="text-2xl font-bold text-white font-mono">R$ 12.390,00</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Vendas</p>
                      <p className="text-2xl font-bold text-emerald-400 font-mono">47</p>
                    </div>
                  </div>
                  {/* Mini chart */}
                  <div className="h-24 flex items-end gap-1">
                    {[30, 45, 25, 60, 80, 55, 70, 90, 65, 85, 95, 75].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/40 to-emerald-400/80"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "PIX", value: "92%", color: "text-emerald-400" },
                      { label: "Cartão", value: "87%", color: "text-blue-400" },
                      { label: "Boleto", value: "34%", color: "text-amber-400" },
                    ].map((m) => (
                      <div key={m.label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-zinc-500">{m.label}</p>
                        <p className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating notification */}
              <motion.div
                className="absolute -right-4 top-12 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl"
                initial={{ opacity: 0, x: 20, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
              >
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  Venda realizada 🎉
                </p>
                <p className="text-lg font-bold text-emerald-400 font-mono">R$ 750,00</p>
                <p className="text-[10px] text-zinc-500">Pagar.me · Crédito</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Partners Bar ═══ */}
      <section className="relative z-10 border-y border-zinc-800/50 bg-zinc-900/30 py-6">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
            {partners.map((name) => (
              <span key={name} className="text-sm font-semibold text-zinc-500 tracking-wide">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features Grid ═══ */}
      <section id="features" className="relative z-10 container max-w-7xl mx-auto px-6 py-24">
        <SectionHeader
          title="Uma plataforma, "
          highlight="controle total."
          subtitle="Tudo que você precisa para vender online com alta performance."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </section>

      {/* ═══ Social Proof ═══ */}
      <section className="relative z-10 border-y border-zinc-800/50 bg-zinc-900/20 py-20">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "4+", label: "Gateways integrados" },
              { value: "100%", label: "DUAL ✓ deduplicação" },
              { value: "3", label: "Métodos de pagamento" },
              { value: "24/7", label: "Monitoramento ativo" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
                  {s.value}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ All Features ═══ */}
      <section id="all-features" className="relative z-10 container max-w-7xl mx-auto px-6 py-24">
        <SectionHeader
          title="Tudo que um "
          highlight="predador precisa."
          subtitle="Funcionalidades completas para dominar o mercado digital."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-14">
          {allFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              className="group bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 hover:border-emerald-500/20 hover:bg-zinc-900/80 transition-all duration-300"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
            >
              <f.icon className="w-5 h-5 text-emerald-400/70 mb-3 group-hover:text-emerald-400 transition-colors" />
              <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="cta" className="relative z-10 py-24">
        <div className="container max-w-3xl mx-auto px-6 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Pronto para vender como{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                predador?
              </span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Crie sua conta gratuita agora e tenha seu checkout profissional no ar em minutos.
            </p>
            <Link to="/login?signup=true">
              <Button className="h-14 px-10 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-base shadow-lg shadow-emerald-500/20 mt-4">
                Criar Conta Grátis <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-6 pt-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" /> Sem mensalidade</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" /> Setup em 5 min</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" /> Suporte incluso</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="relative z-10 border-t border-zinc-800/50 py-10">
        <div className="container max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={panteraMascot} alt="" className="w-6 h-6" />
            <span className="text-sm font-bold text-zinc-400">
              Pantera<span className="text-emerald-400">Pay</span>
            </span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} PanteraPay. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <Link to="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link to="/login?signup=true" className="hover:text-white transition-colors">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ── Sub-components ── */

function SectionHeader({ title, highlight, subtitle }: { title: string; highlight: string; subtitle: string }) {
  return (
    <motion.div
      className="text-center max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
        {title}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
          {highlight}
        </span>
      </h2>
      <p className="text-sm text-zinc-500 mt-3">{subtitle}</p>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: any; title: string; desc: string; index: number }) {
  return (
    <motion.div
      className="group relative bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 hover:border-emerald-500/20 transition-all duration-300 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

export default Index;
