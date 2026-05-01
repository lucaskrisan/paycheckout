import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Star, Shield, Zap } from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";

declare global {
  interface Window {
    goToCheckout: (configId: string) => void;
  }
}

const Caderno21 = () => {
  const [searchParams] = useSearchParams();
  const variant = searchParams.get("v") || "1";

  // IDs dos checkouts baseados na configuração do Teste A/B
  const checkoutConfigs = {
    "1": {
      primary: "026fa7ef-280c-4294-a096-839e82f3f492", // R$ 47
      secondary: "08b61f09-1a87-4ef9-ac33-4e6fd743ffd7", // R$ 67
      prices: { primary: "47", secondary: "67" }
    },
    "2": {
      primary: "a2514eac-c2ed-498b-8812-edce0c513958", // R$ 67
      secondary: "415ff4b9-1655-4192-b5f9-2f3e533a4466", // R$ 97
      prices: { primary: "67", secondary: "97" }
    },
    "3": {
      primary: "dea3dd93-de65-412f-9856-dda2616641bb", // R$ 97
      secondary: "43fc5ad1-8fc4-4389-bb14-eda7b3735e87", // R$ 117
      prices: { primary: "97", secondary: "117" }
    }
  };

  const current = checkoutConfigs[variant as keyof typeof checkoutConfigs] || checkoutConfigs["1"];

  const handleCheckout = (configId: string) => {
    if (window.goToCheckout) {
      window.goToCheckout(configId);
    } else {
      // Fallback caso o script ainda não tenha carregado
      window.location.href = `/checkout/2a9a224d-2720-46bf-8902-e41b35dbf35f?config=${configId}`;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader />
      
      <main className="container max-w-4xl mx-auto px-6 py-20 lg:py-32">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-primary text-sm font-bold">
            <Star className="w-4 h-4 fill-primary" />
            Vagas Limitadas — Oferta Especial
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Caderno de Exercícios: <br />
            <span className="text-primary">21 Dias contra o Autoabandono</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Um guia prático e profundo para você retomar o controle da sua vida, 
            curar feridas emocionais e parar de se deixar para depois.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="bg-card border border-border rounded-3xl p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">O que você vai receber:</h2>
              <p className="text-sm text-muted-foreground">Conteúdo completo para sua transformação.</p>
            </div>
            
            <ul className="space-y-4">
              {[
                "21 dias de exercícios guiados",
                "Áudios de meditação e foco",
                "Comunidade exclusiva de alunos",
                "Suporte direto para dúvidas",
                "Certificado de conclusão",
                "Acesso vitalício ao material"
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 bg-primary/20 rounded-full p-1">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primary/5 border-2 border-primary/20 rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-widest text-primary">Oferta de Hoje</span>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase">Economize 60%</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-black">R$ {current.prices.primary}</span>
                <span className="text-muted-foreground line-through text-lg">R$ 197</span>
              </div>
              <p className="text-sm text-muted-foreground">Pagamento único. Acesso imediato.</p>
            </div>

            <Button 
              size="lg" 
              className="w-full h-16 text-lg font-bold mt-8 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
              onClick={() => handleCheckout(current.primary)}
            >
              QUERO COMEÇAR AGORA
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <div className="flex items-center justify-center gap-4 mt-6 grayscale opacity-50">
              <Shield className="w-4 h-4" />
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Compra 100% Segura</span>
            </div>
          </div>
        </div>

        {/* Second Option (Upsell or Alternative) */}
        <div className="max-w-2xl mx-auto border border-dashed border-border rounded-2xl p-6 text-center">
          <p className="text-sm font-medium mb-4">Deseja incluir o Acompanhamento VIP?</p>
          <Button 
            variant="outline" 
            className="w-full md:w-auto px-10"
            onClick={() => handleCheckout(current.secondary)}
          >
            Levar com Acompanhamento por apenas R$ {current.prices.secondary}
          </Button>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Caderno21;
