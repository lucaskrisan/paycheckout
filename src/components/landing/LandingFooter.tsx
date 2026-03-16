import { Link } from "react-router-dom";
import panteraMascot from "@/assets/pantera-mascot.png";

const LandingFooter = () => (
  <footer className="relative z-10 border-t border-white/[0.04] py-12">
    <div className="container max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-2.5">
        <img src={panteraMascot} alt="" className="w-7 h-7" />
        <span className="text-sm font-bold text-zinc-500">
          Pantera<span className="text-emerald-400">Pay</span>
        </span>
      </div>
      <p className="text-[11px] text-zinc-700">
        © {new Date().getFullYear()} PanteraPay. Todos os direitos reservados.
      </p>
      <div className="flex items-center gap-6 text-[11px] text-zinc-600 uppercase tracking-wider font-medium">
        <Link to="/login" className="hover:text-white transition-colors duration-300">Entrar</Link>
        <Link to="/login?signup=true" className="hover:text-white transition-colors duration-300">Criar conta</Link>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
