import { motion } from "framer-motion";
import { Send, RotateCcw, Clock, CheckCheck, Globe, ShieldCheck, Zap, Languages, Banknote } from "lucide-react";
import panteraMascot from "@/assets/pantera-mascot.png";
import globalSalesMap from "@/assets/global-sales-map.png";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Send,
    title: "Entrega automática com segurança",
    desc: "Login, senhas, links e materiais entregues via WhatsApp em segundos após a compra.",
  },
  {
    icon: RotateCcw,
    title: "Recuperação de carrinho via WhatsApp",
    desc: "Seu comprador desistiu? Mensagem inteligente no WhatsApp traz ele de volta sem esforço.",
  },
  {
    icon: Clock,
    title: "Sem trabalho manual. Tudo no piloto automático.",
    desc: "Configure uma vez e deixe o sistema trabalhar por você 24 horas por dia.",
  },
];

const WhatsAppSection = () => (
  <section aria-label="Automação via WhatsApp" className="relative z-10 py-28 lg:py-36 overflow-hidden">
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,_rgba(37,211,102,0.06)_0%,_transparent_60%)] blur-3xl pointer-events-none" aria-hidden="true" />

    <div className="container max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 rounded-full px-4 py-1.5">
            <WhatsAppIcon className="w-4 h-4" />
            <span className="text-[11px] font-semibold text-[#25D366] uppercase tracking-[0.15em]">
              WhatsApp Automático
            </span>
          </div>

          <h2 className="font-display text-3xl md:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.08]">
            Entrega e recuperação
            <br />
            <span className="text-[#25D366]">automática no WhatsApp.</span>
          </h2>

          <p className="text-[15px] text-[#9A9AA5] max-w-md leading-[1.8] font-light">
            Você vende. A <span className="text-white font-medium">Panttera cuida do resto.</span>{" "}
            Confirmação de compra, entrega de acesso e recuperação de carrinho — tudo pelo canal que seu cliente mais usa.
          </p>

          <div className="space-y-5 pt-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex gap-4 group"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                <div className="w-11 h-11 shrink-0 bg-[#25D366]/10 border border-[#25D366]/15 rounded-xl flex items-center justify-center mt-0.5 group-hover:bg-[#25D366]/15 group-hover:border-[#25D366]/25 transition-all duration-300">
                  <f.icon className="w-4.5 h-4.5 text-[#25D366]/80" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-[12px] text-[#6A6A75] leading-relaxed font-light">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Phone mockup */}
        <motion.div
          className="relative hidden lg:block"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          aria-hidden="true"
        >
          <div className="max-w-[340px] mx-auto">
            <div className="bg-gradient-to-b from-[#1A1A1E] to-[#141417] rounded-[32px] border border-white/[0.08] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              <div className="h-7 flex items-center justify-center">
                <div className="w-24 h-5 bg-black rounded-full" />
              </div>

              <div className="bg-[#1E1E22] rounded-t-2xl px-4 py-3.5 flex items-center gap-3 border-b border-white/[0.04]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/15">
                  <span className="text-sm">🐆</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white">Panttera</p>
                  <p className="text-[9px] text-[#25D366] font-medium">online</p>
                </div>
              </div>

              <div className="bg-[#0B0B0D] px-3 py-4 space-y-3 min-h-[380px]">
                <motion.div className="max-w-[78%]" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
                  <div className="bg-[#1E1E22] rounded-2xl rounded-tl-sm px-4 py-3 border border-white/[0.04]">
                    <p className="text-[11px] text-white/90 leading-relaxed">🎉 <span className="font-bold text-primary">Venda confirmada!</span></p>
                    <p className="text-[11px] text-white/70 mt-1">Produto: <span className="font-medium text-white">Curso Expert Digital</span></p>
                    <p className="text-[11px] text-white/70">Valor: <span className="font-mono font-bold text-primary">R$ 497,00</span></p>
                    <p className="text-[8px] text-[#6A6A75] text-right mt-1.5 flex items-center justify-end gap-1">14:32 <CheckCheck className="w-3 h-3 text-[#25D366]" /></p>
                  </div>
                </motion.div>

                <motion.div className="max-w-[78%]" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.8 }}>
                  <div className="bg-[#1E1E22] rounded-2xl rounded-tl-sm px-4 py-3 border border-white/[0.04]">
                    <p className="text-[11px] text-white/90 leading-relaxed">🔑 Seu acesso foi liberado!</p>
                    <p className="text-[11px] text-primary mt-1 underline">app.panttera.com.br/acesso/x8k2</p>
                    <p className="text-[8px] text-[#6A6A75] text-right mt-1.5 flex items-center justify-end gap-1">14:32 <CheckCheck className="w-3 h-3 text-[#25D366]" /></p>
                  </div>
                </motion.div>

                <motion.div className="max-w-[82%] mt-6" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 1.1 }}>
                  <p className="text-[8px] text-[#4A4A55] text-center mb-2 font-medium">— 2 horas depois —</p>
                  <div className="bg-[#1E1E22] rounded-2xl rounded-tl-sm px-4 py-3 border border-white/[0.04]">
                    <p className="text-[11px] text-white/90 leading-relaxed">👋 Ei! Notei que você não finalizou sua compra do <span className="font-medium">Kit Templates Pro</span>.</p>
                    <p className="text-[11px] text-white/70 mt-1">Liberei um <span className="font-bold text-primary">cupom de 15% OFF</span> pra você 🔥</p>
                    <p className="text-[11px] text-primary mt-1 underline">app.panttera.com.br/kit-pro?cupom=VOLTA15</p>
                    <p className="text-[8px] text-[#6A6A75] text-right mt-1.5 flex items-center justify-end gap-1">16:45 <CheckCheck className="w-3 h-3 text-[#25D366]" /></p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[60%] h-[40px] bg-[radial-gradient(ellipse,_rgba(37,211,102,0.15)_0%,_transparent_70%)] blur-xl" />
        </motion.div>
      </div>

      {/* Global Sales Section — Premium SaaS */}
      <div id="global-sales" className="mt-40 relative">
        <div className="relative overflow-hidden rounded-[40px] border border-white/[0.06] bg-[#030303] shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)]">
          {/* Radial green glow */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[radial-gradient(circle,_rgba(0,230,118,0.12)_0%,_rgba(0,230,118,0.04)_30%,_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />
          </div>

          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 px-6 md:px-12 lg:px-16 pt-20 md:pt-24 pb-16 md:pb-20">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-primary/[0.06] border border-primary/15 rounded-full px-4 py-1.5 backdrop-blur-sm"
              >
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.22em]">Vendas Globais</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="font-display text-4xl md:text-5xl lg:text-6xl font-black tracking-[-0.03em] leading-[1.05] text-white"
              >
                Seu produto vendendo
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#4ADE80] to-primary">no mundo inteiro.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="text-[15px] md:text-[17px] text-[#9A9AA5] leading-[1.7] font-light max-w-2xl mx-auto"
              >
                Receba em <span className="text-white font-medium">180+ moedas</span>, traduza seu checkout automaticamente e acesse compradores em qualquer país. Infraestrutura global, operação simples.
              </motion.p>
            </div>

            {/* Centerpiece: world map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="relative mt-16 md:mt-20 max-w-5xl mx-auto"
            >
              {/* Glow under image */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,118,0.18)_0%,_transparent_60%)] blur-3xl pointer-events-none" aria-hidden="true" />

              <img
                src={globalSalesMap}
                alt="Vendas globais aprovadas em tempo real"
                className="relative w-full h-auto select-none drop-shadow-[0_30px_80px_rgba(0,230,118,0.15)]"
                loading="lazy"
              />

              {/* Fade bottom */}
              <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none" aria-hidden="true" />
            </motion.div>

            {/* Floating cards row */}
            <div className="relative mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[
                { icon: Banknote, title: "180+ moedas", desc: "Receba em BRL, USD, EUR, JPY e mais." },
                { icon: Languages, title: "Checkout multi-idioma", desc: "Tradução automática por geolocalização." },
                { icon: ShieldCheck, title: "Compliance global", desc: "Impostos e regulações locais aplicados." },
              ].map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm hover:border-primary/20 hover:bg-white/[0.04] transition-all duration-500"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <c.icon className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-white mb-1">{c.title}</h3>
                      <p className="text-[12px] text-[#7A7A85] leading-relaxed font-light">{c.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default WhatsAppSection;
