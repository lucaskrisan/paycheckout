import { motion } from "framer-motion";
import { Send, RotateCcw, Clock, CheckCheck, Workflow, Zap, MessageSquare } from "lucide-react";
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

      {/* New Flow Builder Visual for Producers */}
      <motion.div 
        className="mt-32 relative max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-center mb-12">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">Tecnologia Exclusiva</Badge>
          <h3 className="text-3xl md:text-4xl font-display font-black mb-4">Desenhe sua conversão visualmente</h3>
          <p className="text-[#9A9AA5] max-w-2xl mx-auto text-sm leading-relaxed">
            Esqueça configurações chatas. Na Panttera você desenha o fluxo de conversa do seu cliente como um mapa mental. Arraste, conecte e lucre.
          </p>
        </div>

        <div className="relative rounded-[32px] border border-white/[0.08] bg-[#0B0B0D] p-4 md:p-8 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_rgba(74,222,128,0.1)_0%,_transparent_70%)]" />
          
          <div className="relative flex flex-col md:flex-row gap-8 items-center">
            {/* Mock Flow Visual */}
            <div className="flex-1 grid grid-cols-1 gap-6 w-full">
              {/* Node 1: Trigger */}
              <div className="flex items-center gap-4">
                <div className="w-[200px] bg-[#1A1A1E] border border-primary/30 rounded-2xl p-4 shadow-lg relative group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-tighter">Disparo</span>
                  </div>
                  <p className="text-[10px] text-[#6A6A75]">Carrinho abandonado detectado</p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-primary/40 bg-[#0B0B0D] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </div>
                <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-primary to-amber-500/50" />
              </div>

              {/* Node 2: Timer */}
              <div className="flex items-center gap-4 md:pl-24">
                <div className="w-[180px] bg-[#1A1A1E] border border-amber-500/30 rounded-2xl p-4 shadow-lg relative group scale-105 ring-4 ring-amber-500/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-tighter text-amber-500">Timer</span>
                  </div>
                  <p className="text-lg font-black text-amber-500">15 min</p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-amber-500/40 bg-[#0B0B0D] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                </div>
                <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-amber-500/50 to-primary" />
              </div>

              {/* Node 3: Message */}
              <div className="flex items-center gap-4 md:pl-48">
                <div className="w-[220px] bg-[#1A1A1E] border border-primary/30 rounded-2xl p-4 shadow-lg relative group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-tighter">Mensagem</span>
                  </div>
                  <p className="text-[10px] text-[#9A9AA5] leading-relaxed line-clamp-2">"Ei &#123;nome&#125;, notamos que você..."</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold border border-primary/20">CUPOM</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold border border-primary/20">LINK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefit List */}
            <div className="w-full md:w-[320px] space-y-4">
              {[
                { title: "Builder Visual Intuitivo", desc: "Não precisa de código. Apenas desenhe." },
                { title: "Timers Inteligentes", desc: "Controle o timing exato para não dar spam." },
                { title: "Variáveis Dinâmicas", desc: "Links, nomes e valores automáticos." }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#4ade80]" />
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                  <p className="text-xs text-[#6A6A75] pl-4">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default WhatsAppSection;
