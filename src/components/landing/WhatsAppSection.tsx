import { motion } from "framer-motion";
import { MessageCircle, Send, RotateCcw, Clock, CheckCheck } from "lucide-react";

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
  <section className="relative z-10 py-28 lg:py-36 overflow-hidden">
    {/* Glow */}
    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(0,230,118,0.04)_0%,_transparent_60%)] blur-3xl pointer-events-none" />

    <div className="container max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 rounded-full px-4 py-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-[11px] font-semibold text-[#25D366] uppercase tracking-[0.15em]">
              WhatsApp Automático
            </span>
          </div>

          <h2 className="font-display text-3xl md:text-[2.5rem] font-black tracking-[-0.025em] leading-[1.1]">
            Entrega e recuperação
            <br />
            automática no WhatsApp.
          </h2>

          <p className="text-[15px] text-[#9A9AA5] max-w-md leading-[1.8] font-light">
            Você vende. O <span className="text-white font-medium">PanteraPay cuida do resto.</span>{" "}
            Confirmação de compra, entrega de acesso e recuperação de carrinho — tudo pelo canal que seu cliente mais usa.
          </p>

          <div className="space-y-5 pt-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex gap-4"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="w-10 h-10 shrink-0 bg-[#25D366]/10 border border-[#25D366]/15 rounded-xl flex items-center justify-center mt-0.5">
                  <f.icon className="w-4 h-4 text-[#25D366]/80" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-white mb-1">{f.title}</h4>
                  <p className="text-[12px] text-[#6A6A75] leading-relaxed font-light">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right — WhatsApp chat mockup */}
        <motion.div
          className="relative hidden lg:block"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="max-w-[340px] mx-auto">
            {/* Phone frame */}
            <div className="bg-[#141417] rounded-[28px] border border-white/[0.08] p-2 shadow-pantera">
              {/* Status bar */}
              <div className="h-6 flex items-center justify-center">
                <div className="w-20 h-4 bg-black rounded-full" />
              </div>

              {/* WhatsApp header */}
              <div className="bg-[#1E1E22] rounded-t-2xl px-4 py-3 flex items-center gap-3 border-b border-white/[0.04]">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs">🐆</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white">PanteraPay</p>
                  <p className="text-[9px] text-[#25D366]">online</p>
                </div>
              </div>

              {/* Chat */}
              <div className="bg-[#0B0B0D] px-3 py-4 space-y-3 min-h-[360px]">
                {/* Incoming message */}
                <motion.div
                  className="max-w-[75%]"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="bg-[#1E1E22] rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-white/[0.04]">
                    <p className="text-[11px] text-white/90 leading-relaxed">
                      🎉 <span className="font-bold text-primary">Venda confirmada!</span>
                    </p>
                    <p className="text-[11px] text-white/70 mt-1">
                      Produto: <span className="font-medium text-white">Curso Expert Digital</span>
                    </p>
                    <p className="text-[11px] text-white/70">
                      Valor: <span className="font-mono font-bold text-primary">R$ 497,00</span>
                    </p>
                    <p className="text-[8px] text-[#6A6A75] text-right mt-1 flex items-center justify-end gap-1">
                      14:32 <CheckCheck className="w-3 h-3 text-[#25D366]" />
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="max-w-[75%]"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="bg-[#1E1E22] rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-white/[0.04]">
                    <p className="text-[11px] text-white/90 leading-relaxed">
                      🔑 Seu acesso foi liberado!
                    </p>
                    <p className="text-[11px] text-primary mt-1 underline">
                      app.panttera.com.br/acesso/x8k2
                    </p>
                    <p className="text-[8px] text-[#6A6A75] text-right mt-1 flex items-center justify-end gap-1">
                      14:32 <CheckCheck className="w-3 h-3 text-[#25D366]" />
                    </p>
                  </div>
                </motion.div>

                {/* Recovery message */}
                <motion.div
                  className="max-w-[80%] mt-6"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.1 }}
                >
                  <p className="text-[8px] text-[#6A6A75] text-center mb-2">— 2 horas depois —</p>
                  <div className="bg-[#1E1E22] rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-white/[0.04]">
                    <p className="text-[11px] text-white/90 leading-relaxed">
                      👋 Ei! Notei que você não finalizou sua compra do <span className="font-medium">Kit Templates Pro</span>.
                    </p>
                    <p className="text-[11px] text-white/70 mt-1">
                      Liberei um <span className="font-bold text-primary">cupom de 15% OFF</span> pra você 🔥
                    </p>
                    <p className="text-[11px] text-primary mt-1 underline">
                      app.panttera.com.br/kit-pro?cupom=VOLTA15
                    </p>
                    <p className="text-[8px] text-[#6A6A75] text-right mt-1 flex items-center justify-end gap-1">
                      16:45 <CheckCheck className="w-3 h-3 text-[#25D366]" />
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default WhatsAppSection;
