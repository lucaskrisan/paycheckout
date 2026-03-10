import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck, ArrowRight, Loader2, QrCode, ThumbsUp, Award, Star, ListOrdered } from "lucide-react";
import OrderSummary from "@/components/checkout/OrderSummary";
import CustomerForm, { type CustomerData } from "@/components/checkout/CustomerForm";
import PixPayment from "@/components/checkout/PixPayment";
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
  const { trackPurchase } = useFacebookPixel(productId);
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());

  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });

  useEffect(() => {
    if (!productId) { setNotFound(true); setLoading(false); return; }
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("active", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setProduct(data);
        setLoading(false);
      });

    // Load order bumps
    supabase
      .from("order_bumps")
      .select("id, call_to_action, title, description, use_product_image, bump_product:products!order_bumps_bump_product_id_fkey(id, name, price, image_url)")
      .eq("product_id", productId)
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setOrderBumps(data as any);
      });
  }, [productId]);

  const toggleBump = (bumpId: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(bumpId)) next.delete(bumpId);
      else next.add(bumpId);
      return next;
    });
  };

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

  const pixDiscount = product.price * 0.05;
  const finalAmount = product.price - pixDiscount + bumpTotal;

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

    setIsSubmitting(true);
    try {
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
        trackPurchase(finalAmount);
      } else {
        throw new Error("Falha ao gerar o PIX");
      }
    } catch (err: any) {
      console.error("PIX error:", err);
      toast.error(err.message || "Erro ao gerar PIX. Tente novamente.");
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
        <CountdownTimer minutes={15} />

        <div className="mt-6 grid lg:grid-cols-5 gap-6 lg:gap-8">
          <motion.div
            className="lg:col-span-3 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
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

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">PIX</span>
                <span className="ml-auto bg-checkout-badge text-checkout-surface text-[10px] font-bold px-2 py-0.5 rounded-full">5% OFF</span>
              </div>

              <PixPayment totalAmount={finalAmount} qrCodeData={pixData?.qrCodeUrl} pixCode={pixData?.pixCode} />

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-14 text-base font-display font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Gerar PIX
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="lg:sticky lg:top-6">
              <OrderSummary items={items} discount={pixDiscount} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
