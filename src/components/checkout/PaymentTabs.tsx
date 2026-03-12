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
    <div className="flex gap-0 rounded-lg overflow-hidden border border-[#D5D9D9]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onMethodChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all",
            activeMethod === tab.id
              ? "bg-white text-[#0F1111] border-2 border-[#007185] rounded-lg shadow-sm z-10"
              : "bg-[#F7FAFA] text-[#565959] hover:text-[#0F1111]"
          )}
        >
          <tab.icon className="w-4 h-4" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PaymentTabs;
