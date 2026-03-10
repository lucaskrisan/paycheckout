import { CreditCard, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PaymentMethod = 'credit_card' | 'pix';

interface PaymentTabsProps {
  activeMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}

const PaymentTabs = ({ activeMethod, onMethodChange }: PaymentTabsProps) => {
  const tabs = [
    { id: 'credit_card' as const, label: 'Cartão de Crédito', icon: CreditCard },
    { id: 'pix' as const, label: 'PIX', icon: QrCode, badge: '5% OFF' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onMethodChange(tab.id)}
          className={cn(
            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
            activeMethod === tab.id
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-muted-foreground/30"
          )}
        >
          {activeMethod === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 border-2 border-primary rounded-xl"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <tab.icon className={cn(
            "w-5 h-5",
            activeMethod === tab.id ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-xs font-semibold",
            activeMethod === tab.id ? "text-foreground" : "text-muted-foreground"
          )}>
            {tab.label}
          </span>
          {tab.badge && (
            <span className="absolute -top-2 -right-2 bg-checkout-badge text-checkout-surface text-[10px] font-bold px-2 py-0.5 rounded-full">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default PaymentTabs;
