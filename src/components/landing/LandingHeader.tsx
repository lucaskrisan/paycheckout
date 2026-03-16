import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingHeader = () => (
  <header className="relative z-50 backdrop-blur-2xl bg-[#0B0B0D]/60 sticky top-0 border-b border-white/[0.04]">
    <div className="container max-w-7xl mx-auto flex items-center justify-between px-6 h-[72px]">
      <div className="flex items-center gap-3">
        <img src={panteraMascot} alt="PanteraPay" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(0,230,118,0.4)]" />
        <span className="font-display font-extrabold text-xl tracking-tight">
          Pantera<span className="text-primary">Pay</span>
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[#9A9AA5]">
        <a href="#features" className="hover:text-white transition-colors duration-300 flex items-center gap-1">
          Recursos <ChevronDown className="w-3 h-3" />
        </a>
        <a href="#showcase" className="hover:text-white transition-colors duration-300 flex items-center gap-1">
          Plataforma <ChevronDown className="w-3 h-3" />
        </a>
        <a href="#all-features" className="hover:text-white transition-colors duration-300">Segurança</a>
        <a href="#cta" className="hover:text-white transition-colors duration-300">Contato</a>
      </nav>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/5 text-[13px] font-medium rounded-lg px-5">
            Entrar
          </Button>
        </Link>
        <Link to="/login?signup=true">
          <Button size="sm" className="bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-lg px-5 text-[13px] shadow-[0_0_25px_rgba(0,230,118,0.3)] hover:shadow-[0_0_40px_rgba(0,230,118,0.5)] transition-all duration-300">
            Criar Conta Grátis
          </Button>
        </Link>
      </div>
    </div>
  </header>
);

export default LandingHeader;
