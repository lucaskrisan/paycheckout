import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

/** Generate a unique event ID for deduplication */
function generateEventId(eventName: string): string {
  return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Hash value for Advanced Matching (lowercase, trimmed) */
function normalizeParam(value: string | undefined | null): string {
  return (value || "").trim().toLowerCase();
}

/** Remove non-digits */
function digitsOnly(value: string | undefined | null): string {
  return (value || "").replace(/\D/g, "");
}

/** Read a cookie by name — raw value, no decoding to preserve fbclid integrity */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

/** Set a first-party cookie — raw value, no encoding to preserve fbclid integrity */
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

/** Get or create a persistent visitor ID for journey tracking.
 *  If a `vid` query parameter exists (cross-domain from LP), adopt it. */
function getVisitorId(): string {
  const key = "_vid";

  // Cross-domain: LP passes vid as URL param — adopt it so the journey stays linked
  const urlVid = new URLSearchParams(window.location.search).get("vid");
  if (urlVid && urlVid.startsWith("v_")) {
    setCookie(key, urlVid, 390);
    return urlVid;
  }

  let vid = getCookie(key);
  if (!vid) {
    vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    setCookie(key, vid, 390); // ~13 months
  }
  return vid;
}

/** Generate or read _fbp cookie (fallback if Meta pixel didn't create one, e.g. adblock) */
function ensureFbp(): string {
  let fbp = getCookie("_fbp");
  if (!fbp) {
    // Meta _fbp format: fb.1.<creation_time>.<random_10_digits>
    const rand = Math.floor(1000000000 + Math.random() * 9000000000);
    fbp = `fb.1.${Date.now()}.${rand}`;
    setCookie("_fbp", fbp, 390);
  }
  return fbp;
}

/**
 * Extract a raw query parameter value WITHOUT URL-decoding.
 * URLSearchParams.get() auto-decodes percent-encoded chars, which modifies
 * Meta's fbclid (new format uses base64 with special chars). Meta flags
 * modified fbclid as a diagnostic error that hurts EMQ.
 */
function getRawParam(name: string): string | null {
  const search = window.location.search.substring(1); // remove leading "?"
  const regex = new RegExp(`(?:^|&)${name}=([^&]*)`);
  const match = search.match(regex);
  return match ? match[1] : null;
}

/**
 * Capture fbclid / fbp from URL params (cross-domain propagation).
 * Uses raw extraction (no URL-decoding) to preserve fbclid integrity.
 */
function hydrateClickParams() {
  // fbc passed cross-domain (already formatted fb.1.xxx.fbclid) → _fbc cookie
  const fbcParam = getRawParam("fbc");
  if (fbcParam && fbcParam.startsWith("fb.") && !getCookie("_fbc")) {
    // Validate age — Meta rejects ClickIDs older than 90 days
    const fbcTs = parseInt(fbcParam.split(".")[2], 10);
    const isExpired = fbcTs && (Date.now() - fbcTs) > 90 * 24 * 60 * 60 * 1000;
    if (!isExpired) {
      setCookie("_fbc", fbcParam, 90);
    }
  }

  // fbclid → _fbc cookie (fallback if fbc param wasn't passed)
  const fbclid = getRawParam("fbclid");
  if (fbclid && !getCookie("_fbc")) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", fbc, 90);
  }

  // Purge existing _fbc if older than 90 days
  const existingFbc = getCookie("_fbc");
  if (existingFbc) {
    const ts = parseInt(existingFbc.split(".")[2], 10);
    if (ts && (Date.now() - ts) > 90 * 24 * 60 * 60 * 1000) {
      document.cookie = "_fbc=;max-age=0;path=/";
    }
  }

  // fbp passed cross-domain → _fbp cookie (safe to use URLSearchParams here)
  const fbpParam = getRawParam("fbp");
  if (fbpParam && fbpParam.startsWith("fb.") && !getCookie("_fbp")) {
    setCookie("_fbp", fbpParam, 390);
  }
}

interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
}

export function useFacebookPixel(productId: string | undefined, productPrice?: number, productName?: string) {
  const initializedRef = useRef(false);
  const pixelIdsRef = useRef<string[]>([]);
  const firedEventsRef = useRef<Set<string>>(new Set());
  const customerRef = useRef<CustomerInfo>({});
  const productPriceRef = useRef(productPrice);
  const productNameRef = useRef(productName);

  // Keep refs updated
  useEffect(() => {
    productPriceRef.current = productPrice;
    productNameRef.current = productName;
  }, [productPrice, productName]);

  /** Send event to CAPI edge function (server-side, non-blocking) */
  const sendCAPI = useCallback((eventName: string, eventId: string, customData?: Record<string, unknown>) => {
    if (!productId) return;
    const visitorId = getVisitorId();
    const fbp = ensureFbp();

    supabase.functions.invoke("facebook-capi", {
      body: {
        product_id: productId,
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        customer: customerRef.current,
        custom_data: customData,
        fbc: getCookie("_fbc") || null,
        fbp: fbp,
        visitor_id: visitorId,
        user_agent: navigator.userAgent,
        log_browser: true,
      },
    }).catch((err) => console.warn("[CAPI] non-blocking error:", err));
  }, [productId]);


  useEffect(() => {
    if (!productId || initializedRef.current) return;

    // Hydrate fbclid/fbp from URL params (cross-domain decorator)
    hydrateClickParams();

    let cancelled = false;

    // Generate dedup IDs upfront so CAPI fallback uses same IDs
    const pvId = generateEventId("PageView");
    const icId = generateEventId("InitiateCheckout");

    const loadPixels = async () => {
      const { data } = await supabase
        .from("public_product_pixels" as any)
        .select("pixel_id, domain")
        .eq("product_id", productId)
        .eq("platform", "facebook");

      if (cancelled) return;

      // Always send CAPI for PageView & InitiateCheckout (log_browser: true handles both entries)
      sendCAPI("PageView", pvId);

      sendCAPI("InitiateCheckout", icId, {
        content_type: "product",
        content_ids: [productId],
      });

      if (!data || (data as any[]).length === 0) {
        initializedRef.current = true;
        return;
      }

      pixelIdsRef.current = (data as any[]).map((px: any) => px.pixel_id);

      // Inject FB Pixel base code if not already present
      if (!window.fbq) {
        const script = document.createElement("script");
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
        `;
        document.head.appendChild(script);
      }

      // Wait for fbq to be available then init each pixel
      const waitForFbq = setInterval(() => {
        if (window.fbq) {
          clearInterval(waitForFbq);

          // Init each pixel WITHOUT automatic config PageView
          (data as any[]).forEach((px: any) => {
            window.fbq("set", "autoConfig", false, px.pixel_id);
            window.fbq("init", px.pixel_id);
          });

          initializedRef.current = true;

          // Fire browser-side PageView + InitiateCheckout (same eventIDs for dedup)
          window.fbq("track", "PageView", {}, { eventID: pvId });
          window.fbq("track", "InitiateCheckout", {
            content_type: "product",
            content_ids: [productId],
          }, { eventID: icId });
        }
      }, 100);

      // If fbq never loads (adblock), still mark as initialized
      setTimeout(() => {
        clearInterval(waitForFbq);
        initializedRef.current = true;
      }, 5000);
    };

    loadPixels();
    return () => {
      cancelled = true;
    };
  }, [productId, sendCAPI]);

  /**
   * Set Advanced Matching data (call when customer fills the form).
   */
  const setAdvancedMatching = useCallback((customer: CustomerInfo) => {
    customerRef.current = customer;

    if (!window.fbq || pixelIdsRef.current.length === 0) return;

    const nameParts = normalizeParam(customer.name).split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const phone = digitsOnly(customer.phone);
    const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;

    const userData: Record<string, string> = {};
    if (customer.email) userData.em = normalizeParam(customer.email);
    if (firstName) userData.fn = firstName;
    if (lastName) userData.ln = lastName;
    if (formattedPhone) userData.ph = formattedPhone;
    if (customer.cpf) userData.external_id = digitsOnly(customer.cpf);

    pixelIdsRef.current.forEach((pixelId) => {
      window.fbq("init", pixelId, userData);
    });
  }, []);

  /**
   * Track AddPaymentInfo event (when user selects payment method).
   * Fires only once per session.
   */
  const trackAddPaymentInfo = useCallback((paymentMethod: string) => {
    const dedup = "AddPaymentInfo";
    if (firedEventsRef.current.has(dedup)) return;
    firedEventsRef.current.add(dedup);

    const eventId = generateEventId("AddPaymentInfo");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: productId ? [productId] : [],
      payment_method: paymentMethod,
      currency: "BRL",
    };
    if (productPriceRef.current) customData.value = productPriceRef.current;
    if (productNameRef.current) customData.content_name = productNameRef.current;

    if (window.fbq) {
      window.fbq("track", "AddPaymentInfo", customData, { eventID: eventId });
    }
    sendCAPI("AddPaymentInfo", eventId, customData);
  }, [productId, sendCAPI]);

  /**
   * Track AddToCart for the main product (fired on buy click).
   */
  const trackAddToCartMain = useCallback(() => {
    const dedupKey = "AddToCart_main";
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = generateEventId("AddToCart");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: productId ? [productId] : [],
      currency: "BRL",
    };
    if (productPriceRef.current) customData.value = productPriceRef.current;
    if (productNameRef.current) customData.content_name = productNameRef.current;

    if (window.fbq) {
      window.fbq("track", "AddToCart", customData, { eventID: eventId });
    }
    sendCAPI("AddToCart", eventId, customData);
  }, [productId, sendCAPI]);

  /**
   * Track AddToCart event (Order Bump selected).
   */
  const trackAddToCart = useCallback((bumpProductId: string, bumpPrice?: number) => {
    const dedupKey = `AddToCart_${bumpProductId}`;
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = generateEventId("AddToCart");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: [bumpProductId],
      value: bumpPrice || 0,
      currency: "BRL",
    };

    if (window.fbq) {
      window.fbq("track", "AddToCart", customData, { eventID: eventId });
    }
    sendCAPI("AddToCart", eventId, customData);
  }, [productId, sendCAPI]);

  /**
   * Track Purchase event with full data and deduplication.
   */
  const trackPurchase = useCallback((value: number, currency = "BRL", orderId?: string) => {
    const dedupKey = orderId ? `Purchase_${orderId}` : "Purchase";
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = orderId || generateEventId("Purchase");
    const customData: Record<string, unknown> = {
      value,
      currency,
      content_type: "product",
      content_ids: productId ? [productId] : [],
      num_items: 1,
    };
    if (productNameRef.current) customData.content_name = productNameRef.current;
    if (orderId) customData.order_id = orderId;

    if (window.fbq) {
      window.fbq("track", "Purchase", customData, { eventID: eventId });
    }
    sendCAPI("Purchase", eventId, customData);
  }, [productId, sendCAPI]);

  /**
   * Track custom lead/contact event (e.g., after form fill).
   */
  const trackLead = useCallback(() => {
    if (firedEventsRef.current.has("Lead")) return;
    firedEventsRef.current.add("Lead");

    const eventId = generateEventId("Lead");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: productId ? [productId] : [],
      currency: "BRL",
    };
    if (productPriceRef.current) customData.value = productPriceRef.current;
    if (productNameRef.current) customData.content_name = productNameRef.current;

    if (window.fbq) {
      window.fbq("track", "Lead", customData, { eventID: eventId });
    }
    sendCAPI("Lead", eventId, customData);
  }, [productId, sendCAPI]);

  return {
    trackPurchase,
    trackAddPaymentInfo,
    trackAddToCart,
    trackAddToCartMain,
    trackLead,
    setAdvancedMatching,
  };
}
