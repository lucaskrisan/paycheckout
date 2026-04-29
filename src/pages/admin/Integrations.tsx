import { useEffect, lazy, Suspense } from "react";
import webhookLogo from "@/assets/webhook-logo.png";
import appsellCardLogo from "@/assets/appsell-logo.png";
import utmifyLogo from "@/assets/utmify-logo.png";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load integration components to speed up initial route mount
const AppSellIntegration = lazy(() => import("@/components/admin/AppSellIntegration"));
const UtmifyIntegration = lazy(() => import("@/components/admin/UtmifyIntegration"));

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte plataformas externas para automatizar a entrega e gestão dos seus produtos
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        <button
          onClick={() => navigate("/admin/webhooks")}
          className="group relative flex items-center justify-center rounded-xl border border-border/40 bg-white p-10 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-40"
        >
          <img src={webhookLogo} alt="Webhooks" width={220} height={80} loading="eager" decoding="async" className="max-h-20 max-w-[220px] object-contain" />
        </button>

        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <AppSellIntegration />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <UtmifyIntegration />
        </Suspense>
      </div>
    </div>
  );
};

export default Integrations;
