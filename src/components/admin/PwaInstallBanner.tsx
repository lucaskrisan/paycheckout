import { useEffect, useState, useCallback } from "react";
import { Smartphone, Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

interface Props {
  userId?: string;
}

export default function PwaInstallBanner({ userId }: Props) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (isStandalone()) return;
    if (localStorage.getItem("pwa-banner-dismissed") === "true") return;

    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem("pwa-banner-dismissed", "true");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [userId]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS()) {
      setIosOpen(true);
      return;
    }
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setVisible(false);
          localStorage.setItem("pwa-banner-dismissed", "true");
        }
      } catch (err) {
        console.error("[PwaInstallBanner] prompt error:", err);
      }
      setDeferredPrompt(null);
    } else {
      // Desktop / other — open iOS-style tooltip as generic fallback
      setIosOpen(true);
    }
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed bottom-6 right-6 z-50 w-52"
        >
          <div className="relative bg-card border border-border/40 rounded-xl shadow-xl p-4">
            <button
              onClick={dismiss}
              aria-label="Dispensar"
              className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Baixe nosso App
              </p>
            </div>

            <p className="text-xs text-muted-foreground mb-3 leading-snug">
              Gerencie suas vendas de qualquer lugar
            </p>

            <Popover open={iosOpen} onOpenChange={setIosOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="w-full gap-1.5 tabular-nums"
                  onClick={handleInstall}
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-64 text-xs leading-relaxed"
              >
                <p className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-primary" />
                  Instalar no iPhone
                </p>
                <p className="text-muted-foreground">
                  Toque em <strong className="text-foreground">Compartilhar</strong>{" "}
                  → <strong className="text-foreground">Adicionar à Tela de Início</strong>.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
