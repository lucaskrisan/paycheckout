import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCity, getState, getZip, getCountry } from "@/lib/cfGeo";
import type { CustomerData } from "@/components/checkout/CustomerForm";

interface UseAbandonedCartProps {
  productId: string;
  customer: CustomerData;
  paymentMethod: string;
  productOwnerId?: string | null;
  productPrice?: number | null;
}

function buildPayload(customer: CustomerData, paymentMethod: string, productOwnerId: string | null | undefined) {
  return {
    customer_name: customer.name.trim() || null,
    customer_email: customer.email.trim() || null,
    customer_phone: customer.phone.trim() || null,
    customer_cpf: customer.cpf.trim() || null,
    payment_method: paymentMethod,
    user_id: productOwnerId ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function useAbandonedCart({ productId, customer, paymentMethod, productOwnerId, productPrice }: UseAbandonedCartProps) {
  const cartIdRef = useRef<string | null>(null);
  const purchasedRef = useRef(false);
  const createdRef = useRef(false);
  const latestRef = useRef({ customer, paymentMethod, productOwnerId, productId, productPrice });
  latestRef.current = { customer, paymentMethod, productOwnerId, productId, productPrice };

  const hasMinimumData = Boolean(
    customer.email.trim().length >= 5 &&
    customer.phone.trim().length >= 8
  );

  const saveCart = useCallback(async () => {
    if (purchasedRef.current || !productId || !productOwnerId || !hasMinimumData) return;

    const payload = buildPayload(customer, paymentMethod, productOwnerId);

    try {
      const params = new URLSearchParams(window.location.search);

      if (cartIdRef.current) {
        const { error } = await supabase.rpc("update_abandoned_cart", {
          p_cart_id: cartIdRef.current,
          p_customer_name: payload.customer_name,
          p_customer_email: payload.customer_email,
          p_customer_phone: payload.customer_phone,
          p_customer_cpf: payload.customer_cpf,
          p_payment_method: payload.payment_method,
        });
        if (error) console.error("[abandoned-cart] update failed:", error.message);
        return;
      }

      if (createdRef.current) return;
      createdRef.current = true; // Set BEFORE await to prevent race condition

      const clientId = crypto.randomUUID();
      const { error } = await supabase
        .from("abandoned_carts")
        .insert({
          id: clientId,
          product_id: productId,
          ...payload,
          product_price: productPrice ?? null,
          page_url: window.location.href,
          checkout_url: window.location.href,
          event_source_url: window.location.origin + window.location.pathname,
          user_agent: navigator.userAgent,
          checkout_step: "opened",
          customer_city: getCity() || null,
          customer_zip: getZip() || null,
          customer_country: getCountry() || null,
          utm_source: params.get("utm_source") || null,
          utm_medium: params.get("utm_medium") || null,
          utm_campaign: params.get("utm_campaign") || null,
          utm_content: params.get("utm_content") || null,
          utm_term: params.get("utm_term") || null,
        } as any);

      if (!error) {
        cartIdRef.current = clientId;
      } else {
        console.error("[abandoned-cart] insert failed:", error.message);
        createdRef.current = false;
      }
    } catch (e) {
      console.error("[abandoned-cart] unexpected error:", e);
      if (!cartIdRef.current) createdRef.current = false;
    }
  }, [customer.cpf, customer.email, customer.name, customer.phone, hasMinimumData, paymentMethod, productId, productOwnerId]);

  // --- Create cart when minimum data is first available ---
  useEffect(() => {
    if (!hasMinimumData || cartIdRef.current || createdRef.current) return;
    saveCart();
  }, [hasMinimumData, saveCart]);

  // --- Debounced updates as fields change ---
  useEffect(() => {
    if (!hasMinimumData) return;
    const timeoutId = window.setTimeout(saveCart, 400);
    return () => window.clearTimeout(timeoutId);
  }, [customer.cpf, customer.email, customer.name, customer.phone, hasMinimumData, saveCart]);

  // --- Reliable page-exit saves using sendBeacon ---
  useEffect(() => {
    const flushViaBeacon = () => {
      const cartId = cartIdRef.current;
      if (!cartId || purchasedRef.current) return;

      const { customer: c, paymentMethod: pm } = latestRef.current;
      const payload = buildPayload(c, pm, latestRef.current.productOwnerId);

      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !anonKey) return;

      const body = JSON.stringify({
        p_cart_id: cartId,
        p_customer_name: payload.customer_name,
        p_customer_email: payload.customer_email,
        p_customer_phone: payload.customer_phone,
        p_customer_cpf: payload.customer_cpf,
        p_payment_method: payload.payment_method,
      });

      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(
        `${supabaseUrl}/rest/v1/rpc/update_abandoned_cart?apikey=${anonKey}`,
        blob,
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushViaBeacon();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushViaBeacon);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushViaBeacon);
    };
  }, []);

  const markPurchased = useCallback(async () => {
    purchasedRef.current = true;
    const { customer: c, productId: pid } = latestRef.current;

    if (cartIdRef.current) {
      await supabase
        .from("abandoned_carts")
        .update({ recovered: true })
        .eq("id", cartIdRef.current);
    }

    const email = c.email.trim();
    if (email && pid) {
      await supabase
        .from("abandoned_carts")
        .update({ recovered: true })
        .eq("product_id", pid)
        .eq("customer_email", email)
        .eq("recovered", false);
    }
  }, []);

  const markStep = useCallback(async (step: string) => {
    const cartId = cartIdRef.current;
    if (!cartId || purchasedRef.current) return;
    try {
      await supabase.rpc("update_abandoned_cart", {
        p_cart_id: cartId,
        p_checkout_step: step,
      });
    } catch (e) {
      console.error("[abandoned-cart] markStep error:", e);
    }
  }, []);

  return { markPurchased, markStep };
}
