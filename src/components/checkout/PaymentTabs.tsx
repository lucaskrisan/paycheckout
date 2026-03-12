import { CreditCard, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentMethod = "credit_card" | "pix";

interface PaymentTabsProps {
  activeMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}

const PaymentTabs = ({ activeMethod, onMethodChange }: PaymentTabsProps) => {
  const tabs = [
    { id: "credit_card" as const, label: "Cartão", icon: CreditCard },
    { id: "pix" as const, label: "Pix", icon: Diamond },
  ];

  return (
    <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onMethodChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative",
            activeMethod === tab.id
              ? "bg-card text-foreground border-2 border-primary rounded-lg shadow-sm z-10"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          )}
        >
          {activeMethod === tab.id && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-[10px]">✓</span>
            </span>
          )}
          <tab.icon className="w-4 h-4" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PaymentTabs;
