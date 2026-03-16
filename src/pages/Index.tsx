import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { Loader2 } from "lucide-react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import AllFeatures from "@/components/landing/AllFeatures";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";
import ShowcaseSection from "@/components/landing/ShowcaseSection";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setResolving(false); setResolved(false); return; }
    if (resolved) return;
    let cancelled = false;
    setResolving(true);
    resolveUserDestination()
      .then((dest) => { if (!cancelled) { setResolved(true); navigate(dest, { replace: true }); } })
      .catch(() => { if (!cancelled) { setResolved(true); navigate("/completar-perfil", { replace: true }); } });
    return () => { cancelled = true; };
  }, [user, loading, navigate, resolved]);

  if (loading || (user && resolving && !resolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-[radial-gradient(ellipse,_rgba(0,230,118,0.04)_0%,_transparent_70%)]" />
      </div>

      <LandingHeader />
      <HeroSection />
      <ShowcaseSection />
      <FeaturesGrid />
      <AllFeatures />
      <CTASection />
      <LandingFooter />
    </div>
  );
};

export default Index;
