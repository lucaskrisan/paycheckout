// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TrackingScriptGenerator from "@/components/admin/TrackingScriptGenerator";
import { ArrowLeft, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PixelInfo {
  product_id: string;
  product_name: string;
  pixel_id: string;
  domain: string | null;
  platform: string;
}

const LandingScript = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pixels, setPixels] = useState<PixelInfo[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("product_pixels")
        .select("pixel_id, platform, domain, product_id, products(name)")
        .eq("user_id", user.id);

      if (data) {
        const mapped = data.map((p: any) => ({
          product_id: p.product_id,
          product_name: (p.products as any)?.name || "Produto",
          platform: p.platform,
          pixel_id: p.pixel_id,
          domain: p.domain,
        }));
        setPixels(mapped);
        const fb = mapped.filter((p) => p.platform === "facebook");
        const uniq = Array.from(
          new Map(fb.map((p) => [p.product_id, { id: p.product_id, name: p.product_name }])).values()
        );
        setProducts(uniq);
        if (uniq.length > 0) setSelectedProduct(uniq[0].id);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 -m-6 p-6 min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-200 gap-1.5"
          onClick={() => navigate("/admin/integrations")}
        >
          <ArrowLeft className="w-4 h-4" /> Integrações
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-cyan-500/10">
          <Code2 className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Script de Rastreamento da Landing</h1>
          <p className="text-[11px] text-slate-500">
            Cole esse script no <code className="text-cyan-400">&lt;head&gt;</code> da sua página de vendas. Ele dispara Pixel + CAPI, captura UTMs e leva tudo pro checkout.
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-8 text-center space-y-3">
          <Code2 className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-300">Nenhum pixel Facebook configurado ainda</p>
            <p className="text-xs text-slate-500 mt-1">
              Antes de gerar o script, configure o Pixel ID e Token CAPI dentro do produto.
            </p>
          </div>
          <Button onClick={() => navigate("/admin/products")} size="sm" className="gap-1.5">
            Ir para Produtos
          </Button>
        </div>
      ) : (
        <TrackingScriptGenerator
          pixels={pixels}
          products={products}
          checkoutBaseUrl="https://app.panttera.com.br"
          selectedProductId={selectedProduct}
          onProductChange={setSelectedProduct}
        />
      )}
    </div>
  );
};

export default LandingScript;
