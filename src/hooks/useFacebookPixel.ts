import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export function useFacebookPixel(productId: string | undefined) {
  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    const loadPixels = async () => {
      const { data } = await supabase
        .from("product_pixels")
        .select("pixel_id, domain")
        .eq("product_id", productId)
        .eq("platform", "facebook");

      if (cancelled || !data || data.length === 0) return;

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
          data.forEach((px) => {
            window.fbq("init", px.pixel_id);
          });
          window.fbq("track", "PageView");
          window.fbq("track", "InitiateCheckout");
        }
      }, 100);

      setTimeout(() => clearInterval(waitForFbq), 5000);
    };

    loadPixels();
    return () => { cancelled = true; };
  }, [productId]);

  const trackPurchase = useCallback((value: number, currency = "BRL") => {
    if (window.fbq) {
      window.fbq("track", "Purchase", { value, currency });
    }
  }, []);

  return { trackPurchase };
}
