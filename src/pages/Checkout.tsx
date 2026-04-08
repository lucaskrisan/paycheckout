import { useState, useEffect, useMemo } from "react";
import { getStateFromPhone } from "@/lib/dddToState";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Lock, ArrowRight, Loader2, Shield } from "lucide-react";
import CustomerForm, { type CustomerData, isValidCPF } from "@/components/checkout/CustomerForm";
import PixPayment from "@/components/checkout/PixPayment";
import PixModal from "@/components/checkout/PixModal";
import CreditCardForm, { type CreditCardData } from "@/components/checkout/CreditCardForm";
import PaymentTabs from "@/components/checkout/PaymentTabs";
import CountdownTimer from "@/components/checkout/CountdownTimer";
import CouponField from "@/components/checkout/CouponField";
import PriceSummary from "@/components/checkout/PriceSummary";
import OrderBumps from "@/components/checkout/OrderBumps";
import TrustFooter from "@/components/checkout/TrustFooter";
import CheckoutBuilderRenderer from "@/components/checkout/CheckoutBuilderRenderer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useAbandonedCart } from "@/hooks/useAbandonedCart";
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
import type { BuilderComponent } from "@/components/checkout-builder/types";

interface Product {
  id: string; name: string; description: string | null; price: number;
  original_price: number | null; image_url: string | null;
  is_subscription: boolean; billing_cycle: string; user_id: string | null; show_coupon?: boolean;
  currency?: string;
}

interface OrderBump {
  id: string; call_to_action: string; title: string; description: string;
  use_product_image: boolean;
  bump_product: { id: string; name: string; price: number; image_url: string | null };
}

interface CheckoutSettings { logo_url: string | null; primary_color: string | null; custom_css: string | null; company_name: string | null; }
interface CouponData { id: string; code: string; discount_type: string; discount_value: number; }

const Checkout = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedConfigId = useMemo(() => new URLSearchParams(location.search).get("config"), [location.search]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [producerBlocked, setProducerBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeUrl?: string; pixCode?: string; orderId?: string } | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const { trackPurchase, trackAddPaymentInfo, trackAddToCart, trackAddToCartMain, trackLead, setAdvancedMatching } = useFacebookPixel(productId, product?.price, product?.name);
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [builderLayout, setBuilderLayout] = useState<BuilderComponent[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">("pix");
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null);
  const [isOwnerSuperAdmin, setIsOwnerSuperAdmin] = useState(false);
  const [coupon, setCoupon] = useState<CouponData | null>(null);

  const prefill = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return { name: params.get("name") || "", email: params.get("email") || "", phone: params.get("phone") || "", cpf: params.get("cpf") || "" };
  }, [location.search]);

  const [customer, setCustomer] = useState<CustomerData>({ name: prefill.name, email: prefill.email, phone: prefill.phone, cpf: prefill.cpf });
  const [creditCard, setCreditCard] = useState<CreditCardData>({ number: "", name: "", expiry: "", cvv: "", installments: "1", postalCode: "" });

  const { markPurchased } = useAbandonedCart({ productId: productId || "", customer, paymentMethod, productOwnerId: product?.user_id });
  useCheckoutPresence("track", productId);

  // Load product data
  useEffect(() => {
    if (!productId) { setNotFound(true); setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const builderQuery = requestedConfigId
        ? supabase.from("checkout_builder_configs" as any).select("layout, price").eq("id", requestedConfigId).eq("product_id", productId).maybeSingle()
        : supabase.from("checkout_builder_configs" as any).select("layout, price").eq("product_id", productId).eq("is_default", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();

      const [productRes, bumpsRes, builderRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).eq("active", true).single(),
        supabase.from("order_bumps").select("id, call_to_action, title, description, use_product_image, bump_product:products!order_bumps_bump_product_id_fkey(id, name, price, image_url)").eq("product_id", productId).eq("active", true).order("sort_order"),
        builderQuery,
      ]);

      if (productRes.error || !productRes.data) { setNotFound(true); }
      else if ((productRes.data as any).moderation_status && (productRes.data as any).moderation_status !== "approved") { setNotFound(true); }
      else {
        const p = productRes.data as any;
        const configPrice = (builderRes.data as any)?.price;
        if (configPrice != null && configPrice > 0) p.price = Number(configPrice);
        setProduct(p);
        if (p.is_subscription || p.currency === 'USD') setPaymentMethod("credit_card");
        if (p.user_id) {
          const [{ data: settings }, { data: billingAcc }, { data: ownerRoles }] = await Promise.all([
            supabase.from("checkout_settings").select("logo_url, primary_color, custom_css, company_name").eq("user_id", p.user_id).maybeSingle(),
            supabase.from("billing_accounts").select("blocked").eq("user_id", p.user_id).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", p.user_id).eq("role", "super_admin"),
          ]);
          if (settings) setCheckoutSettings(settings);
          const isSuperAdmin = (ownerRoles as any[])?.length > 0;
          setIsOwnerSuperAdmin(isSuperAdmin);
          if (!isSuperAdmin && (billingAcc as any)?.blocked === true) { setProducerBlocked(true); setLoading(false); return; }
        }
      }
      if (bumpsRes.data) setOrderBumps(bumpsRes.data as any);

      let builderLayoutData = builderRes.data;
      if (!builderLayoutData) {
        const { data: fallbackConfig } = await supabase.from("checkout_builder_configs" as any).select("layout, price").eq("product_id", productId).eq("is_default", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        builderLayoutData = fallbackConfig;
      }
      if (!builderLayoutData) {
        const { data: latestConfig } = await supabase.from("checkout_builder_configs" as any).select("layout, price").eq("product_id", productId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        builderLayoutData = latestConfig;
      }
      const layout = ((builderLayoutData as any)?.layout as unknown as BuilderComponent[] | null) ?? [];
      setBuilderLayout(Array.isArray(layout) ? layout : []);
      setLoading(false);
    };
    load();
  }, [productId, requestedConfigId]);

  // Custom CSS injection
  useEffect(() => {
    if (!checkoutSettings) return;
    if (checkoutSettings.primary_color) document.documentElement.style.setProperty("--checkout-brand", checkoutSettings.primary_color);
    let styleEl: HTMLStyleElement | null = null;
    if (checkoutSettings.custom_css) {
      const sanitizedCss = checkoutSettings.custom_css
        .replace(/<[^>]*>/g, '').replace(/javascript\s*:/gi, '').replace(/expression\s*\(/gi, '')
        .replace(/@import/gi, '').replace(/url\s*\(\s*['"]?\s*javascript/gi, 'url(blocked');
      styleEl = document.createElement("style");
      styleEl.textContent = sanitizedCss;
      document.head.appendChild(styleEl);
    }
    return () => { document.documentElement.style.removeProperty("--checkout-brand"); if (styleEl) styleEl.remove(); };
  }, [checkoutSettings]);

  const toggleBump = (bumpId: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(bumpId)) { next.delete(bumpId); } else {
        next.add(bumpId);
        const bump = orderBumps.find((b) => b.id === bumpId);
        if (bump) trackAddToCart(bump.bump_product.id, bump.bump_product.price);
      }
      return next;
    });
  };

  const sortedLayout = useMemo(() => [...builderLayout].sort((a, b) => a.order - b.order), [builderLayout]);
  const countdownMinutes = Number(sortedLayout.find((c) => c.type === "countdown")?.props?.minutes || 15);
  const submitLabel = sortedLayout.find((c) => c.type === "button")?.props?.text;

  useEffect(() => { if (customer.name && customer.email && customer.cpf && customer.phone) { setAdvancedMatching(customer); trackLead(); } }, [customer.name, customer.email, customer.phone, customer.cpf, setAdvancedMatching, trackLead]);
  useEffect(() => { trackAddPaymentInfo(paymentMethod); }, [paymentMethod, trackAddPaymentInfo]);

  if (loading) return (
    <div className="min-h-screen bg-[#F2F4F8] flex items-center justify-center">
      <div className="space-y-4 w-full max-w-lg px-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
    </div>
  );

  if (producerBlocked) return (
    <div className="min-h-screen bg-[#F2F4F8] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto"><Shield className="w-8 h-8 text-yellow-600" /></div>
        <h1 className="text-2xl font-bold text-[#0F1111]">Página em manutenção</h1>
        <p className="text-[#565959]">Este checkout está temporariamente indisponível. Por favor, tente novamente mais tarde.</p>
      </div>
    </div>
  );

  if (notFound || !product) return (
    <div className="min-h-screen bg-[#F2F4F8] flex items-center justify-center">
      <div className="text-center space-y-3"><h1 className="text-2xl font-bold text-[#0F1111]">Produto não encontrado</h1><p className="text-[#565959]">Este produto não existe ou não está disponível.</p></div>
    </div>
  );

  const isUSD = product.currency === "USD";
  const currencySymbol = isUSD ? "$" : "R$";
  const formatPrice = (v: number) => isUSD ? `$ ${v.toFixed(2)}` : `R$ ${v.toFixed(2).replace(".", ",")}`;

  const couponDiscount = coupon ? (coupon.discount_type === "percent" ? Math.round(product.price * (coupon.discount_value / 100) * 100) / 100 : coupon.discount_value) : 0;
  const bumpTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + (b.bump_product?.price || 0), 0);
  const pixDiscount = (!isUSD && paymentMethod === "pix") ? Math.round(product.price * 0.05 * 100) / 100 : 0;
  const frontEndAmount = Math.round((product.price - pixDiscount - couponDiscount) * 100) / 100;
  const finalAmount = Math.round((Math.max(frontEndAmount, 0) + bumpTotal) * 100) / 100;

  const getUtms = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
      utm_term: params.get("utm_term") || undefined,
    };
  };

  const handleSubmit = async () => {
    if (!customer.name || !customer.email) { toast.error(isUSD ? "Please fill in all required fields" : "Preencha todos os campos obrigatórios"); return; }
    if (!isUSD && (!customer.cpf || !customer.phone)) { toast.error("Preencha todos os campos obrigatórios"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email.trim())) { toast.error(isUSD ? "Invalid email address" : "E-mail inválido. Verifique o endereço digitado."); return; }
    if (!isUSD && !isValidCPF(customer.cpf)) { toast.error("CPF inválido. Verifique o número digitado."); return; }
    const [expMonth, expYear] = creditCard.expiry.split("/");
    if (paymentMethod === "credit_card") {
      if (!creditCard.number || !creditCard.name.trim() || !creditCard.expiry || !creditCard.cvv) { toast.error(isUSD ? "Please fill in all card details" : "Preencha todos os dados do cartão"); return; }
      if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) { toast.error(isUSD ? "Invalid card expiry date" : "Preencha a validade do cartão corretamente"); return; }
    }

    trackAddToCartMain();
    setIsSubmitting(true);
    const bumpProductIds = orderBumps.filter((b) => selectedBumps.has(b.id)).map((b) => b.bump_product.id);
    const utms = getUtms();

    try {
      if (isUSD) {
        // USD → Stripe
        const { data, error } = await supabase.functions.invoke("create-stripe-payment", {
          body: {
            amount: finalAmount, product_id: product.id, currency: "usd",
            config_id: requestedConfigId || null, coupon_id: coupon?.id || null,
            bump_product_ids: bumpProductIds, checkout_url: window.location.href, utms,
            customer: { name: customer.name, email: customer.email, phone: customer.phone || undefined },
          },
        });
        if (error) {
          let msg = "Payment processing failed";
          try { const ctx = (error as any).context; if (ctx && typeof ctx.json === "function") { const body = await ctx.json(); if (body?.error) msg = body.error; } } catch {}
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        if (data?.url) {
          window.location.href = data.url;
        } else {
          const paymentId = data?.payment_id || data?.id;
          if (paymentId) {
            toast.success("Payment processed successfully!");
            trackPurchase(finalAmount, "USD", paymentId);
            await markPurchased();
            navigate(`/checkout/sucesso?product=${encodeURIComponent(product.name)}&method=credit_card&email=${encodeURIComponent(customer.email)}&product_id=${product.id}${data.order_id ? `&order_id=${data.order_id}` : ''}`);
          } else throw new Error("Payment processing failed");
        }
      } else if (paymentMethod === "pix") {
        const customerState = getStateFromPhone(customer.phone);
        const { data, error } = await supabase.functions.invoke("create-pix-payment", {
          body: { amount: finalAmount, product_id: product.id, config_id: requestedConfigId || null, coupon_id: coupon?.id || null, bump_product_ids: bumpProductIds, checkout_url: window.location.href, utms, customer_state: customerState, customer: { name: customer.name, email: customer.email, cpf: customer.cpf, phone: customer.phone } },
        });
        if (error) {
          let msg = "Falha ao gerar o PIX";
          try { const ctx = (error as any).context; if (ctx && typeof ctx.json === "function") { const body = await ctx.json(); if (body?.error) msg = body.error; } } catch {}
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        if (data?.qr_code_url || data?.qr_code) { setPixData({ qrCodeUrl: data.qr_code_url, pixCode: data.qr_code, orderId: data.order_id }); setPixModalOpen(true); }
        else throw new Error("Falha ao gerar o PIX. Tente novamente.");
      } else {
        const customerState = getStateFromPhone(customer.phone);
        const { data, error } = await supabase.functions.invoke("create-asaas-payment", {
          body: {
            amount: finalAmount, product_id: product.id, payment_method: "credit_card", installments: creditCard.installments,
            is_subscription: product.is_subscription, billing_cycle: product.billing_cycle, config_id: requestedConfigId || null,
            coupon_id: coupon?.id || null, bump_product_ids: bumpProductIds, checkout_url: window.location.href, utms, customer_state: customerState,
            customer: { name: customer.name, email: customer.email, cpf: customer.cpf, phone: customer.phone, postalCode: creditCard.postalCode, addressNumber: "0",
              creditCard: { holderName: creditCard.name, number: creditCard.number.replace(/\s/g, ""), expiryMonth: expMonth, expiryYear: `20${expYear}`, ccv: creditCard.cvv } },
          },
        });
        if (error) {
          let msg = "Falha ao processar pagamento com cartão";
          try { const ctx = (error as any).context; if (ctx && typeof ctx.json === "function") { const body = await ctx.json(); if (body?.error) msg = body.error; } } catch {}
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        const paymentId = data?.payment_id || data?.subscription_id || data?.id;
        if (paymentId) {
          toast.success("Pagamento processado com sucesso!");
          trackPurchase(finalAmount, "BRL", paymentId);
          await markPurchased();
          navigate(`/checkout/sucesso?product=${encodeURIComponent(product.name)}&method=credit_card&email=${encodeURIComponent(customer.email)}&product_id=${product.id}${data.order_id ? `&order_id=${data.order_id}` : ''}`);
        } else throw new Error("Falha ao processar pagamento");
      }
    } catch (err: any) { console.error("Payment error:", err); toast.error(err.message || (isUSD ? "Payment error." : "Erro ao processar pagamento.")); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F4F8", fontFamily: "Arial, sans-serif" }}>
      <CountdownTimer minutes={countdownMinutes} />
      <div className="max-w-[620px] mx-auto px-4 pt-16 pb-8">
        <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5">
            <CheckoutBuilderRenderer components={sortedLayout} zone="top" productName={product.name} />

            {product.image_url && (
              <div className="rounded-lg overflow-hidden bg-[#F7FAFA]">
                <img src={product.image_url} alt={product.name} className="w-full h-auto max-h-[420px] object-contain mx-auto" loading="eager" decoding="async" />
              </div>
            )}

            <div className="flex items-center gap-3">
              {product.image_url && <img src={product.image_url} alt="" className="w-10 h-10 rounded-md object-contain bg-[#F7FAFA] p-0.5 border border-[#D5D9D9]" />}
              <h1 className="text-base font-bold text-[#0F1111]">{product.name}</h1>
            </div>

            <CheckoutBuilderRenderer components={sortedLayout} zone="left" productName={product.name} excludeTypes={["form", "button", "countdown", "facebook"]} />

            <div className="space-y-4">
              <CustomerForm data={customer} onChange={setCustomer} />
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
              {paymentMethod === "pix" ? (
                <PixPayment totalAmount={finalAmount} qrCodeData={pixData?.qrCodeUrl} pixCode={pixData?.pixCode} />
              ) : (
                <CreditCardForm data={creditCard} onChange={setCreditCard} totalAmount={finalAmount} />
              )}
            </div>

            {product.show_coupon !== false && <CouponField productId={product.id} productPrice={product.price} onApply={setCoupon} />}

            <OrderBumps bumps={orderBumps} selectedBumps={selectedBumps} onToggle={toggleBump} installments={creditCard.installments} />

            <CheckoutBuilderRenderer components={sortedLayout} zone="right" productName={product.name} excludeTypes={["form", "button", "countdown", "facebook"]} />

            <PriceSummary originalPrice={product.price} pixDiscount={pixDiscount} couponDiscount={couponDiscount} bumpTotal={bumpTotal} finalAmount={finalAmount} paymentMethod={paymentMethod} couponCode={coupon?.code} />

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl text-base font-bold transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
              style={{ backgroundColor: isSubmitting ? "#E8D38A" : "#FFD814", border: "1px solid #FCD200", color: "#0F1111", boxShadow: isSubmitting ? "none" : "0 3px 8px rgba(255,216,20,0.35), 0 1px 2px rgba(0,0,0,0.08)" }}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  {product.is_subscription ? "Assinar agora" : paymentMethod === "pix" ? `Pagar ${finalAmount.toFixed(2).replace(".", ",")} com PIX` : submitLabel || "Finalizar compra"}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </button>

            <TrustFooter />
          </div>
        </div>
      </div>
      <PixModal
        open={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        totalAmount={finalAmount}
        qrCodeUrl={pixData?.qrCodeUrl}
        pixCode={pixData?.pixCode}
        externalOrderId={pixData?.orderId}
        onPaymentConfirmed={() => {
          trackPurchase(finalAmount, "BRL", pixData?.orderId);
          markPurchased();
          setTimeout(() => { navigate(`/checkout/sucesso?product=${encodeURIComponent(product.name)}&method=pix&email=${encodeURIComponent(customer.email)}`); }, 2500);
        }}
      />
    </div>
  );
};

export default Checkout;
