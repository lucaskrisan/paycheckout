import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { resolveUserDestination } from "@/lib/resolveUserDestination";
import { Loader2 } from "lucide-react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import AllFeatures from "@/components/landing/AllFeatures";
import SocialProof from "@/components/landing/SocialProof";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";

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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-emerald-500/20">
      {/* Ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse,_rgba(16,185,129,0.07)_0%,_transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,_rgba(16,185,129,0.03)_0%,_transparent_70%)]" />
      </div>

      <LandingHeader />
      <HeroSection />
      <SocialProof />
      <FeaturesGrid />
      <AllFeatures />
      <CTASection />
      <LandingFooter />
    </div>
  );
};

export default Index;
