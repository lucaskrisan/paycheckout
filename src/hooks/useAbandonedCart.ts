import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerData } from "@/components/checkout/CustomerForm";

interface UseAbandonedCartProps {
  productId: string;
  customer: CustomerData;
  paymentMethod: string;
  productOwnerId?: string | null;
}

export function useAbandonedCart({ productId, customer, paymentMethod, productOwnerId }: UseAbandonedCartProps) {
  const cartIdRef = useRef<string | null>(null);
  const purchasedRef = useRef(false);
  const createdRef = useRef(false);

  const hasCustomerData = Boolean(
    customer.name.trim() ||
    customer.email.trim() ||
    customer.phone.trim() ||
    customer.cpf.trim(),
  );

  const saveCart = useCallback(async () => {
    if (purchasedRef.current || !productId || !productOwnerId || !hasCustomerData) return;

    const payload = {
      customer_name: customer.name.trim() || null,
      customer_email: customer.email.trim() || null,
      customer_phone: customer.phone.trim() || null,
      customer_cpf: customer.cpf.trim() || null,
      payment_method: paymentMethod,
      user_id: productOwnerId,
      updated_at: new Date().toISOString(),
    };

    try {
      const params = new URLSearchParams(window.location.search);

      if (cartIdRef.current) {
        await supabase
          .from("abandoned_carts")
          .update(payload)
          .eq("id", cartIdRef.current);
        return;
      }

      if (createdRef.current) return;
      createdRef.current = true;

      const clientId = crypto.randomUUID();
      const { error } = await supabase
        .from("abandoned_carts")
        .insert({
          id: clientId,
          product_id: productId,
          ...payload,
          utm_source: params.get("utm_source") || null,
          utm_medium: params.get("utm_medium") || null,
          utm_campaign: params.get("utm_campaign") || null,
          utm_content: params.get("utm_content") || null,
          utm_term: params.get("utm_term") || null,
        });

      if (!error) {
        cartIdRef.current = clientId;
      } else {
        createdRef.current = false;
      }
    } catch {
      if (!cartIdRef.current) createdRef.current = false;
    }
  }, [customer.cpf, customer.email, customer.name, customer.phone, hasCustomerData, paymentMethod, productId, productOwnerId]);

  useEffect(() => {
    if (!hasCustomerData || cartIdRef.current || createdRef.current) return;
    saveCart();
  }, [hasCustomerData, saveCart]);

  useEffect(() => {
    if (!hasCustomerData) return;
    const timeoutId = window.setTimeout(saveCart, 400);
    return () => window.clearTimeout(timeoutId);
  }, [customer.cpf, customer.email, customer.name, customer.phone, hasCustomerData, saveCart]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      saveCart();
    };

    const handlePageExit = () => {
      saveCart();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
    };
  }, [saveCart]);

  const markPurchased = useCallback(async () => {
    purchasedRef.current = true;
    if (cartIdRef.current) {
      await supabase
        .from("abandoned_carts")
        .update({ recovered: true })
        .eq("id", cartIdRef.current);
    }
  }, []);

  return { markPurchased };
}
