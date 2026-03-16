import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingHeader = () => (
  <header className="relative z-50 border-b border-white/[0.04] backdrop-blur-2xl bg-[#0B0B0D]/80 sticky top-0">
    <div className="container max-w-7xl mx-auto flex items-center justify-between px-6 h-[72px]">
      <div className="flex items-center gap-3">
        <img src={panteraMascot} alt="PanteraPay" className="w-9 h-9 drop-shadow-[0_0_12px_rgba(0,230,118,0.3)]" />
        <span className="font-display font-extrabold text-xl tracking-tight">
          Pantera<span className="text-primary">Pay</span>
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-[12px] font-medium text-[#6A6A75] uppercase tracking-[0.15em]">
        <a href="#features" className="hover:text-white transition-colors duration-300">Recursos</a>
        <a href="#all-features" className="hover:text-white transition-colors duration-300">Plataforma</a>
        <a href="#cta" className="hover:text-white transition-colors duration-300">Começar</a>
      </nav>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-[#6A6A75] hover:text-white text-[12px] font-medium tracking-wide">
            Entrar
          </Button>
        </Link>
        <Link to="/login?signup=true">
          <Button size="sm" className="bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-full px-6 text-[12px] shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_40px_rgba(0,230,118,0.5)] transition-all duration-300 group">
            Criar Conta Grátis
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  </header>
);

export default LandingHeader;
