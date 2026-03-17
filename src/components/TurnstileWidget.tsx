import { useEffect, useRef, useCallback } from "react";

const SITE_KEY = "0x4AAAAAACsSrQ-0RiyeU2_T";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const TurnstileWidget = ({ onVerify, onExpire }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !(window as any).turnstile) return;
    
    // Clear previous widget
    if (widgetIdRef.current) {
      try { (window as any).turnstile.remove(widgetIdRef.current); } catch {}
    }

    widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: "dark",
      callback: onVerify,
      "expired-callback": onExpire,
      "error-callback": () => onExpire?.(),
    });
  }, [onVerify, onExpire]);

  useEffect(() => {
    // If Turnstile script is already loaded
    if ((window as any).turnstile) {
      renderWidget();
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => renderWidget();
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current) {
        try { (window as any).turnstile.remove(widgetIdRef.current); } catch {}
      }
    };
  }, [renderWidget]);

  return <div ref={containerRef} className="flex justify-center my-2" />;
};

export default TurnstileWidget;
