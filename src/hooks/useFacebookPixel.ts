import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCfGeo, getCountry as getGeoCountry, getCity, getState, getZip, getBestIp } from "@/lib/cfGeo";

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

/** Get or create a persistent visitor ID for journey tracking. */
function getVisitorId(): string {
  const key = "_vid";
  const urlVid = new URLSearchParams(window.location.search).get("vid");
  if (urlVid && urlVid.startsWith("v_")) {
    setCookie(key, urlVid, 390);
    return urlVid;
  }
  let vid = getCookie(key);
  if (!vid) {
    vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    setCookie(key, vid, 390);
  }
  return vid;
}

/** Generate or read _fbp cookie */
function ensureFbp(): string {
  let fbp = getCookie("_fbp");
  if (!fbp) {
    const rand = Math.floor(1000000000 + Math.random() * 9000000000);
    fbp = `fb.1.${Date.now()}.${rand}`;
    setCookie("_fbp", fbp, 390);
  }
  return fbp;
}

function getRawParam(name: string): string | null {
  const search = window.location.search.substring(1);
  const regex = new RegExp(`(?:^|&)${name}=([^&]*)`);
  const match = search.match(regex);
  return match ? match[1] : null;
}

function hydrateClickParams() {
  const fbcParam = getRawParam("fbc");
  if (fbcParam && fbcParam.startsWith("fb.") && !getCookie("_fbc")) {
    const fbcTs = parseInt(fbcParam.split(".")[2], 10);
    const isExpired = fbcTs && (Date.now() - fbcTs) > 90 * 24 * 60 * 60 * 1000;
    if (!isExpired) {
      setCookie("_fbc", fbcParam, 90);
    }
  }
  const fbclid = getRawParam("fbclid");
  if (fbclid && !getCookie("_fbc")) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    setCookie("_fbc", fbc, 90);
  }
  const existingFbc = getCookie("_fbc");
  if (existingFbc) {
    const ts = parseInt(existingFbc.split(".")[2], 10);
    if (ts && (Date.now() - ts) > 90 * 24 * 60 * 60 * 1000) {
      document.cookie = "_fbc=;max-age=0;path=/";
    }
  }
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

/** Build the geo payload sent to CAPI from window.cfGeo (Cloudflare Worker). */
function buildGeoPayload() {
  const geo = getCfGeo();
  if (!geo) return null;
  return {
    city: getCity() || undefined,
    state: getState() || undefined,
    zip: getZip() || undefined,
    country: getGeoCountry() || undefined,
  };
}

export function useFacebookPixel(productId: string | undefined, productPrice?: number, productName?: string, productCurrency?: string) {
  const initializedRef = useRef(false);
  const pixelIdsRef = useRef<string[]>([]);
  const firedEventsRef = useRef<Set<string>>(new Set());
  const customerRef = useRef<CustomerInfo>({});
  const advancedMatchingSignatureRef = useRef<string | null>(null);
  const pageViewEnrichSentRef = useRef(false);
  const productPriceRef = useRef(productPrice);
  const productNameRef = useRef(productName);
  const productCurrencyRef = useRef(productCurrency);
...
  /**
   * Set Advanced Matching data. Phone country prefix is dynamic based on
   * Cloudflare-detected country (only forces +55 when country is BR).
   */
  const setAdvancedMatching = useCallback((customer: CustomerInfo) => {
    customerRef.current = customer;

    const normalizedName = normalizeParam(customer.name);
    const normalizedEmail = normalizeParam(customer.email);
    const normalizedPhone = digitsOnly(customer.phone);
    const normalizedCpf = digitsOnly(customer.cpf);
    const signature = [normalizedName, normalizedEmail, normalizedPhone, normalizedCpf].join("|");

    if (!window.fbq || pixelIdsRef.current.length === 0) return;
    if (!normalizedName || !normalizedEmail || !normalizedPhone || !normalizedCpf) return;
    if (advancedMatchingSignatureRef.current === signature) return;

    advancedMatchingSignatureRef.current = signature;

    if (!pageViewEnrichSentRef.current) {
      pageViewEnrichSentRef.current = true;
      const enrichId = generateEventId("PageView_enrich");
      sendCAPI("PageView", enrichId, {
        content_type: "product",
        content_ids: productId ? [productId] : [],
      });
    }

    const nameParts = normalizedName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Dynamic country prefix — only force +55 if visitor is BR
    const country = getGeoCountry() || "BR";
    let formattedPhone = normalizedPhone ? `+${normalizedPhone}` : "";
    if (country === "BR" && normalizedPhone && !normalizedPhone.startsWith("55")) {
      formattedPhone = `+55${normalizedPhone}`;
    }

    const userData: Record<string, string> = {};
    if (normalizedEmail) userData.em = normalizedEmail;
    if (firstName) userData.fn = firstName;
    if (lastName) userData.ln = lastName;
    if (formattedPhone) userData.ph = formattedPhone;
    if (normalizedCpf) userData.external_id = normalizedCpf;

    // Geo advanced matching (browser-side)
    const ct = getCity();
    const st = getState();
    const zp = getZip();
    if (ct) userData.ct = normalizeParam(ct).replace(/\s+/g, "");
    if (st) userData.st = normalizeParam(st);
    if (zp) userData.zp = digitsOnly(zp);
    userData.country = country.toLowerCase();

    pixelIdsRef.current.forEach((pixelId) => {
      window.fbq("init", pixelId, userData);
    });
  }, [productId, sendCAPI]);

  const trackAddPaymentInfo = useCallback((paymentMethod: string) => {
    const dedup = "AddPaymentInfo";
    if (firedEventsRef.current.has(dedup)) return;
    firedEventsRef.current.add(dedup);

    const eventId = generateEventId("AddPaymentInfo");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: productId ? [productId] : [],
      payment_method: paymentMethod,
      currency: resolveCurrency(),
    };
    if (productPriceRef.current) customData.value = productPriceRef.current;
    if (productNameRef.current) customData.content_name = productNameRef.current;

    if (window.fbq) {
      window.fbq("track", "AddPaymentInfo", customData, { eventID: eventId });
    }
    sendCAPI("AddPaymentInfo", eventId, customData);
  }, [productId, sendCAPI, resolveCurrency]);

  const trackAddToCartMain = useCallback(() => {
    const dedupKey = "AddToCart_main";
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = generateEventId("AddToCart");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: productId ? [productId] : [],
      currency: resolveCurrency(),
    };
    if (productPriceRef.current) customData.value = productPriceRef.current;
    if (productNameRef.current) customData.content_name = productNameRef.current;

    if (window.fbq) {
      window.fbq("track", "AddToCart", customData, { eventID: eventId });
    }
    sendCAPI("AddToCart", eventId, customData);
  }, [productId, sendCAPI, resolveCurrency]);

  const trackAddToCart = useCallback((bumpProductId: string, bumpPrice?: number) => {
    const dedupKey = `AddToCart_${bumpProductId}`;
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = generateEventId("AddToCart");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: [bumpProductId],
      value: bumpPrice || 0,
      currency: resolveCurrency(),
    };

    if (window.fbq) {
      window.fbq("track", "AddToCart", customData, { eventID: eventId });
    }
    sendCAPI("AddToCart", eventId, customData);
  }, [productId, sendCAPI, resolveCurrency]);

  const trackPurchase = useCallback((
    value: number,
    currency?: string,
    orderId?: string,
    bumpItems?: Array<{ id: string; price: number; name?: string }>,
  ) => {
    const dedupKey = orderId ? `Purchase_${orderId}` : "Purchase";
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = orderId || generateEventId("Purchase");

    // Build contents[] with main product + bump products
    const bumpTotal = (bumpItems || []).reduce((s, b) => s + b.price, 0);
    const mainPrice = Number(Math.max(0, value - bumpTotal).toFixed(2));
    const contents: Array<{ id: string; quantity: number; item_price: number }> = [
      { id: productId!, quantity: 1, item_price: mainPrice },
      ...(bumpItems || []).map((b) => ({ id: b.id, quantity: 1, item_price: b.price })),
    ];

    const customData: Record<string, unknown> = {
      value,
      currency: resolveCurrency(currency),
      content_type: "product",
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: contents.length,
    };
    if (productNameRef.current) customData.content_name = productNameRef.current;
    if (orderId) customData.order_id = orderId;

    if (window.fbq) {
      window.fbq("track", "Purchase", customData, { eventID: eventId });
    }
    sendCAPI("Purchase", eventId, customData);
  }, [productId, sendCAPI, resolveCurrency]);

  const trackSubscribe = useCallback((value: number, currency?: string, orderId?: string) => {
    const dedupKey = orderId ? `Subscribe_${orderId}` : "Subscribe";
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = orderId ? `sub_${orderId}` : generateEventId("Subscribe");
    const customData: Record<string, unknown> = {
      value,
      currency: resolveCurrency(currency),
      content_type: "product",
      content_ids: productId ? [productId] : [],
      predicted_ltv: Number((value * 12).toFixed(2)),
    };
    if (productNameRef.current) customData.content_name = productNameRef.current;
    if (orderId) customData.order_id = orderId;

    if (window.fbq) {
      window.fbq("track", "Subscribe", customData, { eventID: eventId });
    }
    sendCAPI("Subscribe", eventId, customData);
  }, [productId, sendCAPI, resolveCurrency]);

  const trackLead = useCallback(() => {
    if (firedEventsRef.current.has("Lead")) return;
    firedEventsRef.current.add("Lead");

    const eventId = generateEventId("Lead");
    const customData: Record<string, unknown> = {
      content_type: "product",
      content_ids: productId ? [productId] : [],
      currency: resolveCurrency(),
    };
    if (productPriceRef.current) customData.value = productPriceRef.current;
    if (productNameRef.current) customData.content_name = productNameRef.current;

    if (window.fbq) {
      window.fbq("track", "Lead", customData, { eventID: eventId });
    }
    sendCAPI("Lead", eventId, customData);
  }, [productId, sendCAPI, resolveCurrency]);

  return {
    trackPurchase,
    trackSubscribe,
    trackAddPaymentInfo,
    trackAddToCart,
    trackAddToCartMain,
    trackLead,
    setAdvancedMatching,
  };
}
