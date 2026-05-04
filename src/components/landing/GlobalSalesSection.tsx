import { motion } from "framer-motion";
import LandingHeader from "./LandingHeader";

const GlobalSalesSection = () => {
  return (
    <>
    <LandingHeader />
    <section id="global-sales" className="relative min-h-screen flex flex-col items-center justify-start pt-32 px-4 overflow-hidden bg-[#050505] text-white font-sans">
      {/* Top-right radial glow effect */}
      <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-[radial-gradient(circle,_rgba(74,222,128,0.2)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none z-1" />

      {/* HeaderText */}
      <div className="relative z-20 text-center max-w-4xl mx-auto mb-12">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          Conquiste o Mundo com a <span className="text-[#4ADE80]">Panttera</span>
        </h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          Com a Panttera, seus produtos chegam a mais de 180 países. Nós processamos os pagamentos, cuidamos do compliance local, sem fronteiras.
        </p>
      </div>

      {/* MainVisualArea */}
      <div className="relative w-full max-w-7xl h-[600px] mt-8">
        {/* Black Panther Asset */}
        <div className="absolute left-[-15%] lg:left-[-12%] bottom-0 w-[65%] lg:w-[50%] z-30 pointer-events-none">
          <img 
            alt="Majestic Black Panther" 
            className="w-full h-auto object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDWb_6uJjr5EwGLvgiBED8SGwiuBTXmkvj2Uds63aVbx08ohlOuCKxS9468RSE6Sju9UyEf_gDYb5yC1oZ9ETmCCvJaGmATaRvdKEEE0tXWXSWFcPvwO_u9hDmI0UUvdCQwSfSOl8lPn0p_yUopTJZB_6g1fqr7S5eV0aXMIRvxczJarswLMOEGXaw2LoGKPHmCi19w0jlFybATWKQ96XulmyPgLRh2VWHgmDjt4ACD_V-2baDAphbd1_YWQ0ae_pnwc8e0b1iy4s"
          />
        </div>

        {/* World Map Background Asset */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full lg:w-[85%] h-full z-10 opacity-60">
          <img 
            alt="Global Network Map" 
            className="w-full h-full object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlkA1n2z490ertV7ECMS3dQn8JfgTRdLEqIttIyDmNe_19X_Yg6sQOheVH5kiGJqZjhvdnuZ2EiUU9m7lUK_v6WPuJxGfHCMyAz6llxDlDn4fmiD4wasUZqCZrM9QZOtyId7oUdn8OlbpKzHPUz9UTmi8VzJTctub_q9bgzYfS4IEFEII7zlcGZjgGcuxn957UKhF-uMoqt2GuqfC396Oug__N1dSIbFndEQAbax5ER_jp2G5dlOZxwnsdBtNeLNVuGyFejnuwoe0"
          />
        </div>

        {/* NotificationCards */}
        {/* Card: USA */}
        <div className="absolute top-[25%] left-[45%] z-40 group">
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

        {/* Card: Russia */}
        <div className="absolute top-[10%] left-[65%] z-40">
          <div className="bg-gradient-to-br from-[rgba(20,25,20,0.85)] to-[rgba(10,15,10,0.9)] backdrop-blur-md border border-[rgba(74,222,128,0.25)] shadow-[0_4px_20px_rgba(0,0,0,0.6),_inset_0_0_10px_rgba(74,222,128,0.05)] min-w-[200px] flex items-center p-3 rounded-xl">
            <div className="mr-3">
              <div className="bg-black/50 rounded-full p-1 border border-[#4ADE80]/30">
                <img alt="Logo" className="w-8 h-8 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4RMq1gh8wfTxFTHJ0BeGmBg2XsVHA4D_F7ACb83Kc-8s9ISUn6JCKpCinA1vZeu_HTFnKwDOq9jrCSCZTDVUVbL2fDB9tHypyzatZi0YnZdAI5Au6VfHvPOpaAsFrRI_ql99Ni441-5Npc-UKh_GryhPg2J8J7ozXSwnnRSsKTTG9VtqlKItun_qoudP4mh7iJ9acrfbEOiR42j3FEiQJk8TOPvPbMWJKp61KEP8fw5f75PY_oEButG4cW2XSMMIKdUTpZL2iW1E"/>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-white">Продажа одобрена!</span>
                <img alt="Russia Flag" className="rounded-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGd276CyN9HNSSaLqEeWEflifmO9D6Qkcj2o6YKsRrFP2GaMvm0eb9Cwp0R2gPfAkzFbqFD8XBlaB73DO6YVuwd4nLAxb72mzqib6AUDHMpgauDEaQe6y75PytGdi6Q9Lbg4PfEZPZepz_a8LexKXcROvEarj7nxFkM2_t6eonioB_CMmoT-QYZtUBhah5naC6AzEBT5hVm3IGosc7mv64LB3_85KgAo02la3Tx1301jQKqXCX68VMo7XxRkfMPl5IpySowvkJG_o" width="16"/>
              </div>
              <p className="text-[10px] text-gray-400">Ваша комиссия <span className="text-white font-semibold">₽14,750</span></p>
            </div>
          </div>
          <div className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80,_0_0_20px_#4ade80] -ml-2 mt-4 animate-pulse"></div>
        </div>

        {/* Card: Japan */}
        <div className="absolute top-[45%] left-[75%] z-40">
          <div className="bg-gradient-to-br from-[rgba(20,25,20,0.85)] to-[rgba(10,15,10,0.9)] backdrop-blur-md border border-[rgba(74,222,128,0.25)] shadow-[0_4px_20px_rgba(0,0,0,0.6),_inset_0_0_10px_rgba(74,222,128,0.05)] min-w-[200px] flex items-center p-3 rounded-xl">
            <div className="mr-3">
              <div className="bg-black/50 rounded-full p-1 border border-[#4ADE80]/30">
                <img alt="Logo" className="w-8 h-8 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4RMq1gh8wfTxFTHJ0BeGmBg2XsVHA4D_F7ACb83Kc-8s9ISUn6JCKpCinA1vZeu_HTFnKwDOq9jrCSCZTDVUVbL2fDB9tHypyzatZi0YnZdAI5Au6VfHvPOpaAsFrRI_ql99Ni441-5Npc-UKh_GryhPg2J8J7ozXSwnnRSsKTTG9VtqlKItun_qoudP4mh7iJ9acrfbEOiR42j3FEiQJk8TOPvPbMWJKp61KEP8fw5f75PY_oEButG4cW2XSMMIKdUTpZL2iW1E"/>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-white">販売承認済み!</span>
                <img alt="Japan Flag" className="rounded-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAppOa9QBb91IKlqI-wRWljPG5LqIEykdKyyH4GpAcB3WhlhThEVaGX-ovFUXNb9QEiU5nNLMyUls6BKKPlQ5vtzHlqWoBjNhLnb4iafmIOsWqf7fHCGFvUNbp8DGre5LP91azcbaZlOK7BKejCe-fMPIP_1S5-w8UxcEWyc4wgoKGkK8ET7Ng0Zf2OeXB2KvS6zwh771j3pvst_njrVH2BzK1fTN3cV175ye58AgaRFZJriAU93qz__REvPuZdhXUVhRVlmR1TnRg" width="16"/>
              </div>
              <p className="text-[10px] text-gray-400">あなたのコミッション <span className="text-white font-semibold">¥25,500</span></p>
            </div>
          </div>
          <div className="w-2 h-2 bg-[#4ade80] rounded-full shadow-[0_0_10px_#4ade80,_0_0_20px_#4ade80] -ml-2 mt-4 animate-pulse"></div>
        </div>

        {/* Card: Brazil */}
        <div className="absolute bottom-[10%] left-[55%] z-40">
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
          <line stroke="rgba(74,222,128,0.4)" strokeWidth="1" x1="50%" x2="65%" y1="55%" y2="10%" />
          <line stroke="rgba(74,222,128,0.4)" strokeWidth="1" x1="50%" x2="75%" y1="55%" y2="45%" />
          <line stroke="rgba(74,222,128,0.4)" strokeWidth="1" x1="50%" x2="55%" y1="55%" y2="90%" />
        </svg>
      </div>
    </section>
    </>
  );
};

export default GlobalSalesSection;