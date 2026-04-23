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
          className="group relative flex flex-col items-start justify-between rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 text-left transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 cursor-pointer h-40"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/15">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Essencial</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Script de Rastreamento</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Clique aqui para abrir, copiar e colar na landing page. Esse é o script único que dispara Pixel + CAPI, captura UTMs e propaga tudo até o checkout.
            </p>
          </div>
          <div className="text-xs font-semibold text-primary">Abrir script para copiar →</div>
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
