import * as React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cookie_consent_given";

interface CookieConsentProps {
  className?: string;
  onAccept?: () => void;
}

function CookieConsent({ className, onAccept }: CookieConsentProps) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const handleAccept = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // silently fail
    }
    setShow(false);
    onAccept?.();
  }, [onAccept]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md",
            className
          )}
        >
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:gap-4">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{" "}
              <Link
                to="/cookies"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Política de Cookies
              </Link>
              {" "}e{" "}
              <Link
                to="/privacidade"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Política de Privacidade
              </Link>.
            </p>
            <button
              onClick={handleAccept}
              className="shrink-0 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Aceitar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { CookieConsent };
export type { CookieConsentProps };
