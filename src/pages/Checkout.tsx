import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2, Award, Star, ListOrdered, Shield, ShieldCheck } from "lucide-react";
import CustomerForm, { type CustomerData, isValidCPF } from "@/components/checkout/CustomerForm";
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
import { useCheckoutPresence } from "@/hooks/useCheckoutPresence";
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
  crisp_website_id: string | null;
  crisp_enabled_checkout: boolean;
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

  // Pre-fill customer data from query params (for reminder emails)
  const prefill = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      name: params.get("name") || "",
      email: params.get("email") || "",
      phone: params.get("phone") || "",
      cpf: params.get("cpf") || "",
    };
  }, [location.search]);

  const [customer, setCustomer] = useState<CustomerData>({ name: prefill.name, email: prefill.email, phone: prefill.phone, cpf: prefill.cpf });
  const [creditCard, setCreditCard] = useState<CreditCardData>({ number: "", name: "", expiry: "", cvv: "", installments: "1", postalCode: "" });

  const { markPurchased } = useAbandonedCart({
    productId: productId || "",
    customer,
    paymentMethod,
    productOwnerId: product?.user_id,
  });

  // Track this visitor in real-time presence
  useCheckoutPresence("track", productId);

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
      else if ((productRes.data as any).moderation_status && (productRes.data as any).moderation_status !== "approved") { setNotFound(true); }
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
          // Check if producer is blocked
          const [{ data: settings }, { data: billingAcc }, { data: ownerRoles }] = await Promise.all([
            supabase.from("checkout_settings").select("logo_url, primary_color, custom_css, company_name, crisp_website_id, crisp_enabled_checkout").eq("user_id", p.user_id).maybeSingle(),
            supabase.from("billing_accounts").select("blocked").eq("user_id", p.user_id).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", p.user_id).eq("role", "super_admin"),
          ]);
          if (settings) setCheckoutSettings(settings);
          const isSuperAdmin = (ownerRoles as any[])?.length > 0;
          setIsOwnerSuperAdmin(isSuperAdmin);
          if (!isSuperAdmin && (billingAcc as any)?.blocked === true) {
            setProducerBlocked(true);
            setLoading(false);
            return;
          }
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

  // Crisp chat — loads if producer configured crisp_website_id, OR hardcoded for super admin
  useEffect(() => {
    if (loading) return;
    // Extract clean Crisp ID from potentially full script tag stored in DB
    const rawCrispId = checkoutSettings?.crisp_website_id;
    let cleanCrispId: string | null = null;
    if (rawCrispId) {
      const match = rawCrispId.match(/CRISP_WEBSITE_ID\s*=\s*["']([a-f0-9-]+)["']/i);
      cleanCrispId = match ? match[1] : (/^[a-f0-9-]{30,50}$/i.test(rawCrispId.trim()) ? rawCrispId.trim() : null);
    }
    const crispId = cleanCrispId || (isOwnerSuperAdmin ? "1d36332d-054f-443b-9a5d-1980537839eb" : null);
    if (!crispId) return;

    // Reset existing Crisp if ID changed
    if ((window as any).CRISP_WEBSITE_ID && (window as any).CRISP_WEBSITE_ID !== crispId) {
      delete (window as any).$crisp;
      delete (window as any).CRISP_WEBSITE_ID;
      document.querySelectorAll('[id^="crisp"]').forEach(el => el.remove());
      document.querySelectorAll('.crisp-client').forEach(el => el.remove());
    }

    if (!(window as any).CRISP_WEBSITE_ID) {
      (window as any).$crisp = [];
      (window as any).CRISP_WEBSITE_ID = crispId;
      const s = document.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      document.head.appendChild(s);
    }

    return () => {
      delete (window as any).$crisp;
      delete (window as any).CRISP_WEBSITE_ID;
      document.querySelectorAll('script[src*="crisp.chat"]').forEach(el => el.remove());
      document.querySelectorAll('[id^="crisp"]').forEach(el => el.remove());
      document.querySelectorAll('.crisp-client').forEach(el => el.remove());
    };
  }, [isOwnerSuperAdmin, loading, checkoutSettings?.crisp_website_id]);

  const toggleBump = (bumpId: string) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(bumpId)) {
        next.delete(bumpId);
      } else {
        next.add(bumpId);
        // Fire AddToCart pixel event (browser + CAPI with value)
        const bump = orderBumps.find((b) => b.id === bumpId);
        if (bump) trackAddToCart(bump.bump_product.id, bump.bump_product.price);
      }
      return next;
    });
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
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-yellow-600" />
        </div>
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

  const couponDiscount = coupon ? (coupon.discount_type === "percent" ? Math.round(product.price * (coupon.discount_value / 100) * 100) / 100 : coupon.discount_value) : 0;
  const bumpTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + (b.bump_product?.price || 0), 0);
  const pixDiscount = paymentMethod === "pix" ? Math.round(product.price * 0.05 * 100) / 100 : 0;
  const frontEndAmount = Math.round((product.price - pixDiscount - couponDiscount) * 100) / 100;
  const finalAmount = Math.round((Math.max(frontEndAmount, 0) + bumpTotal) * 100) / 100;

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || !customer.cpf || !customer.phone) { toast.error("Preencha todos os campos obrigatórios"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email.trim())) { toast.error("E-mail inválido. Verifique o endereço digitado."); return; }
    if (!isValidCPF(customer.cpf)) { toast.error("CPF inválido. Verifique o número digitado."); return; }
    const [expMonth, expYear] = creditCard.expiry.split("/");
    if (paymentMethod === "credit_card") {
      if (!creditCard.number || !creditCard.name.trim() || !creditCard.expiry || !creditCard.cvv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }

      if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
        toast.error("Preencha a validade do cartão corretamente");
        return;
      }
    }

    trackAddToCartMain();
    setIsSubmitting(true);
    try {
      if (paymentMethod === "pix") {
        const bumpProductIds = orderBumps.filter((b) => selectedBumps.has(b.id)).map((b) => b.bump_product.id);
        const utmParams = new URLSearchParams(window.location.search);
        const utms = {
          utm_source: utmParams.get("utm_source") || undefined,
          utm_medium: utmParams.get("utm_medium") || undefined,
          utm_campaign: utmParams.get("utm_campaign") || undefined,
          utm_content: utmParams.get("utm_content") || undefined,
          utm_term: utmParams.get("utm_term") || undefined,
        };
        const { data, error } = await supabase.functions.invoke("create-pix-payment", {
          body: { amount: finalAmount, product_id: product.id, config_id: requestedConfigId || null, coupon_id: coupon?.id || null, bump_product_ids: bumpProductIds, checkout_url: window.location.href, utms, customer: { name: customer.name, email: customer.email, cpf: customer.cpf, phone: customer.phone } },
        });
        if (error) {
          // Try to extract the real error message from the response body
          let msg = "Falha ao gerar o PIX";
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) msg = body.error;
            }
          } catch {}
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        if (data?.qr_code_url || data?.qr_code) { setPixData({ qrCodeUrl: data.qr_code_url, pixCode: data.qr_code, orderId: data.order_id }); setPixModalOpen(true); }
        else throw new Error("Falha ao gerar o PIX. Tente novamente.");
      } else {
        // Credit card via Pagar.me + 3DS
        const bumpProductIds2 = orderBumps.filter((b) => selectedBumps.has(b.id)).map((b) => b.bump_product.id);
        const utmParams2 = new URLSearchParams(window.location.search);
        const utms2 = {
          utm_source: utmParams2.get("utm_source") || undefined,
          utm_medium: utmParams2.get("utm_medium") || undefined,
          utm_campaign: utmParams2.get("utm_campaign") || undefined,
          utm_content: utmParams2.get("utm_content") || undefined,
          utm_term: utmParams2.get("utm_term") || undefined,
        };

        // Step 1: Try 3DS authentication
        let dsTransactionId: string | null = null;
        try {
          const { data: tokenData, error: tokenErr } = await supabase.functions.invoke("generate-3ds-token", {
            body: { product_id: product.id },
          });

          if (!tokenErr && tokenData?.token) {
            // Load 3DS script if not loaded
            const tdsEnv = tokenData.environment === 'production' ? 'live' : 'test';
            if (!(window as any).TDS) {
              await new Promise<void>((resolve, reject) => {
                const s = document.createElement("script");
                s.src = `https://3ds-nx-js.stone.com.br/${tdsEnv}/v2/3ds2.min.js`;
                s.onload = () => resolve();
                s.onerror = () => reject(new Error("3DS script failed"));
                document.head.appendChild(s);
              });
            }

            // Ensure 3DS containers exist
            let methodContainer = document.getElementById('tdsMethodContainer');
            let challengeContainer = document.getElementById('challengeContainer');
            if (!methodContainer) {
              methodContainer = document.createElement('div');
              methodContainer.id = 'tdsMethodContainer';
              methodContainer.style.display = 'none';
              document.body.appendChild(methodContainer);
            }
            if (!challengeContainer) {
              challengeContainer = document.createElement('div');
              challengeContainer.id = 'challengeContainer';
              document.body.appendChild(challengeContainer);
            }

            const cleanPhoneForTDS = customer.phone?.replace(/\D/g, '') || '';
            const orderData3DS = {
              payments: [{
                payment_method: "credit_card",
                credit_card: {
                  card: {
                    number: creditCard.number.replace(/\s/g, ""),
                    holder_name: creditCard.name,
                    exp_month: parseInt(expMonth),
                    exp_year: 2000 + parseInt(expYear),
                    billing_address: {
                      country: "BR",
                      state: "SP",
                      city: "São Paulo",
                      zip_code: creditCard.postalCode?.replace(/\D/g, "") || "00000000",
                      line_1: "1, Rua Principal, Centro",
                      line_2: "",
                    },
                  },
                },
                amount: Math.round(finalAmount * 100),
              }],
              customer: {
                name: customer.name,
                email: customer.email,
                document: customer.cpf.replace(/\D/g, ""),
                phones: cleanPhoneForTDS ? {
                  mobile_phone: {
                    country_code: "55",
                    area_code: cleanPhoneForTDS.slice(0, 2),
                    number: cleanPhoneForTDS.slice(2),
                  },
                } : undefined,
              },
              items: [{ description: product.name, code: product.id }],
              shipping: { recipient_name: customer.name, electronic_delivery: true },
            };

            const tdsResponse = await (window as any).TDS.init({
              token: tokenData.token,
              tds_method_container_element: methodContainer,
              challenge_container_element: challengeContainer,
              use_default_challenge_iframe_style: true,
              challenge_window_size: '03',
            }, orderData3DS);

            if (tdsResponse?.[0]?.trans_status === 'Y' || tdsResponse?.[0]?.trans_status === 'A') {
              dsTransactionId = tdsResponse[0].tds_server_trans_id;
            } else if (tdsResponse?.[0]?.trans_status === 'N' || tdsResponse?.[0]?.trans_status === 'R') {
              throw new Error("Autenticação do cartão negada pelo emissor. Tente outro cartão.");
            }
          }
        } catch (tdsErr: any) {
          // If 3DS entirely fails, proceed without it (graceful degradation)
          if (tdsErr?.message?.includes("negada")) throw tdsErr;
          console.warn("[Checkout] 3DS fallback:", tdsErr?.message);
        }

        // Step 2: Create payment via Pagar.me
        const { data, error } = await supabase.functions.invoke("create-pagarme-card-payment", {
          body: {
            amount: finalAmount,
            product_id: product.id,
            installments: creditCard.installments,
            is_subscription: product.is_subscription,
            billing_cycle: product.billing_cycle,
            config_id: requestedConfigId || null,
            coupon_id: coupon?.id || null,
            bump_product_ids: bumpProductIds2,
            checkout_url: window.location.href,
            utms: utms2,
            ds_transaction_id: dsTransactionId,
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpf,
              phone: customer.phone,
              postalCode: creditCard.postalCode,
              creditCard: {
                number: creditCard.number.replace(/\s/g, ""),
                holderName: creditCard.name,
                expMonth: expMonth,
                expYear: `20${expYear}`,
                cvv: creditCard.cvv,
              },
            },
          },
        });
        if (error) {
          let msg = "Falha ao processar pagamento com cartão";
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) msg = body.error;
            }
          } catch {}
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        if (data?.payment_id) {
          toast.success("Pagamento processado com sucesso!");
          trackPurchase(finalAmount, "BRL", data.payment_id);
          await markPurchased();
          navigate(`/checkout/sucesso?product=${encodeURIComponent(product.name)}&method=credit_card&email=${encodeURIComponent(customer.email)}&product_id=${product.id}${data.order_id ? `&order_id=${data.order_id}` : ''}`);
        } else {
          throw new Error("Falha ao processar pagamento");
        }
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
                          className="border-[#007185] data-[state=checked]:bg-[#007185] pointer-events-none"
                          tabIndex={-1}
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
          setTimeout(() => {
            navigate(`/checkout/sucesso?product=${encodeURIComponent(product.name)}&method=pix&email=${encodeURIComponent(customer.email)}`);
          }, 2500);
        }}
      />
    </div>
  );
};

export default Checkout;
