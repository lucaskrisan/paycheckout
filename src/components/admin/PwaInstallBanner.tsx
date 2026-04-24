import { useEffect, useState, useCallback } from "react";
import { Smartphone, Download, Share } from "lucide-react";
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
  collapsed?: boolean;
}

export default function PwaInstallBanner({ userId, collapsed }: Props) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (isStandalone()) return;

    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [userId]);

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
        }
      } catch (err) {
        console.error("[PwaInstallBanner] prompt error:", err);
      }
      setDeferredPrompt(null);
    } else {
      setIosOpen(true);
    }
  }, [deferredPrompt]);

  if (!visible) return null;

  // Collapsed: apenas um ícone clicável
  if (collapsed) {
    return (
      <Popover open={iosOpen} onOpenChange={setIosOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={handleInstall}
            aria-label="Baixar app"
            className="mx-auto mb-2 w-9 h-9 rounded-lg bg-sidebar-primary/10 hover:bg-sidebar-primary/20 flex items-center justify-center transition-colors"
          >
            <Smartphone className="w-4 h-4 text-sidebar-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="end" className="w-64 text-xs leading-relaxed">
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
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-sidebar-primary/15 flex items-center justify-center shrink-0">
          <Smartphone className="w-3.5 h-3.5 text-sidebar-primary" />
        </div>
        <p className="text-[13px] font-semibold text-sidebar-accent-foreground leading-tight">
          Baixe nosso App
        </p>
      </div>

      <p className="text-[11px] text-sidebar-foreground/70 mb-2.5 leading-snug">
        Gerencie suas vendas de qualquer lugar
      </p>

      <Popover open={iosOpen} onOpenChange={setIosOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="w-full h-8 gap-1.5 text-xs tabular-nums"
            onClick={handleInstall}
          >
            <Download className="w-3.5 h-3.5" />
            Instalar
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" align="end" className="w-64 text-xs leading-relaxed">
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
  );
}
