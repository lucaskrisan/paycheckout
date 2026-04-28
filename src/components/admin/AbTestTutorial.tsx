import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  MousePointer2, 
  Zap, 
  Settings2, 
  ChevronRight, 
  ChevronLeft,
  MousePointerSquareDashed,
  Workflow
} from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const steps: Step[] = [
  {
    title: "Bem-vindo ao Editor de Teste A/B",
    description: "Aqui você constrói seu funil de vendas visualmente. Arraste elementos da paleta para começar a montar sua estratégia.",
    icon: <Workflow className="h-8 w-8" />,
    color: "#3b82f6"
  },
  {
    title: "Monte seu Fluxo",
    description: "Arraste 'Página de Vendas' e 'Checkout' para o canvas. Conecte os blocos clicando e puxando as bolinhas laterais para definir o caminho do seu cliente.",
    icon: <MousePointerSquareDashed className="h-8 w-8" />,
    color: "#a855f7"
  },
  {
    title: "Configure as Variantes",
    description: "Clique em cada bloco para abrir o painel lateral. Insira a URL real da sua LP e selecione o produto no checkout. Você também pode ativar Pixels Espelho aqui.",
    icon: <Settings2 className="h-8 w-8" />,
    color: "#10b981"
  },
  {
    title: "Otimização Inteligente",
    description: "No bloco inicial, você pode ativar o 'Vencedor Automático'. O sistema monitora as conversões e escolhe a melhor página para você sozinho.",
    icon: <Zap className="h-8 w-8" />,
    color: "#f59e0b"
  },
  {
    title: "Pronto para Escalar",
    description: "Salve seu teste para gerar a URL de Entrada. Use essa URL nos seus anúncios e acompanhe as métricas em tempo real na barra lateral.",
    icon: <BarChart3 className="h-8 w-8" />,
    color: "#f97316"
  }
];

export function AbTestTutorial({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0d0f15] border-border/40 text-white">
        <DialogHeader>
          <div className="flex justify-center mb-6">
            <div 
              className="h-20 w-20 rounded-2xl flex items-center justify-center animate-pulse shadow-2xl"
              style={{ background: `${step.color}22`, color: step.color, border: `1px solid ${step.color}44` }}
            >
              {step.icon}
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400 text-base leading-relaxed">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 mt-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8' : 'w-2 bg-zinc-800'}`}
              style={{ backgroundColor: i === currentStep ? step.color : undefined }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-10">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            disabled={currentStep === 0}
            className="text-zinc-500 hover:text-white"
          >
            {currentStep > 0 && <ChevronLeft className="h-4 w-4 mr-2" />}
            {currentStep > 0 ? "Anterior" : ""}
          </Button>
          <Button 
            onClick={handleNext}
            style={{ backgroundColor: step.color }}
            className="px-8 hover:brightness-110 transition-all text-white border-0"
          >
            {currentStep === steps.length - 1 ? "Começar Agora" : "Próximo"}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
