import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingHeader = () => (
  <header className="relative z-50 border-b border-white/[0.04] backdrop-blur-2xl bg-[#050505]/70 sticky top-0">
    <div className="container max-w-7xl mx-auto flex items-center justify-between px-6 h-[72px]">
      <div className="flex items-center gap-3">
        <img src={panteraMascot} alt="PanteraPay" className="w-10 h-10 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
        <span className="font-extrabold text-xl tracking-tight">
          Pantera<span className="text-emerald-400">Pay</span>
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500 uppercase tracking-widest">
        <a href="#features" className="hover:text-white transition-colors duration-300">Recursos</a>
        <a href="#all-features" className="hover:text-white transition-colors duration-300">Plataforma</a>
        <a href="#cta" className="hover:text-white transition-colors duration-300">Começar</a>
      </nav>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white text-[13px] font-medium tracking-wide">
            Entrar
          </Button>
        </Link>
        <Link to="/login?signup=true">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full px-6 text-[13px] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300">
            Criar Conta
          </Button>
        </Link>
      </div>
    </div>
  </header>
);

export default LandingHeader;
