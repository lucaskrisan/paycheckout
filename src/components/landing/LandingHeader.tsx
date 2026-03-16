import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingHeader = () => (
  <header className="relative z-50 border-b border-border/30 backdrop-blur-2xl bg-[#0B0B0D]/70 sticky top-0">
    <div className="container max-w-7xl mx-auto flex items-center justify-between px-6 h-[72px]">
      <div className="flex items-center gap-3">
        <img src={panteraMascot} alt="PanteraPay" className="w-10 h-10 drop-shadow-[0_0_12px_rgba(0,230,118,0.3)]" />
        <span className="font-display font-extrabold text-xl tracking-tight">
          Pantera<span className="text-primary">Pay</span>
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-muted-foreground uppercase tracking-widest">
        <a href="#features" className="hover:text-foreground transition-colors duration-300">Recursos</a>
        <a href="#all-features" className="hover:text-foreground transition-colors duration-300">Plataforma</a>
        <a href="#cta" className="hover:text-foreground transition-colors duration-300">Começar</a>
      </nav>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[13px] font-medium tracking-wide">
            Entrar
          </Button>
        </Link>
        <Link to="/login?signup=true">
          <Button size="sm" className="bg-primary hover:bg-[#00C853] text-primary-foreground font-bold rounded-full px-6 text-[13px] shadow-[0_0_20px_rgba(0,230,118,0.3)] hover:shadow-[0_0_30px_rgba(0,230,118,0.5)] transition-all duration-300">
            Criar Conta
          </Button>
        </Link>
      </div>
    </div>
  </header>
);

export default LandingHeader;
