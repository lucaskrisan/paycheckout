import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2, Award, Star, ListOrdered, Shield, ShieldCheck } from "lucide-react";
import CustomerForm, { type CustomerData } from "@/components/checkout/CustomerForm";
import PixPayment from "@/components/checkout/PixPayment";
import PixModal from "@/components/checkout/PixModal";
import CreditCardForm, { type CreditCardData } from "@/components/checkout/CreditCardForm";
import PaymentTabs from "@/components/checkout/PaymentTabs";
import CountdownTimer from "@/components/checkout/CountdownTimer";
import CouponField from "@/components/checkout/CouponField";
import PriceSummary from "@/components/checkout/PriceSummary";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useAbandonedCart } from "@/hooks/useAbandonedCart";
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
  user_id: string | null;
  show_coupon?: boolean;
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

interface CheckoutSettings {
  logo_url: string | null;
  primary_color: string | null;
  custom_css: string | null;
  company_name: string | null;
}

interface CouponData {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

const Checkout = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedConfigId = useMemo(() => new URLSearchParams(location.search).get("config"), [location.search]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeUrl?: string; pixCode?: string } | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const { trackPurchase, trackAddPaymentInfo, trackLead, setAdvancedMatching } = useFacebookPixel(productId);
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [builderLayout, setBuilderLayout] = useState<BuilderComponent[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">("pix");
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null);
  const [coupon, setCoupon] = useState<CouponData | null>(null);

  const [customer, setCustomer] = useState<CustomerData>({ name: "", email: "", phone: "", cpf: "" });
  const [creditCard, setCreditCard] = useState<CreditCardData>({ number: "", name: "", expiry: "", cvv: "", installments: "1" });

  const { markPurchased } = useAbandonedCart({
    productId: productId || "",
    customer,
    paymentMethod,
    productOwnerId: product?.user_id,
  });

  useEffect(() => {
    if (!productId) { setNotFound(true); setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const builderQuery = requestedConfigId
        ? supabase
            .from("checkout_builder_configs" as any)
            .select("layout, price")
            .eq("id", requestedConfigId)
            .eq("product_id", productId)
            .maybeSingle()
        : supabase
            .from("checkout_builder_configs" as any)
            .select("layout, price")
            .eq("product_id", productId)
            .eq("is_default", true)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      const [productRes, bumpsRes, builderRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).eq("active", true).single(),
        supabase.from("order_bumps").select("id, call_to_action, title, description, use_product_image, bump_product:products!order_bumps_bump_product_id_fkey(id, name, price, image_url)").eq("product_id", productId).eq("active", true).order("sort_order"),
        builderQuery,
      ]);

      if (productRes.error || !productRes.data) { setNotFound(true); }
      else {
        const p = productRes.data as any;
        // Override price if config has a custom price
        const configPrice = (builderRes.data as any)?.price;
        if (configPrice != null && configPrice > 0) {
          p.price = Number(configPrice);
        }
        setProduct(p);
        if (p.is_subscription) setPaymentMethod("credit_card");
        if (p.user_id) {
          const { data: settings } = await supabase.from("checkout_settings").select("logo_url, primary_color, custom_css, company_name").eq("user_id", p.user_id).maybeSingle();
          if (settings) setCheckoutSettings(settings);
        }
      }
      if (bumpsRes.data) setOrderBumps(bumpsRes.data as any);
      let builderLayoutData = builderRes.data;

      if (!builderLayoutData) {
        const { data: fallbackConfig } = await supabase
          .from("checkout_builder_configs" as any)
          .select("layout, price")
          .eq("product_id", productId)
          .eq("is_default", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        builderLayoutData = fallbackConfig;
      }

      if (!builderLayoutData) {
        const { data: latestConfig } = await supabase
          .from("checkout_builder_configs" as any)
          .select("layout, price")
          .eq("product_id", productId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        builderLayoutData = latestConfig;
      }

      const layout = ((builderLayoutData as any)?.layout as unknown as BuilderComponent[] | null) ?? [];
      setBuilderLayout(Array.isArray(layout) ? layout : []);
      setLoading(false);
    };
    load();
  }, [productId, requestedConfigId]);

  useEffect(() => {
    if (!checkoutSettings) return;
    if (checkoutSettings.primary_color) document.documentElement.style.setProperty("--checkout-brand", checkoutSettings.primary_color);
    let styleEl: HTMLStyleElement | null = null;
    if (checkoutSettings.custom_css) { styleEl = document.createElement("style"); styleEl.textContent = checkoutSettings.custom_css; document.head.appendChild(styleEl); }
    return () => { document.documentElement.style.removeProperty("--checkout-brand"); if (styleEl) styleEl.remove(); };
  }, [checkoutSettings]);

  const toggleBump = (bumpId: string) => {
    setSelectedBumps((prev) => { const next = new Set(prev); if (next.has(bumpId)) next.delete(bumpId); else next.add(bumpId); return next; });
  };

  const sortedLayout = useMemo(() => [...builderLayout].sort((a, b) => a.order - b.order), [builderLayout]);
  const countdownMinutes = Number(sortedLayout.find((c) => c.type === "countdown")?.props?.minutes || 15);
  const submitLabel = sortedLayout.find((c) => c.type === "button")?.props?.text;

  const renderCustomComponent = (component: BuilderComponent) => {
    switch (component.type) {
      case "text": return <p className="text-[#0F1111] whitespace-pre-line text-sm">{component.props.content}</p>;
      case "image": return component.props.url ? <img src={component.props.url} alt="" className="w-full rounded-lg object-contain bg-[#F7FAFA] p-1 border border-[#D5D9D9]" loading="lazy" decoding="async" /> : null;
      case "header": return <h2 className="text-lg font-bold text-[#0F1111]">{component.props.title || product?.name}</h2>;
      case "advantages": case "list":
        return (<ul className="space-y-2">{(component.props.items || []).map((item: string, i: number) => (<li key={`${component.id}-${i}`} className="flex items-center gap-2 text-sm text-[#0F1111]"><ListOrdered className="w-4 h-4 text-[#007185]" /><span>{item}</span></li>))}</ul>);
      case "testimonial":
        return (<div className="rounded-lg border border-[#D5D9D9] bg-white p-3"><div className="mb-1 flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-[#FFA41C] fill-[#FFA41C]" />)}</div><p className="text-sm text-[#0F1111] italic">"{component.props.text}"</p><p className="mt-1 text-xs text-[#565959]">— {component.props.author}</p></div>);
      case "seal":
        return (<div className="flex items-center gap-2 rounded-lg border border-[#D5D9D9] bg-white p-3"><Award className="w-5 h-5 text-[#007185]" /><div><p className="text-sm font-semibold text-[#0F1111]">{component.props.title}</p><p className="text-xs text-[#565959]">{component.props.subtitle}</p></div></div>);
      case "video": return component.props.url ? <iframe src={component.props.url.replace("watch?v=", "embed/")} className="w-full h-56 rounded-lg border border-[#D5D9D9]" allowFullScreen title="Vídeo" /> : null;
      default: return null;
    }
  };

  useEffect(() => { if (customer.name && customer.email) { setAdvancedMatching(customer); trackLead(); } }, [customer.name, customer.email, customer.phone, customer.cpf, setAdvancedMatching, trackLead]);
  useEffect(() => { trackAddPaymentInfo(paymentMethod); }, [paymentMethod, trackAddPaymentInfo]);

  if (loading) return (
    <div className="min-h-screen bg-[#F2F4F8] flex items-center justify-center">
      <div className="space-y-4 w-full max-w-lg px-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
    </div>
  );

  if (notFound || !product) return (
    <div className="min-h-screen bg-[#F2F4F8] flex items-center justify-center">
      <div className="text-center space-y-3"><h1 className="text-2xl font-bold text-[#0F1111]">Produto não encontrado</h1><p className="text-[#565959]">Este produto não existe ou não está disponível.</p></div>
    </div>
  );

  const couponDiscount = coupon ? (coupon.discount_type === "percent" ? product.price * (coupon.discount_value / 100) : coupon.discount_value) : 0;
  const bumpTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + (b.bump_product?.price || 0), 0);
  const pixDiscount = paymentMethod === "pix" ? product.price * 0.05 : 0;
  const frontEndAmount = product.price - pixDiscount - couponDiscount;
  const finalAmount = Math.max(frontEndAmount, 0) + bumpTotal;

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || !customer.cpf || !customer.phone) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (paymentMethod === "credit_card" && (!creditCard.number || !creditCard.name || !creditCard.expiry || !creditCard.cvv)) { toast.error("Preencha todos os dados do cartão"); return; }

    setIsSubmitting(true);
    try {
      if (paymentMethod === "pix") {
        const bumpProductIds = orderBumps.filter((b) => selectedBumps.has(b.id)).map((b) => b.bump_product.id);
        const { data, error } = await supabase.functions.invoke("create-pix-payment", {
          body: { amount: finalAmount, product_id: product.id, config_id: requestedConfigId || null, coupon_id: coupon?.id || null, bump_product_ids: bumpProductIds, customer: { name: customer.name, email: customer.email, cpf: customer.cpf, phone: customer.phone } },
        });
        if (error) throw error;
        if (data?.qr_code_url || data?.qr_code) { setPixData({ qrCodeUrl: data.qr_code_url, pixCode: data.qr_code }); toast.success("PIX gerado! Escaneie o QR Code para pagar."); trackPurchase(frontEndAmount); await markPurchased(); }
        else throw new Error("Falha ao gerar o PIX");
      } else {
        const bumpProductIds2 = orderBumps.filter((b) => selectedBumps.has(b.id)).map((b) => b.bump_product.id);
        const [expMonth, expYear] = creditCard.expiry.split("/");
        const { data, error } = await supabase.functions.invoke("create-asaas-payment", {
          body: { amount: finalAmount, product_id: product.id, payment_method: "credit_card", installments: creditCard.installments, is_subscription: product.is_subscription, billing_cycle: product.billing_cycle, config_id: requestedConfigId || null, coupon_id: coupon?.id || null, bump_product_ids: bumpProductIds2, customer: { name: customer.name, email: customer.email, cpf: customer.cpf, phone: customer.phone, creditCard: { holderName: creditCard.name, number: creditCard.number.replace(/\s/g, ""), expiryMonth: expMonth, expiryYear: `20${expYear}`, ccv: creditCard.cvv } } },
        });
        if (error) throw error;
        if (data?.payment_id) { toast.success("Pagamento processado com sucesso!"); trackPurchase(frontEndAmount); await markPurchased(); navigate(`/checkout/sucesso?product=${encodeURIComponent(product.name)}&method=credit_card&email=${encodeURIComponent(customer.email)}`); }
        else throw new Error("Falha ao processar pagamento");
      }
    } catch (err: any) { console.error("Payment error:", err); toast.error(err.message || "Erro ao processar pagamento."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F4F8", fontFamily: "Arial, sans-serif" }}>
      {/* Fixed topbar */}
      <CountdownTimer minutes={countdownMinutes} />

      {/* Main content - white card */}
      <div className="max-w-[620px] mx-auto px-4 pt-16 pb-8">
        <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5">

            {/* Builder: top zone */}
            {sortedLayout.filter((c) => c.zone === "top").map((component) => (
              <div key={component.id}>{renderCustomComponent(component)}</div>
            ))}

            {/* Product banner image */}
            {product.image_url && (
              <div className="rounded-lg overflow-hidden bg-[#F7FAFA]">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-auto max-h-[420px] object-contain mx-auto"
                  loading="eager"
                  decoding="async"
                />
              </div>
            )}

            {/* Product name + thumbnail */}
            <div className="flex items-center gap-3">
              {product.image_url && (
                <img src={product.image_url} alt="" className="w-10 h-10 rounded-md object-contain bg-[#F7FAFA] p-0.5 border border-[#D5D9D9]" />
              )}
              <h1 className="text-base font-bold text-[#0F1111]">{product.name}</h1>
            </div>

            {/* Builder: left zone components */}
            {sortedLayout.filter((c) => c.zone === "left" && !["form", "button", "countdown", "facebook"].includes(c.type)).map((component) => (
              <div key={component.id}>{renderCustomComponent(component)}</div>
            ))}

            {/* Customer form */}
            <div className="space-y-4">
              <CustomerForm data={customer} onChange={setCustomer} />

              {/* Payment tabs */}
              {product.is_subscription ? (
                <div className="bg-[#F7FAFA] border border-[#D5D9D9] rounded-lg p-3 flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <div>
                    <p className="text-sm font-bold text-[#0F1111]">Assinatura {{ weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal", quarterly: "Trimestral", semiannually: "Semestral", yearly: "Anual" }[product.billing_cycle] || "Mensal"}</p>
                    <p className="text-xs text-[#565959]">Cobrança recorrente no cartão de crédito</p>
                  </div>
                </div>
              ) : (
                <PaymentTabs activeMethod={paymentMethod} onMethodChange={setPaymentMethod} pixDiscountPercent={5} />
              )}

              {/* Payment form */}
              {paymentMethod === "pix" ? (
                <PixPayment totalAmount={finalAmount} qrCodeData={pixData?.qrCodeUrl} pixCode={pixData?.pixCode} />
              ) : (
                <CreditCardForm data={creditCard} onChange={setCreditCard} totalAmount={finalAmount} />
              )}
            </div>

            {/* Coupon */}
            {product.show_coupon !== false && (
              <CouponField productId={product.id} productPrice={product.price} onApply={setCoupon} />
            )}

            {/* Order Bumps */}
            {orderBumps.length > 0 && (
              <div className="space-y-3">
                {orderBumps.map((bump) => (
                  <div
                    key={bump.id}
                    onClick={() => toggleBump(bump.id)}
                    className={`border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedBumps.has(bump.id)
                        ? "border-[#007185] bg-[#F7FAFA]"
                        : "border-[#D5D9D9] bg-white"
                    }`}
                  >
                    <div className="bg-[#FFF8E1] text-[#B12704] text-center text-xs font-bold py-2 uppercase tracking-wide">
                      {bump.call_to_action}
                    </div>
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                        <span className="text-[#B12704] text-lg leading-none">➜</span>
                        <Checkbox
                          checked={selectedBumps.has(bump.id)}
                          onCheckedChange={() => toggleBump(bump.id)}
                          className="border-[#007185] data-[state=checked]:bg-[#007185]"
                        />
                      </div>
                      {bump.use_product_image && bump.bump_product?.image_url && (
                        <img src={bump.bump_product.image_url} alt="" className="w-14 h-14 rounded-md object-contain bg-[#F7FAFA] p-1 shrink-0 border border-[#D5D9D9]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <strong className="text-[#007185] underline">{bump.title || bump.bump_product?.name}:</strong>{" "}
                          <span className="text-[#0F1111]">{bump.description}</span>
                          {bump.bump_product?.price && (
                            <span className="text-[#565959]">
                              {" "}— Adicionar a compra · {creditCard.installments !== "1"
                                ? `${creditCard.installments}x de R$ ${(bump.bump_product.price / Number(creditCard.installments || 1)).toFixed(2).replace(".", ",")}`
                                : `R$ ${bump.bump_product.price.toFixed(2).replace(".", ",")}`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Builder: right zone */}
            {sortedLayout.filter((c) => c.zone === "right" && !["form", "button", "countdown", "facebook"].includes(c.type)).map((component) => (
              <div key={component.id}>{renderCustomComponent(component)}</div>
            ))}

            {/* Price summary breakdown */}
            <PriceSummary
              originalPrice={product.price}
              pixDiscount={pixDiscount}
              couponDiscount={couponDiscount}
              bumpTotal={bumpTotal}
              finalAmount={finalAmount}
              paymentMethod={paymentMethod}
              couponCode={coupon?.code}
            />

            {/* Submit button - Amazon gold */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl text-base font-bold transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
              style={{
                backgroundColor: isSubmitting ? "#E8D38A" : "#FFD814",
                border: "1px solid #FCD200",
                color: "#0F1111",
                boxShadow: isSubmitting ? "none" : "0 3px 8px rgba(255,216,20,0.35), 0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  {product.is_subscription ? "Assinar agora" : paymentMethod === "pix" ? `Pagar ${finalAmount.toFixed(2).replace(".", ",")} com PIX` : submitLabel || "Finalizar compra"}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </button>

            {/* Trust footer */}
            <div className="text-center space-y-3 pt-2 pb-2">
              <div className="flex items-center justify-center gap-4 text-xs text-[#565959]">
                <div className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#007185]" />
                  <span>Pagamento seguro</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007185]" />
                  <span>Dados protegidos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#007185]" />
                  <span>SSL 256 bits</span>
                </div>
              </div>
              <p className="text-[11px] text-[#565959]">
                Ao continuar, você concorda com os{" "}
                <a href="#" className="underline text-[#007185]">termos de uso</a> e{" "}
                <a href="#" className="underline text-[#007185]">política de privacidade</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
