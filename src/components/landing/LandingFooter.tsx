import { Link } from "react-router-dom";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingFooter = () => (
  <footer className="relative z-10 border-t border-white/[0.06] bg-[#09090b] py-16">
    <div className="container max-w-7xl mx-auto px-6">
      {/* Top row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
        <div className="flex items-center gap-3">
          <img src={panteraMascot} alt="PanteraPay" className="w-8 h-8" />
          <span className="text-base font-bold text-foreground">
            Pantera<span className="text-primary">Pay</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          <Link to="/privacidade" className="text-muted-foreground hover:text-primary transition-colors duration-300">
            Política de Privacidade
          </Link>
          <Link to="/termos" className="text-muted-foreground hover:text-primary transition-colors duration-300">
            Termos de Serviço
          </Link>
          <Link to="/cookies" className="text-muted-foreground hover:text-primary transition-colors duration-300">
            Cookies
          </Link>
          <Link to="/isencao-financeira" className="text-muted-foreground hover:text-primary transition-colors duration-300">
            Isenção Financeira
          </Link>
          <Link to="/produtos-proibidos" className="text-muted-foreground hover:text-primary transition-colors duration-300">
            Produtos Proibidos
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-8" />

      {/* Bottom row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} PanteraPay · Move money like a predator.
        </p>
        <div className="flex items-center gap-6 text-xs">
          <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors duration-300">
            Entrar
          </Link>
          <Link to="/login?signup=true" className="text-primary font-semibold hover:text-primary/80 transition-colors duration-300">
            Criar conta grátis
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
