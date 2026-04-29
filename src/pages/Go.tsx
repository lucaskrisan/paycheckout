import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const REDIRECT_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/ab-redirect`;

export default function Go() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (slug) {
      const type = searchParams.get("type") || "page";
      const utms = searchParams.toString();
      const finalUrl = `${REDIRECT_BASE}/${slug}?${utms}`;
      window.location.href = finalUrl;
    }
  }, [slug, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Redirecionando...</p>
      </div>
    </div>
  );
}
