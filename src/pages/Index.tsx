import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import OrderSummary from "@/components/checkout/OrderSummary";
import CustomerForm, { type CustomerData } from "@/components/checkout/CustomerForm";
import CreditCardForm, { type CreditCardData } from "@/components/checkout/CreditCardForm";
import PixPayment from "@/components/checkout/PixPayment";
import PaymentTabs from "@/components/checkout/PaymentTabs";
import CountdownTimer from "@/components/checkout/CountdownTimer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DEMO_ITEMS = [
  {
    name: "Curso Completo de Marketing Digital",
    description: "Acesso vitalício + bônus exclusivos",
    price: 197.0,
    originalPrice: 497.0,
    quantity: 1,
  },
];

interface ActiveGateway {
  provider: string;
  payment_methods: string[];
  config: Record<string, any>;
  environment: string;
}

const Index = () => {
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">("credit_card");
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode?: string; qrCodeUrl?: string; pixCode?: string } | null>(null);
  const [gateways, setGateways] = useState<ActiveGateway[]>([]);

  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });

  const [cardData, setCardData] = useState<CreditCardData>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    installments: "1",
  });

  useEffect(() => {
    supabase.from("active_gateways" as any).select("*").then(({ data }) => {
      if (data) {
        setGateways(data.map((g: any) => ({
          provider: g.provider,
          payment_methods: (g.payment_methods as string[]) || [],
          config: {},
          environment: g.environment,
        })));
      }
    });
  }, []);

  // Find the gateway for a payment method
  const getGatewayForMethod = (method: string): ActiveGateway | undefined => {
    return gateways.find((g) => g.payment_methods.includes(method));
  };

  const totalAmount = DEMO_ITEMS.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const pixDiscount = totalAmount * 0.05;
  const finalAmount = paymentMethod === "pix" ? totalAmount - pixDiscount : totalAmount;

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || !customer.cpf || !customer.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const gateway = getGatewayForMethod(paymentMethod);

    if (paymentMethod === "credit_card") {
      if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }

      if (gateway?.provider === "asaas") {
        setIsLoading(true);
        try {
          const [expMonth, expYear] = cardData.expiry.split("/");
          const { data, error } = await supabase.functions.invoke("create-asaas-payment", {
            body: {
              amount: finalAmount,
              payment_method: "credit_card",
              installments: cardData.installments,
              customer: {
                name: customer.name,
                email: customer.email,
                cpf: customer.cpf,
                phone: customer.phone,
                creditCard: {
                  holderName: cardData.name,
                  number: cardData.number.replace(/\s/g, ""),
                  expiryMonth: expMonth,
                  expiryYear: `20${expYear}`,
                  ccv: cardData.cvv,
                },
              },
            },
          });
          if (error) throw error;
          if (data?.status === "CONFIRMED" || data?.status === "RECEIVED" || data?.status === "PENDING") {
            toast.success("Pagamento processado! Redirecionando...");
          } else {
            toast.error("Pagamento não aprovado. Tente novamente.");
          }
        } catch (err: any) {
          console.error("Credit card error:", err);
          toast.error(err.message || "Erro ao processar pagamento.");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Fallback for no gateway
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        toast.success("Pagamento aprovado! Redirecionando...");
      }, 2000);
      return;
    }

    // PIX payment
    setIsLoading(true);
    try {
      let data, error;

      if (gateway?.provider === "asaas") {
        ({ data, error } = await supabase.functions.invoke("create-asaas-payment", {
          body: {
            amount: finalAmount,
            payment_method: "pix",
            gateway_config: { ...gateway.config, environment: gateway.environment },
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpf,
              phone: customer.phone,
            },
          },
        }));
      } else {
        // Pagar.me fallback
        ({ data, error } = await supabase.functions.invoke("create-pix-payment", {
          body: {
            amount: finalAmount,
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpf,
              phone: customer.phone,
            },
          },
        }));
      }

      if (error) throw error;

      if (data?.qr_code_url || data?.qr_code) {
        setPixData({
          qrCodeUrl: data.qr_code_url,
          pixCode: data.qr_code,
        });
        toast.success("PIX gerado! Escaneie o QR Code para pagar.");
      } else {
        throw new Error("Falha ao gerar o PIX");
      }
    } catch (err: any) {
      console.error("PIX error:", err);
      toast.error(err.message || "Erro ao gerar PIX. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">

      {/* Top trust bar */}
      <div className="bg-checkout-surface text-checkout-surface-foreground py-2.5">
        <div className="container max-w-5xl mx-auto flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-checkout-highlight" />
            <span>Checkout Seguro</span>
          </div>
          <span className="text-checkout-muted">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-checkout-highlight" />
            <span>Ambiente Protegido</span>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-6 lg:py-10">
        <CountdownTimer minutes={15} />

        <div className="mt-6 grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Form section */}
          <motion.div
            className="lg:col-span-3 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <CustomerForm data={customer} onChange={setCustomer} />
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-foreground">Forma de pagamento</h2>
              <PaymentTabs activeMethod={paymentMethod} onMethodChange={setPaymentMethod} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={paymentMethod}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {paymentMethod === "credit_card" ? (
                    <CreditCardForm data={cardData} onChange={setCardData} totalAmount={finalAmount} />
                  ) : (
                    <PixPayment totalAmount={finalAmount} qrCodeData={pixData?.qrCodeUrl} pixCode={pixData?.pixCode} />
                  )}
                </motion.div>
              </AnimatePresence>

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-14 text-base font-display font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {paymentMethod === "credit_card" ? "Finalizar Pagamento" : "Gerar PIX"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Ao continuar, você concorda com os{" "}
                <a href="#" className="underline">termos de uso</a> e{" "}
                <a href="#" className="underline">política de privacidade</a>.
              </p>
            </div>
          </motion.div>

          {/* Order summary */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="lg:sticky lg:top-6">
              <OrderSummary
                items={DEMO_ITEMS}
                discount={paymentMethod === "pix" ? pixDiscount : 0}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
