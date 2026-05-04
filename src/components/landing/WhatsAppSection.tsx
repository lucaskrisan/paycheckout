import { motion } from "framer-motion";
import { Send, RotateCcw, Clock, CheckCheck } from "lucide-react";
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
      <div className="mt-32">
        <div className="relative min-h-[700px] flex flex-col items-center justify-start pt-16 px-4 overflow-hidden rounded-[40px] border border-white/[0.05] bg-[#050505]">
          {/* Top-right radial glow effect */}
          <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-[radial-gradient(circle,_rgba(74,222,128,0.2)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none z-1" />

          {/* HeaderText */}
          <div className="relative z-20 text-center max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white">
              Vendas Globais com a <span className="text-[#4ADE80]">Panttera</span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
              Seus produtos em mais de 180 países. Processamento de pagamentos e compliance local, tudo desenhado para converter no mundo todo.
            </p>
          </div>

          {/* MainVisualArea */}
          <div className="relative w-full max-w-7xl h-[600px] mt-8">
            {/* Black Panther Asset */}
            <div className="absolute left-[-15%] lg:left-[-12%] bottom-0 w-[65%] lg:w-[50%] z-30 pointer-events-none opacity-90">
              <img 
                alt="Majestic Black Panther" 
                className="w-full h-auto object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDWb_6uJjr5EwGLvgiBED8SGwiuBTXmkvj2Uds63aVbx08ohlOuCKxS9468RSE6Sju9UyEf_gDYb5yC1oZ9ETmCCvJaGmATaRvdKEEE0tXWXSWFcPvwO_u9hDmI0UUvdCQwSfSOl8lPn0p_yUopTJZB_6g1fqr7S5eV0aXMIRvxczJarswLMOEGXaw2LoGKPHmCi19w0jlFybATWKQ96XulmyPgLRh2VWHgmDjt4ACD_V-2baDAphbd1_YWQ0ae_pnwc8e0b1iy4s"
              />
            </div>

            {/* World Map Background Asset */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full lg:w-[85%] h-full z-10 opacity-40">
              <img 
                alt="Global Network Map" 
                className="w-full h-full object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlkA1n2z490ertV7ECMS3dQn8JfgTRdLEqIttIyDmNe_19X_Yg6sQOheVH5kiGJqZjhvdnuZ2EiUU9m7lUK_v6WPuJxGfHCMyAz6llxDlDn4fmiD4wasUZqCZrM9QZOtyId7oUdn8OlbpKzHPUz9UTmi8VzJTctub_q9bgzYfS4IEFEII7zlcGZjgGcuxn957UKhF-uMoqt2GuqfC396Oug__N1dSIbFndEQAbax5ER_jp2G5dlOZxwnsdBtNeLNVuGyFejnuwoe0"
              />
            </div>

            {/* NotificationCards */}
            {/* Card: USA */}
            <div className="absolute top-[20%] left-[45%] z-40 group hidden md:block">
              <div className="bg-gradient-to-br from-[rgba(20,25,20,0.85)] to-[rgba(10,15,10,0.9)] backdrop-blur-md border border-[rgba(74,222,128,0.25)] shadow-[0_4px_20px_rgba(0,0,0,0.6),_inset_0_0_10px_rgba(74,222,128,0.05)] min-w-[200px] flex items-center p-3 rounded-xl">
                <div className="mr-3">
                  <div className="bg-black/50 rounded-full p-1 border border-[#4ADE80]/30">
                    <img alt="Logo" className="w-8 h-8 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4RMq1gh8wfTxFTHJ0BeGmBg2XsVHA4D_F7ACb83Kc-8s9ISUn6JCKpCinA1vZeu_HTFnKwDOq9jrCSCZTDVUVbL2fDB9tHypyzatZi0YnZdAI5Au6VfHvPOpaAsFrRI_ql99Ni441-5Npc-UKh_GryhPg2J8J7ozXSwnnRSsKTTG9VtqlKItun_qoudP4mh7iJ9acrfbEOiR42j3FEiQJk8TOPvPbMWJKp61KEP8fw5f75PY_oEButG4cW2XSMMIKdUTpZL2iW1E"/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white">Sale Approved!</span>
                    <img alt="USA Flag" className="rounded-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKxS2wEQqe4khKh0ycJJ6CDsGxv4aCdwnzZXZDgyqFK08RC51UYfIOtvWm6PnZBzaMrfbRjwVgUMpAscjRutgjnHvuJVVb6WGydBQILoV3sXGhuFjUOS5Rh63KJ_ygkexjQk6Bl7y905QARBQ9I6AjK7x_lvCR86ux-v6qtic4I4NF2aPihb4ItL6vv5N0PwXd5RLZaZwaPTdchum1Sb0j_R-FwFAak9sugNKtZGR8K1oboJ4tJxRBNJTblsUy4Jdf3LQoKBm1HFY" width="16"/>
                  </div>
                  <p className="text-[10px] text-gray-400">Your Commission <span className="text-white font-semibold">$150.00</span></p>
                </div>
              </div>
              <div className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80,_0_0_20px_#4ade80] -ml-2 mt-4 animate-pulse"></div>
            </div>

            {/* Card: Brazil */}
            <div className="absolute bottom-[20%] left-[55%] z-40 md:block">
              <div className="bg-gradient-to-br from-[rgba(20,25,20,0.85)] to-[rgba(10,15,10,0.9)] backdrop-blur-md border border-[rgba(74,222,128,0.25)] shadow-[0_4px_20px_rgba(0,0,0,0.6),_inset_0_0_10px_rgba(74,222,128,0.05)] min-w-[200px] flex items-center p-3 rounded-xl">
                <div className="mr-3">
                  <div className="bg-black/50 rounded-full p-1 border border-[#4ADE80]/30">
                    <img alt="Logo" className="w-8 h-8 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4RMq1gh8wfTxFTHJ0BeGmBg2XsVHA4D_F7ACb83Kc-8s9ISUn6JCKpCinA1vZeu_HTFnKwDOq9jrCSCZTDVUVbL2fDB9tHypyzatZi0YnZdAI5Au6VfHvPOpaAsFrRI_ql99Ni441-5Npc-UKh_GryhPg2J8J7ozXSwnnRSsKTTG9VtqlKItun_qoudP4mh7iJ9acrfbEOiR42j3FEiQJk8TOPvPbMWJKp61KEP8fw5f75PY_oEButG4cW2XSMMIKdUTpZL2iW1E"/>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white">Venda Aprovada!</span>
                    <img alt="Brazil Flag" className="rounded-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDF7tzfQa3-677prLiTEU5Ze4q_1dvq98LwAEIJpTd6wY-NFmwGm58LRNbqzdyWDVspCXMMEL5zZfVqwOJ4N0H88dnbgPjFWu2F4IDBEKne6WU-I1cWcW-nWU6PMZ9N5RtjIMZjFpT3uQ2tZlWkJnJUAU2UWnTpeXO_y9GUVUOCNQHkLeqS2hMMDHwh1ItQgoOZZOqhoLtVy24yhR0fKaPuQL2zasDeL-WGbQ11gdq5nFJV40g-DXhq7c7zYQUwVtFDMJrUlBoLOQ" width="16"/>
                  </div>
                  <p className="text-[10px] text-gray-400">Sua comissão <span className="text-white font-semibold">R$219,72</span></p>
                </div>
              </div>
              <div className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80,_0_0_20px_#4ade80] -ml-2 mt-4 animate-pulse"></div>
            </div>

            {/* Connector Lines SVG */}
            <svg className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 2px rgba(74, 222, 128, 0.8))' }}>
              <line stroke="rgba(74,222,128,0.4)" strokeWidth="1" x1="50%" x2="45%" y1="55%" y2="25%" />
              <line stroke="rgba(74,222,128,0.4)" strokeWidth="1" x1="50%" x2="55%" y1="55%" y2="80%" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default WhatsAppSection;
