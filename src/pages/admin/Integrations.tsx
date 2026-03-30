import AppSellIntegration from "@/components/admin/AppSellIntegration";
import { Webhook } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Integrations = () => {
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
        {/* Webhook card */}
        <button
          onClick={() => navigate("/admin/webhooks")}
          className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-white p-8 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-36"
        >
          <Webhook className="w-8 h-8 text-foreground/70 group-hover:text-primary transition-colors" />
          <span className="font-display font-bold text-foreground text-sm">Webhooks</span>
        </button>

        <AppSellIntegration />
      </div>
    </div>
  );
};

export default Integrations;
