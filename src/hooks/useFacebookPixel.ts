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

interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
}

export function useFacebookPixel(productId: string | undefined) {
  const initializedRef = useRef(false);
  const pixelIdsRef = useRef<string[]>([]);
  const firedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!productId || initializedRef.current) return;

    let cancelled = false;

    const loadPixels = async () => {
      const { data } = await supabase
        .from("product_pixels")
        .select("pixel_id, domain")
        .eq("product_id", productId)
        .eq("platform", "facebook");

      if (cancelled || !data || data.length === 0) return;

      pixelIdsRef.current = data.map((px) => px.pixel_id);

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

      // Wait for fbq to be available then init each pixel (NO auto PageView yet)
      const waitForFbq = setInterval(() => {
        if (window.fbq) {
          clearInterval(waitForFbq);

          // Init each pixel WITHOUT automatic config PageView
          data.forEach((px) => {
            window.fbq("set", "autoConfig", false, px.pixel_id);
            window.fbq("init", px.pixel_id);
          });

          initializedRef.current = true;

          // Fire PageView + InitiateCheckout with dedup
          const pvId = generateEventId("PageView");
          window.fbq("track", "PageView", {}, { eventID: pvId });

          const icId = generateEventId("InitiateCheckout");
          window.fbq("track", "InitiateCheckout", {
            content_type: "product",
            content_ids: [productId],
          }, { eventID: icId });
        }
      }, 100);

      setTimeout(() => clearInterval(waitForFbq), 5000);
    };

    loadPixels();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  /**
   * Set Advanced Matching data (call when customer fills the form).
   * This updates all initialized pixels with user data for better matching.
   */
  const setAdvancedMatching = useCallback((customer: CustomerInfo) => {
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

    // Re-init each pixel with Advanced Matching data
    pixelIdsRef.current.forEach((pixelId) => {
      window.fbq("init", pixelId, userData);
    });
  }, []);

  /**
   * Track AddPaymentInfo event (when user selects payment method).
   * Fires only once per session.
   */
  const trackAddPaymentInfo = useCallback((paymentMethod: string) => {
    if (!window.fbq) return;
    const dedup = "AddPaymentInfo";
    if (firedEventsRef.current.has(dedup)) return;
    firedEventsRef.current.add(dedup);

    const eventId = generateEventId("AddPaymentInfo");
    window.fbq("track", "AddPaymentInfo", {
      content_type: "product",
      payment_method: paymentMethod,
    }, { eventID: eventId });
  }, []);

  /**
   * Track Purchase event with full data and deduplication.
   */
  const trackPurchase = useCallback((value: number, currency = "BRL", orderId?: string) => {
    if (!window.fbq) return;
    // Dedup by orderId if available, otherwise by event name
    const dedupKey = orderId ? `Purchase_${orderId}` : "Purchase";
    if (firedEventsRef.current.has(dedupKey)) return;
    firedEventsRef.current.add(dedupKey);

    const eventId = orderId || generateEventId("Purchase");
    window.fbq("track", "Purchase", {
      value,
      currency,
      content_type: "product",
      content_ids: productId ? [productId] : [],
    }, { eventID: eventId });
  }, [productId]);

  /**
   * Track custom lead/contact event (e.g., after form fill).
   */
  const trackLead = useCallback(() => {
    if (!window.fbq) return;
    if (firedEventsRef.current.has("Lead")) return;
    firedEventsRef.current.add("Lead");

    const eventId = generateEventId("Lead");
    window.fbq("track", "Lead", {
      content_type: "product",
      content_ids: productId ? [productId] : [],
    }, { eventID: eventId });
  }, [productId]);

  return {
    trackPurchase,
    trackAddPaymentInfo,
    trackLead,
    setAdvancedMatching,
  };
}
