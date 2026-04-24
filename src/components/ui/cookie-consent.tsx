import * as React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

const STORAGE_KEY = "cookie_consent_given";
const CONSENT_PREFS_KEY = "cookie_consent_prefs";

type ConsentPrefs = {
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFS: ConsentPrefs = { analytics: true, marketing: true };

/** Push a Consent Mode v2 update to the dataLayer */
function pushConsentUpdate(prefs: ConsentPrefs) {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: any[]) { w.dataLayer.push(args); }
  gtag("consent", "update", {
    ad_storage: prefs.marketing ? "granted" : "denied",
    ad_user_data: prefs.marketing ? "granted" : "denied",
    ad_personalization: prefs.marketing ? "granted" : "denied",
    analytics_storage: prefs.analytics ? "granted" : "denied",
  });
}

/** Restore consent on page load if user already accepted */
function restoreConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_PREFS_KEY);
    if (raw) {
      const prefs: ConsentPrefs = JSON.parse(raw);
      pushConsentUpdate(prefs);
    }
  } catch {
    // noop
  }
}

interface CookieConsentProps {
  className?: string;
  onAccept?: () => void;
}

function CookieConsent({ className, onAccept }: CookieConsentProps) {
  const [show, setShow] = React.useState(false);
  const [showPrefs, setShowPrefs] = React.useState(false);
  const [prefs, setPrefs] = React.useState<ConsentPrefs>(DEFAULT_PREFS);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        restoreConsent();
      } else {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const accept = React.useCallback(
    (selectedPrefs: ConsentPrefs) => {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
        localStorage.setItem(CONSENT_PREFS_KEY, JSON.stringify(selectedPrefs));
      } catch {
        // silently fail
      }
      pushConsentUpdate(selectedPrefs);
      setShow(false);
      onAccept?.();
    },
    [onAccept]
  );

  const handleAcceptAll = React.useCallback(() => {
    accept({ analytics: true, marketing: true });
  }, [accept]);

  const handleAcceptSelected = React.useCallback(() => {
    accept(prefs);
  }, [accept, prefs]);

  const handleRejectOptional = React.useCallback(() => {
    accept({ analytics: false, marketing: false });
  }, [accept]);

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
          <div className="mx-auto max-w-5xl px-4 py-4">
            {/* Main row */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
              <div className="flex items-start gap-3 text-center sm:text-left">
                <Shield className="mt-0.5 hidden h-5 w-5 shrink-0 text-primary sm:block" />
                <p className="text-sm text-muted-foreground">
                  Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{" "}
                  <Link to="/cookies" className="font-medium text-primary underline-offset-2 hover:underline">
                    Política de Cookies
                  </Link>{" "}
                  e{" "}
                  <Link to="/privacidade" className="font-medium text-primary underline-offset-2 hover:underline">
                    Política de Privacidade
                  </Link>.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setShowPrefs((v) => !v)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Preferências
                </button>
                <button
                  onClick={handleRejectOptional}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Rejeitar opcionais
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Aceitar todos
                </button>
              </div>
            </div>

            {/* Preferences panel */}
            <AnimatePresence>
              {showPrefs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-3 rounded-lg border border-border bg-background/60 p-4 sm:grid-cols-3">
                    {/* Essential — always on */}
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked disabled className="accent-primary h-4 w-4 rounded" />
                      <div>
                        <span className="font-medium text-foreground">Essenciais</span>
                        <p className="text-xs text-muted-foreground">Necessários para o funcionamento</p>
                      </div>
                    </label>

                    {/* Analytics */}
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={prefs.analytics}
                        onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                        className="accent-primary h-4 w-4 rounded"
                      />
                      <div>
                        <span className="font-medium text-foreground">Análise</span>
                        <p className="text-xs text-muted-foreground">Estatísticas de navegação</p>
                      </div>
                    </label>

                    {/* Marketing */}
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={prefs.marketing}
                        onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                        className="accent-primary h-4 w-4 rounded"
                      />
                      <div>
                        <span className="font-medium text-foreground">Marketing</span>
                        <p className="text-xs text-muted-foreground">Anúncios personalizados</p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleAcceptSelected}
                      className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Salvar preferências
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { CookieConsent };
export type { CookieConsentProps };
