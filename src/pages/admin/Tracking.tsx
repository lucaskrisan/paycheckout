import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Globe, Code2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PixelSummary {
  product_id: string;
  product_name: string;
  platform: string;
  pixel_id: string;
  domain: string | null;
  has_capi: boolean;
}

const Tracking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pixels, setPixels] = useState<PixelSummary[]>([]);
  const [domains, setDomains] = useState<{ id: string; domain: string; verified: boolean }[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [pixelRes, domainRes] = await Promise.all([
        supabase
          .from("product_pixels")
          .select("pixel_id, platform, domain, capi_token, product_id, products(name)")
          .eq("user_id", user.id),
        supabase
          .from("facebook_domains")
          .select("*")
          .eq("user_id", user.id),
      ]);

      if (pixelRes.data) {
        setPixels(
          pixelRes.data.map((p: any) => ({
            product_id: p.product_id,
            product_name: (p.products as any)?.name || "Produto",
            platform: p.platform,
            pixel_id: p.pixel_id,
            domain: p.domain,
            has_capi: !!p.capi_token,
          }))
        );
      }

      if (domainRes.data) {
        setDomains(domainRes.data as any);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const platformColors: Record<string, string> = {
    facebook: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "g ads": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "g analytics": "bg-orange-500/10 text-orange-500 border-orange-500/20",
    tiktok: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    taboola: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueProducts = [...new Set(pixels.map((p) => p.product_id))];
  const totalPixels = pixels.length;
  const capiEnabled = pixels.filter((p) => p.has_capi).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rastreamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral dos pixels e Conversions API configurados nos seus produtos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalPixels}</p>
            <p className="text-xs text-muted-foreground">Pixels configurados</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{capiEnabled}</p>
            <p className="text-xs text-muted-foreground">Com CAPI ativo</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{domains.length}</p>
            <p className="text-xs text-muted-foreground">Domínios verificados</p>
          </div>
        </Card>
      </div>

      {/* Pixels by product */}
      {uniqueProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <Code2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Nenhum pixel configurado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Configure pixels nos seus produtos em Produtos → Editar → Configurações → Pixels de conversão
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {uniqueProducts.map((productId) => {
            const productPixels = pixels.filter((p) => p.product_id === productId);
            const productName = productPixels[0]?.product_name || "Produto";

            return (
              <Card key={productId} className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground text-sm">{productName}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs gap-1"
                    onClick={() => navigate(`/admin/products/${productId}/edit`)}
                  >
                    Editar <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {productPixels.map((px, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 text-sm">
                      <Badge
                        variant="outline"
                        className={`text-xs ${platformColors[px.platform] || "border-border text-muted-foreground"}`}
                      >
                        {px.platform}
                      </Badge>
                      <span className="font-mono text-foreground">{px.pixel_id}</span>
                      {px.domain && (
                        <span className="text-xs text-muted-foreground">
                          via {px.domain}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        {px.has_capi ? (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> CAPI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                            <AlertCircle className="w-3 h-3" /> Sem CAPI
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Domains */}
      {domains.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Domínios verificados</h2>
          <Card>
            <div className="divide-y divide-border">
              {domains.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{d.domain}</span>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs ${
                      d.verified
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }`}
                  >
                    {d.verified ? "Verificado" : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Tracking;
