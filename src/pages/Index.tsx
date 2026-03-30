import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import AllFeatures from "@/components/landing/AllFeatures";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";
import ShowcaseSection from "@/components/landing/ShowcaseSection";
import WhatsAppSection from "@/components/landing/WhatsAppSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import NotificationsSection from "@/components/landing/NotificationsSection";
import AchievementsSection from "@/components/landing/AchievementsSection";
import CheckoutCustomSection from "@/components/landing/CheckoutCustomSection";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setResolving(false);
      setResolved(false);
      return;
    }
    if (resolved) return;

    let cancelled = false;
    setResolving(true);

    resolveUserDestination()
      .then((dest) => {
        if (!cancelled) {
          setResolved(true);
          navigate(dest, { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved(true);
          navigate("/completar-perfil", { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate, resolved]);

  // Load Crisp chat on landing page (super admin hardcoded ID)
  useEffect(() => {
    const crispId = "1d36332d-054f-443b-9a5d-1980537839eb";
    if ((window as any).CRISP_WEBSITE_ID) return;

    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = crispId;
    const s = document.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    document.head.appendChild(s);

    return () => {
      delete (window as any).$crisp;
      delete (window as any).CRISP_WEBSITE_ID;
      document.querySelectorAll('script[src*="crisp.chat"]').forEach(el => el.remove());
      document.querySelectorAll('[id^="crisp"]').forEach(el => el.remove());
      document.querySelectorAll('.crisp-client').forEach(el => el.remove());
    };
  }, []);

  if (loading || (user && resolving && !resolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-card shadow-[0_0_40px_hsl(var(--primary)/0.18)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">Carregando PanteraPay...</p>
            <p className="text-sm text-muted-foreground">Se demorar mais de alguns segundos, atualize a preview.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-[radial-gradient(ellipse,_rgba(0,230,118,0.04)_0%,_transparent_70%)]" />
      </div>

      <LandingHeader />
      <HeroSection />
      <ShowcaseSection />
      <WhatsAppSection />
      <FeaturesGrid />
      <CheckoutCustomSection />
      <IntegrationsSection />
      <NotificationsSection />
      <AllFeatures />
      <AchievementsSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
};

export default Index;
