import { Link } from "react-router-dom";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingFooter = () => (
  <footer className="relative z-10 border-t border-white/[0.04] py-14">
    <div className="container max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-2.5">
        <img src={panteraMascot} alt="" className="w-7 h-7" />
        <span className="text-sm font-bold text-[#6A6A75]">
          Pantera<span className="text-primary">Pay</span>
        </span>
      </div>
      <p className="text-[11px] text-[#3A3A40]">
        © {new Date().getFullYear()} PanteraPay · Move money like a predator.
      </p>
      <div className="flex items-center gap-6 text-[11px] text-[#6A6A75] uppercase tracking-wider font-medium">
        <Link to="/privacidade" className="hover:text-primary transition-colors duration-300">Privacidade</Link>
        <Link to="/termos" className="hover:text-primary transition-colors duration-300">Termos</Link>
        <Link to="/login" className="hover:text-primary transition-colors duration-300">Entrar</Link>
        <Link to="/login?signup=true" className="hover:text-primary transition-colors duration-300">Criar conta grátis</Link>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
