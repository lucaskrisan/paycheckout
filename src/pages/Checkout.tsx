import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, ArrowRight, Loader2, QrCode, Award, Star, ListOrdered } from "lucide-react";
import OrderSummary from "@/components/checkout/OrderSummary";
import CustomerForm, { type CustomerData } from "@/components/checkout/CustomerForm";
import PixPayment from "@/components/checkout/PixPayment";
import CreditCardForm, { type CreditCardData } from "@/components/checkout/CreditCardForm";
import PaymentTabs from "@/components/checkout/PaymentTabs";
import CountdownTimer from "@/components/checkout/CountdownTimer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { Checkbox } from "@/components/ui/checkbox";
import type { BuilderComponent } from "@/components/checkout-builder/types";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_subscription: boolean;
  billing_cycle: string;
}

interface OrderBump {
  id: string;
  call_to_action: string;
  title: string;
  description: string;
  use_product_image: boolean;
  bump_product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

const Checkout = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeUrl?: string; pixCode?: string } | null>(null);
  const { trackPurchase, trackAddPaymentInfo, trackLead, setAdvancedMatching } = useFacebookPixel(productId);
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [builderLayout, setBuilderLayout] = useState<BuilderComponent[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');

  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });

  const [creditCard, setCreditCard] = useState<CreditCardData>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
    installments: "1",
  });

  useEffect(() => {
    if (!productId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const loadCheckoutData = async () => {
      setLoading(true);

      const [productRes, orderBumpsRes, builderRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("active", true)
          .single(),
        supabase
          .from("order_bumps")
          .select("id, call_to_action, title, description, use_product_image, bump_product:products!order_bumps_bump_product_id_fkey(id, name, price, image_url)")
          .eq("product_id", productId)
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("checkout_builder_configs")
          .select("layout")
          .eq("product_id", productId)
          .eq("is_default", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (productRes.error || !productRes.data) {
        setNotFound(true);
      } else {
        setProduct(productRes.data as any);
        // Force credit card for subscription products
        if ((productRes.data as any).is_subscription) {
          setPaymentMethod('credit_card');
        }
      }

      if (orderBumpsRes.data) {
        setOrderBumps(orderBumpsRes.data as any);
      }

      const layout = (builderRes.data?.layout as unknown as BuilderComponent[] | null) ?? [];
      setBuilderLayout(Array.isArray(layout) ? layout : []);

      setLoading(false);
    };

    loadCheckoutData();
  }, [productId]);

  const toggleBump = (bumpId: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(bumpId)) next.delete(bumpId);
      else next.add(bumpId);
      return next;
    });
  };

  const sortedLayout = useMemo(
    () => [...builderLayout].sort((a, b) => a.order - b.order),
    [builderLayout]
  );

  const headerTitle = sortedLayout.find((c) => c.type === "header")?.props?.title || product?.name;
  const countdownMinutes = Number(sortedLayout.find((c) => c.type === "countdown")?.props?.minutes || 15);
  const submitLabel = sortedLayout.find((c) => c.type === "button")?.props?.text || "Gerar PIX";

  const renderCustomComponent = (component: BuilderComponent) => {
    switch (component.type) {
      case "text":
        return <p className="text-foreground whitespace-pre-line">{component.props.content}</p>;
      case "image":
        return component.props.url ? <img src={component.props.url} alt="Imagem do checkout" className="w-full rounded-xl object-cover" /> : null;
      case "header":
        return <h1 className="font-display text-2xl font-bold text-foreground">{component.props.title || product?.name}</h1>;
      case "advantages":
      case "list":
        return (
          <ul className="space-y-2">
            {(component.props.items || []).map((item: string, i: number) => (
              <li key={`${component.id}-${i}`} className="flex items-center gap-2 text-sm text-foreground">
                <ListOrdered className="w-4 h-4 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      case "testimonial":
        return (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-primary fill-primary" />)}</div>
            <p className="text-sm text-foreground italic">"{component.props.text}"</p>
            <p className="mt-1 text-xs text-muted-foreground">— {component.props.author}</p>
          </div>
        );
      case "seal":
        return (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
            <Award className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{component.props.title}</p>
              <p className="text-xs text-muted-foreground">{component.props.subtitle}</p>
            </div>
          </div>
        );
      case "video":
        return component.props.url ? <iframe src={component.props.url.replace("watch?v=", "embed/")} className="w-full h-64 rounded-xl border border-border" allowFullScreen title="Vídeo" /> : null;
      default:
        return null;
    }
  };

  // Send Advanced Matching data whenever customer info changes
  useEffect(() => {
    if (customer.name && customer.email) {
      setAdvancedMatching(customer);
      trackLead();
    }
  }, [customer.name, customer.email, customer.phone, customer.cpf, setAdvancedMatching, trackLead]);

  // Track payment method selection
  useEffect(() => {
    trackAddPaymentInfo(paymentMethod);
  }, [paymentMethod, trackAddPaymentInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-foreground">Produto não encontrado</h1>
          <p className="text-muted-foreground">Este produto não existe ou não está disponível.</p>
        </div>
      </div>
    );
  }

  const bumpTotal = orderBumps
    .filter((b) => selectedBumps.has(b.id))
    .reduce((sum, b) => sum + (b.bump_product?.price || 0), 0);

  const pixDiscount = paymentMethod === 'pix' ? product.price * 0.05 : 0;
  const frontEndAmount = product.price - pixDiscount; // Valor do produto principal (para tracking)
  const finalAmount = frontEndAmount + bumpTotal; // Valor total cobrado (com bumps)

  const items = [
    {
      name: product.name,
      description: product.description || undefined,
      price: product.price,
      originalPrice: product.original_price || undefined,
      quantity: 1,
      image: product.image_url || undefined,
    },
    ...orderBumps
      .filter((b) => selectedBumps.has(b.id))
      .map((b) => ({
        name: b.bump_product.name,
        price: b.bump_product.price,
        quantity: 1,
        image: b.bump_product.image_url || undefined,
      })),
  ];

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || !customer.cpf || !customer.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (paymentMethod === 'credit_card') {
      if (!creditCard.number || !creditCard.name || !creditCard.expiry || !creditCard.cvv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (paymentMethod === 'pix') {
        // PIX via Pagar.me
        const { data, error } = await supabase.functions.invoke("create-pix-payment", {
          body: {
            amount: finalAmount,
            product_id: product.id,
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpf,
              phone: customer.phone,
            },
          },
        });

        if (error) throw error;

        if (data?.qr_code_url || data?.qr_code) {
          setPixData({ qrCodeUrl: data.qr_code_url, pixCode: data.qr_code });
          toast.success("PIX gerado! Escaneie o QR Code para pagar.");
          trackPurchase(frontEndAmount);
        } else {
          throw new Error("Falha ao gerar o PIX");
        }
      } else {
        // Cartão de crédito via Asaas
        const [expMonth, expYear] = creditCard.expiry.split('/');
        const { data, error } = await supabase.functions.invoke("create-asaas-payment", {
          body: {
            amount: finalAmount,
            product_id: product.id,
            payment_method: 'credit_card',
            installments: creditCard.installments,
            is_subscription: product.is_subscription,
            billing_cycle: product.billing_cycle,
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpf,
              phone: customer.phone,
              creditCard: {
                holderName: creditCard.name,
                number: creditCard.number.replace(/\s/g, ''),
                expiryMonth: expMonth,
                expiryYear: `20${expYear}`,
                ccv: creditCard.cvv,
              },
            },
          },
        });

        if (error) throw error;

        if (data?.payment_id) {
          toast.success("Pagamento processado com sucesso!");
          trackPurchase(frontEndAmount);
        } else {
          throw new Error("Falha ao processar pagamento");
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <CountdownTimer minutes={countdownMinutes} />

        {sortedLayout.filter((c) => c.zone === "top").length > 0 && (
          <div className="mt-6 space-y-4">
            {sortedLayout
              .filter((c) => c.zone === "top")
              .map((component) => (
                <div key={component.id} className="rounded-xl border border-border bg-card p-4">
                  {renderCustomComponent(component)}
                </div>
              ))}
          </div>
        )}

        <div className="mt-6 grid lg:grid-cols-5 gap-6 lg:gap-8">
          <motion.div
            className="lg:col-span-3 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {product.image_url && (
              <div className="rounded-2xl overflow-hidden border border-border bg-card">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-auto max-h-[280px] sm:max-h-[360px] object-cover"
                  loading="eager"
                />
              </div>
            )}
            <h1 className="font-display text-2xl font-bold text-foreground">{headerTitle}</h1>

            {sortedLayout
              .filter((c) => c.zone === "left" && !["form", "button", "countdown", "facebook"].includes(c.type))
              .map((component) => (
                <div key={component.id} className="rounded-xl border border-border bg-card p-4">
                  {renderCustomComponent(component)}
                </div>
              ))}

            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <CustomerForm data={customer} onChange={setCustomer} />
            </div>

            {/* Order Bumps */}
            {orderBumps.length > 0 && (
              <div className="space-y-3">
                {orderBumps.map((bump) => (
                  <div
                    key={bump.id}
                    className={`border-2 rounded-xl overflow-hidden transition-colors cursor-pointer ${
                      selectedBumps.has(bump.id)
                        ? "border-primary bg-primary/5"
                        : "border-dashed border-border bg-card"
                    }`}
                    onClick={() => toggleBump(bump.id)}
                  >
                    <div className="bg-primary text-primary-foreground text-center text-xs font-bold py-2 uppercase">
                      {bump.call_to_action}
                    </div>
                    <div className="flex items-center gap-3 p-4">
                      {bump.use_product_image && bump.bump_product?.image_url && (
                        <img
                          src={bump.bump_product.image_url}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedBumps.has(bump.id)}
                          onCheckedChange={() => toggleBump(bump.id)}
                          className="shrink-0"
                        />
                        <span className="text-sm">
                          <strong className="text-primary">{bump.title || bump.bump_product?.name}</strong>{" "}
                          {bump.description} — R$ {bump.bump_product?.price?.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-foreground">Forma de pagamento</h2>

              {product.is_subscription && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-primary text-lg">🔄</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Assinatura {
                      { weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal', quarterly: 'Trimestral', semiannually: 'Semestral', yearly: 'Anual' }[product.billing_cycle] || 'Mensal'
                    }</p>
                    <p className="text-xs text-muted-foreground">Cobrança recorrente no cartão de crédito</p>
                  </div>
                </div>
              )}

              {!product.is_subscription && (
                <PaymentTabs activeMethod={paymentMethod} onMethodChange={setPaymentMethod} />
              )}

              {paymentMethod === 'pix' ? (
                <PixPayment totalAmount={finalAmount} qrCodeData={pixData?.qrCodeUrl} pixCode={pixData?.pixCode} />
              ) : (
                <CreditCardForm data={creditCard} onChange={setCreditCard} totalAmount={finalAmount} />
              )}

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-14 text-base font-display font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {product.is_subscription ? "Assinar agora" : paymentMethod === 'pix' ? (submitLabel || "Gerar PIX") : "Pagar com Cartão"}
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

          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 1, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="lg:sticky lg:top-6 space-y-4">
              {sortedLayout
                .filter((c) => c.zone === "right" && !["form", "button", "countdown", "facebook"].includes(c.type))
                .map((component) => (
                  <div key={component.id} className="rounded-xl border border-border bg-card p-4">
                    {renderCustomComponent(component)}
                  </div>
                ))}
              <OrderSummary items={items} discount={pixDiscount} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
