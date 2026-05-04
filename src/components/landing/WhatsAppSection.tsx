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

      {/* Global Sales Design Integration */}
      <div id="global-sales" className="mt-32 relative group">
        <div className="relative min-h-[600px] flex flex-col lg:flex-row items-center gap-12 p-8 md:p-16 overflow-hidden rounded-[48px] border border-white/[0.08] bg-[#0B0B0D] shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(74,222,128,0.1)_0%,_transparent_70%)]" />
          <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 800 800">
              <circle cx="600" cy="200" r="300" fill="url(#grad1)" fillOpacity="0.2" />
              <defs>
                <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#4ADE80" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Left Side: Content & Sales Feed */}
          <div className="relative z-20 flex-1 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Escala Global</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black font-display leading-[1.1] tracking-tight">
                Venda em qualquer <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ADE80] to-[#2DD4BF]">lugar do planeta.</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed max-w-xl font-light">
                Não importa se seu cliente está em Miami, Tóquio ou São Paulo. A Panttera processa pagamentos e garante o compliance em mais de <span className="text-white font-medium">180 países</span> automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Conversão Global", value: "+28%", icon: Zap },
                { label: "Compliance Local", value: "100%", icon: ShieldCheck }
              ].map((stat, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
                  <stat.icon className="w-5 h-5 text-primary mb-3" />
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Visual Asset Interaction */}
          <div className="relative z-20 flex-1 w-full lg:w-auto h-[400px] flex items-center justify-center">
            {/* The Mascot - Using the existing clean mascot instead of the one with bad background */}
            <motion.div
              className="relative z-30"
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 2, 0]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full" />
              <img 
                src={panteraMascot} 
                alt="Panttera Mascot" 
                className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-[0_0_50px_rgba(74,222,128,0.3)]" 
              />
            </motion.div>

            {/* Floating Notification Elements */}
            <motion.div 
              className="absolute top-0 right-4 md:right-12 bg-[#141417]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-40"
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">🇺🇸</div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">Sale Approved</p>
                  <p className="text-sm font-black text-white">$ 150.00</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="absolute bottom-8 left-4 md:left-12 bg-[#141417]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-40"
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">🇧🇷</div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">Venda Aprovada</p>
                  <p className="text-sm font-black text-white">R$ 219,72</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="absolute top-1/2 -left-4 bg-[#141417]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-40 hidden md:block"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm">🇯🇵</div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">販売承認済み</p>
                  <p className="text-sm font-black text-white">¥ 25,500</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default WhatsAppSection;
