import { useEffect } from "react";
import AppSellIntegration from "@/components/admin/AppSellIntegration";
import UtmifyIntegration from "@/components/admin/UtmifyIntegration";
import webhookLogo from "@/assets/webhook-logo.png";
import appsellCardLogo from "@/assets/appsell-logo.png";
import utmifyLogo from "@/assets/utmify-logo.png";
import { useNavigate } from "react-router-dom";
import { Code2 } from "lucide-react";

const PRELOAD_ICONS = [webhookLogo, appsellCardLogo, utmifyLogo];

const Integrations = () => {
  useEffect(() => {
    PRELOAD_ICONS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte plataformas externas para automatizar a entrega e gestão dos seus produtos
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Script de Rastreamento — entrada principal */}
        <button
          onClick={() => navigate("/admin/integrations/landing-script")}
          className="group relative flex flex-col items-start justify-between rounded-xl border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-slate-50 to-slate-50 p-6 text-left transition-all hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer h-40"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/15">
              <Code2 className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Essencial</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Script de Rastreamento</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Cole na sua landing page. Dispara Pixel + CAPI, captura UTMs e propaga tudo até o checkout — sem precisar configurar mais nada.
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/admin/webhooks")}
          className="group relative flex items-center justify-center rounded-xl border border-border/40 bg-white p-10 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-40"
        >
          <img src={webhookLogo} alt="Webhooks" width={220} height={80} loading="eager" decoding="async" className="max-h-20 max-w-[220px] object-contain" />
        </button>

        <AppSellIntegration />
        <UtmifyIntegration />
      </div>
    </div>
  );
};

export default Integrations;
