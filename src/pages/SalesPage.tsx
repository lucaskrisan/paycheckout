import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { SalesBlock } from "@/components/sales-builder/types";
import SalesBlockPreview from "@/components/sales-builder/SalesBlockPreview";

const SalesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    const { data, error } = await supabase
      .from("sales_pages")
      .select("*")
      .eq("slug", slug!)
      .eq("published", true)
      .maybeSingle();

    if (!data || error) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPage(data);

    const { data: prod } = await supabase
      .from("products")
      .select("*")
      .eq("id", data.product_id)
      .single();
    if (prod) setProduct(prod);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
        <p className="text-muted-foreground">Essa página de vendas não existe ou não está publicada.</p>
      </div>
    );
  }

  const blocks: SalesBlock[] = (page?.layout as any as SalesBlock[]) || [];
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const checkoutUrl = product ? `https://paycheckout.lovable.app/checkout/${product.id}` : "#";

  return (
    <div className="min-h-screen bg-background">
      {sorted.map((block) => (
        <SalesBlockPreview
          key={block.id}
          block={block}
          productName={product?.name}
          productPrice={product?.price}
          originalPrice={product?.original_price}
          checkoutUrl={checkoutUrl}
        />
      ))}
    </div>
  );
};

export default SalesPage;
