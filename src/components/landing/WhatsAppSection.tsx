import { motion } from "framer-motion";
import { Send, RotateCcw, Clock, CheckCheck, Globe, ShieldCheck, Zap } from "lucide-react";
import panteraMascot from "@/assets/pantera-mascot.png";
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

      {/* Global Sales Section - Modern Reconstruction */}
      <div id="global-sales" className="mt-40 relative group">
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative min-h-[600px] flex flex-col items-center gap-12 pt-16 pb-24 overflow-hidden rounded-[48px] border border-white/[0.05] bg-[#050505] shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          {/* Section Header */}
          <div className="relative z-20 text-center space-y-4 px-6 max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-full px-4 py-1.5 mb-2"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Escala Sem Fronteiras</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black font-display leading-[1.05] tracking-tight text-white"
            >
              Domine o <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#4ADE80] to-[#2DD4BF]">Mercado Global</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg md:text-xl leading-relaxed font-light"
            >
              Venda em dólares, euros ou ienes. A Panttera remove as barreiras geográficas <br className="hidden md:block" />
              e coloca seu produto nas mãos de clientes em todo o mundo.
            </motion.p>
          </div>

          {/* Central Visual Area */}
          <div className="relative w-full max-w-6xl px-6 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-4 mt-8">
            
            {/* Left Column: Metrics */}
            <div className="w-full lg:w-1/4 space-y-6 order-2 lg:order-1">
              {[
                { label: "Taxa de Conversão", value: "98.2%", sub: "Global Average", color: "from-primary/20" },
                { label: "Tempo de Setup", value: "2 min", sub: "Instant Activation", color: "from-blue-500/20" }
              ].map((card, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className={`bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-8 relative overflow-hidden group hover:border-primary/20 transition-all duration-500`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">{card.label}</p>
                  <p className="text-4xl font-black text-white mb-1">{card.value}</p>
                  <p className="text-primary text-[11px] font-medium">{card.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Center: Mascot & Map */}
            <div className="relative flex-1 flex items-center justify-center order-1 lg:order-2 py-10">
              {/* World Map Background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none select-none mix-blend-screen">
                <svg viewBox="0 0 1000 500" className="w-full h-full text-primary">
                  <path fill="none" d="M250,150 Q300,100 350,150 T450,150 T550,150 T650,150 T750,150" opacity="0.2" stroke="currentColor" strokeWidth="1" />
                  <circle cx="200" cy="200" r="2" fill="currentColor" />
                  <circle cx="500" cy="150" r="2" fill="currentColor" />
                  <circle cx="800" cy="300" r="2" fill="currentColor" />
                  <circle cx="300" cy="400" r="2" fill="currentColor" />
                </svg>
              </div>

              {/* Main Mascot Interaction */}
              <div className="relative z-10">
                <motion.div
                  animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 1, 0]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-125 opacity-50" />
                  <img 
                    src={panteraMascot} 
                    alt="Panttera Global" 
                    className="w-72 h-72 md:w-[450px] md:h-[450px] object-contain drop-shadow-[0_0_80px_rgba(74,222,128,0.25)] relative z-10" 
                  />
                </motion.div>

                {/* Floating Global Sales Notifications */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* USA Sale */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
                    className="absolute -top-10 -right-4 md:-right-20 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex items-center gap-4 min-w-[200px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner">🇺🇸</div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-tighter">New Sale: New York</p>
                      <p className="text-xl font-black text-white">$ 249.00</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] text-gray-500 font-bold uppercase">Confirmed</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Japan Sale */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 100 }}
                    className="absolute bottom-4 -left-4 md:-left-32 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex items-center gap-4 min-w-[200px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner">🇯🇵</div>
                    <div>
                      <p className="text-[10px] font-black text-[#FFB800] uppercase tracking-tighter">Sale: Tokyo</p>
                      <p className="text-xl font-black text-white">¥ 38,000</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse" />
                        <span className="text-[9px] text-gray-500 font-bold uppercase">Processing</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Brazil Sale */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.2, type: "spring", stiffness: 100 }}
                    className="absolute -bottom-16 right-0 md:right-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 shadow-2xl flex items-center gap-4 min-w-[200px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner">🇧🇷</div>
                    <div>
                      <p className="text-[10px] font-black text-[#009739] uppercase tracking-tighter">Venda: São Paulo</p>
                      <p className="text-xl font-black text-white">R$ 1.497,00</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#009739] animate-pulse" />
                        <span className="text-[9px] text-gray-500 font-bold uppercase">Aprovada</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right Column: Features */}
            <div className="w-full lg:w-1/4 space-y-6 order-3">
              {[
                { title: "Compliance Automático", desc: "Leis de taxas e impostos locais aplicadas instantaneamente.", icon: ShieldCheck },
                { title: "180+ Moedas", desc: "Receba em sua moeda local, venda na moeda do seu cliente.", icon: Zap }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="flex flex-col gap-3 p-6 bg-white/[0.01] hover:bg-white/[0.03] rounded-3xl border border-white/[0.05] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
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
