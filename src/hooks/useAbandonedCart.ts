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
  const initializedRef = useRef(false);

  const saveCart = useCallback(async (force = false) => {
    if (purchasedRef.current) return;
    // Allow saving even without email/phone when forced (initial mount)
    if (!force && !customer.email && !customer.phone) return;

    try {
      const params = new URLSearchParams(window.location.search);

      if (cartIdRef.current) {
        // Update existing cart
        await supabase
          .from("abandoned_carts")
          .update({
            customer_name: customer.name || null,
            customer_email: customer.email || null,
            customer_phone: customer.phone || null,
            customer_cpf: customer.cpf || null,
            payment_method: paymentMethod,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cartIdRef.current);
      } else {
        // Insert new cart
        const { data } = await supabase
          .from("abandoned_carts")
          .insert({
            product_id: productId,
            customer_name: customer.name || null,
            customer_email: customer.email || null,
            customer_phone: customer.phone || null,
            customer_cpf: customer.cpf || null,
            payment_method: paymentMethod,
            utm_source: params.get("utm_source") || null,
            utm_medium: params.get("utm_medium") || null,
            utm_campaign: params.get("utm_campaign") || null,
            utm_content: params.get("utm_content") || null,
            utm_term: params.get("utm_term") || null,
            user_id: productOwnerId || null,
          })
          .select("id")
          .single();

        if (data) cartIdRef.current = data.id;
      }
    } catch {
      // Silent fail – don't block checkout
    }
  }, [productId, customer, paymentMethod, productOwnerId]);

  // Create cart immediately on mount (captures even visitors who leave without filling anything)
  useEffect(() => {
    if (!productId || initializedRef.current) return;
    initializedRef.current = true;
    saveCart(true);
  }, [productId, saveCart]);

  // Save on blur (tab switch / close) — use pagehide for mobile reliability
  useEffect(() => {
    const handler = () => saveCart();
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [saveCart]);

  // Debounced save when customer data changes
  useEffect(() => {
    if (!customer.email && !customer.phone) return;
    const t = setTimeout(saveCart, 2000);
    return () => clearTimeout(t);
  }, [customer.email, customer.phone, customer.name, saveCart]);

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
