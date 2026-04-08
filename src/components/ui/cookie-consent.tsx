import * as React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CookieIcon, ChevronRight, Shield, BarChart3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  isEssential?: boolean;
}

const DEFAULT_CATEGORIES: CookieCategory[] = [
  {
    id: "essential",
    name: "Cookies Essenciais",
    description:
      "Necessários para o funcionamento básico do site, como navegação, segurança e autenticação. Não podem ser desativados.",
    icon: <Shield className="h-4 w-4 text-emerald-600" />,
    isEssential: true,
  },
  {
    id: "analytics",
    name: "Cookies de Análise",
    description:
      "Coletam dados anônimos sobre como você usa a plataforma, nos ajudando a melhorar a experiência. Inclui ferramentas como Google Analytics e Microsoft Clarity.",
    icon: <BarChart3 className="h-4 w-4 text-blue-600" />,
  },
  {
    id: "marketing",
    name: "Cookies de Marketing",
    description:
      "Permitem a exibição de anúncios personalizados em plataformas como Meta (Facebook/Instagram) e Google Ads. Usados para medir a eficácia de campanhas.",
    icon: <Target className="h-4 w-4 text-purple-600" />,
  },
];

const STORAGE_KEY = "cookie_preferences";
const CONSENT_KEY = "cookie_consent_given";

interface CookieConsentProps {
  className?: string;
  categories?: CookieCategory[];
  onAccept?: (preferences: boolean[]) => void;
  onDecline?: () => void;
}

function CookieConsent({
  className,
  categories = DEFAULT_CATEGORIES,
  onAccept,
  onDecline,
}: CookieConsentProps) {
  const [mounted, setMounted] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = React.useState(false);
  const [preferences, setPreferences] = React.useState<boolean[]>(() =>
    categories.map((cat) => !!cat.isEssential)
  );

  React.useEffect(() => {
    setMounted(true);
    try {
      const consentGiven = localStorage.getItem(CONSENT_KEY) === "true";
      const storedPrefs = localStorage.getItem(STORAGE_KEY);
      if (consentGiven && storedPrefs) {
        const parsed = JSON.parse(storedPrefs) as boolean[];
        if (Array.isArray(parsed) && parsed.length === categories.length) {
          setPreferences(parsed);
          onAccept?.(parsed);
          return;
        }
      }
      setShowBanner(true);
    } catch {
      setShowBanner(true);
    }
  }, [categories.length, onAccept]);

  const savePreferences = React.useCallback(
    (prefs: boolean[]) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        localStorage.setItem(CONSENT_KEY, "true");
      } catch {
        // silently fail
      }
      setShowBanner(false);
      setShowCustomizeDialog(false);
      onAccept?.(prefs);
    },
    [onAccept]
  );

  const handleAcceptAll = React.useCallback(() => {
    const allTrue = categories.map(() => true);
    setPreferences(allTrue);
    savePreferences(allTrue);
  }, [categories, savePreferences]);

  const handleRejectAll = React.useCallback(() => {
    const essentialOnly = categories.map((cat) => !!cat.isEssential);
    setPreferences(essentialOnly);
    savePreferences(essentialOnly);
    onDecline?.();
  }, [categories, savePreferences, onDecline]);

  const handleSaveCustom = React.useCallback(() => {
    savePreferences(preferences);
  }, [preferences, savePreferences]);

  const handleToggle = React.useCallback(
    (index: number, checked: boolean) => {
      if (categories[index]?.isEssential) return;
      setPreferences((prev) => {
        const next = [...prev];
        next[index] = checked;
        return next;
      });
    },
    [categories]
  );

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "fixed bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 z-50 w-full sm:max-w-md",
              className
            )}
          >
            <div className="m-3 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-2xl">
              <div className="flex items-center gap-3 p-6 pb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <CookieIcon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Preferências de Cookies
                </h2>
              </div>
              <div className="px-6 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Utilizamos cookies para melhorar sua experiência, personalizar
                  conteúdo e analisar o tráfego. Em conformidade com a{" "}
                  <strong>LGPD (Lei 13.709/2018)</strong>, você pode gerenciar
                  suas preferências a qualquer momento.
                </p>
                <Link
                  to="/cookies"
                  className="text-xs inline-flex items-center text-primary hover:underline group font-medium transition-colors"
                >
                  Política de Cookies
                  <ChevronRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="p-4 flex flex-col sm:flex-row gap-3 border-t border-border/50 bg-muted/30 rounded-b-xl">
                <Button
                  onClick={handleAcceptAll}
                  size="sm"
                  className="w-full sm:flex-1 h-9 rounded-lg text-sm"
                >
                  Aceitar Todos
                </Button>
                <Button
                  onClick={() => setShowCustomizeDialog(true)}
                  size="sm"
                  variant="outline"
                  className="w-full sm:flex-1 h-9 rounded-lg text-sm"
                >
                  Personalizar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-lg z-[200] sm:max-w-[500px] p-0 gap-0 border-border/50 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-xl font-semibold">
              Gerenciar Cookies
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Personalize suas preferências de cookies abaixo. Em conformidade
              com a LGPD.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={cn(
                  "p-4 border rounded-xl transition-all duration-200",
                  preferences[index]
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-border/70"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        preferences[index] ? "bg-primary/10" : "bg-muted"
                      )}
                    >
                      {category.icon || (
                        <CookieIcon className="h-4 w-4" />
                      )}
                    </div>
                    <Label
                      htmlFor={`cookie-${index}`}
                      className="font-semibold text-base cursor-pointer"
                    >
                      {category.name}
                      {category.isEssential && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                Obrigatório
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Estes cookies não podem ser desativados.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </Label>
                  </div>
                  <Switch
                    id={`cookie-${index}`}
                    checked={preferences[index] || false}
                    onCheckedChange={(checked) => handleToggle(index, checked)}
                    disabled={category.isEssential}
                  />
                </div>
                <p className="text-sm mt-3 text-muted-foreground leading-relaxed">
                  {category.description}
                </p>
              </motion.div>
            ))}
          </div>
          <DialogFooter className="p-6 border-t border-border/50 bg-muted/30">
            <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleRejectAll}
                className="min-w-[120px]"
              >
                Rejeitar Todos
              </Button>
              <Button onClick={handleSaveCustom} className="min-w-[140px]">
                Salvar Preferências
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { CookieConsent };
export type { CookieCategory, CookieConsentProps };
