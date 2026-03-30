import AppSellIntegration from "@/components/admin/AppSellIntegration";
import { Plug } from "lucide-react";

const Integrations = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte plataformas externas para automatizar a entrega e gestão dos seus produtos
        </p>
      </div>

      {/* Plataformas de Entrega */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-1">
          <Plug className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">Plataformas de Entrega</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppSellIntegration />
        </div>
      </section>
    </div>
  );
};

export default Integrations;
