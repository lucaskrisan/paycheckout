import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Eye, Globe } from "lucide-react";
import type { SalesBlock, SalesBlockType } from "@/components/sales-builder/types";
import { SALES_BLOCK_CATALOG } from "@/components/sales-builder/types";
import SalesBlockPalette from "@/components/sales-builder/SalesBlockPalette";
import SalesBuilderCanvas from "@/components/sales-builder/SalesBuilderCanvas";
import SalesBlockEditor from "@/components/sales-builder/SalesBlockEditor";

const SalesPageBuilder = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [blocks, setBlocks] = useState<SalesBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;
  const checkoutUrl = productId ? `https://paycheckout.lovable.app/checkout/${productId}` : "#";

  useEffect(() => {
    if (!productId) return;
    loadProduct();
    loadSalesPage();
  }, [productId]);

  const loadProduct = async () => {
    const { data } = await supabase.from("products").select("*").eq("id", productId!).single();
    if (data) setProduct(data);
  };

  const loadSalesPage = async () => {
    const { data } = await supabase
      .from("sales_pages")
      .select("*")
      .eq("product_id", productId!)
      .maybeSingle();
    if (data) {
      setPageId(data.id);
      setSlug(data.slug);
      setPublished(data.published);
      setBlocks((data.layout as any as SalesBlock[]) || []);
    } else {
      // Auto-generate slug from product name
      const { data: prod } = await supabase.from("products").select("name").eq("id", productId!).single();
      if (prod) {
        const autoSlug = prod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        setSlug(autoSlug);
      }
    }
  };

  const handleSave = async () => {
    if (!user || !productId) return;
    if (!slug.trim()) { toast.error("Defina um slug para a página"); return; }
    setSaving(true);

    const payload = {
      product_id: productId,
      user_id: user.id,
      slug: slug.trim(),
      title: product?.name || "",
      layout: blocks as any,
      settings: {},
      published,
    };

    let error;
    if (pageId) {
      ({ error } = await supabase.from("sales_pages").update(payload).eq("id", pageId));
    } else {
      const { data, error: e } = await supabase.from("sales_pages").insert(payload).select("id").single();
      error = e;
      if (data) setPageId(data.id);
    }

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Esse slug já está em uso" : "Erro ao salvar");
    } else {
      toast.success("Página salva!");
    }
    setSaving(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const fromPalette = active.data.current?.fromPalette;
    if (fromPalette) {
      const type = active.data.current!.type as SalesBlockType;
      const catalog = SALES_BLOCK_CATALOG.find((c) => c.type === type);
      const newBlock: SalesBlock = {
        id: crypto.randomUUID(),
        type,
        order: blocks.length,
        props: { ...(catalog?.defaultProps || {}) },
      };
      setBlocks((prev) => [...prev, newBlock]);
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setBlocks((prev) => {
        const reordered = arrayMove(prev, oldIndex, newIndex);
        return reordered.map((b, i) => ({ ...b, order: i }));
      });
    }
  };

  const handleBlockChange = useCallback((updated: SalesBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/products/${productId}/edit`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-sm font-bold text-foreground">{product?.name || "Página de Vendas"}</p>
            <p className="text-[11px] text-muted-foreground">Sales Page Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Publicada</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          {published && slug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/v/${slug}`, "_blank")}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Ver
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-52px)]">
          {/* Left panel - Palette */}
          <div className="w-56 shrink-0 bg-card border-r border-border overflow-y-auto p-4 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs">Slug da página</Label>
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="meu-produto"
                  className="text-xs h-8"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">/v/{slug || "..."}</p>
            </div>
            <SalesBlockPalette />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[800px] mx-auto">
              <SalesBuilderCanvas
                blocks={blocks}
                selectedId={selectedId}
                onRemove={(id) => {
                  setBlocks((prev) => prev.filter((b) => b.id !== id));
                  if (selectedId === id) setSelectedId(null);
                }}
                onSelect={setSelectedId}
                productName={product?.name}
                productPrice={product?.price}
                originalPrice={product?.original_price}
                checkoutUrl={checkoutUrl}
              />
            </div>
          </div>

          {/* Right panel - Editor */}
          <div className="w-72 shrink-0 bg-card border-l border-border overflow-y-auto p-4">
            {selectedBlock ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Editar: {SALES_BLOCK_CATALOG.find((c) => c.type === selectedBlock.type)?.label || selectedBlock.type}
                </p>
                <SalesBlockEditor block={selectedBlock} onChange={handleBlockChange} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Selecione um bloco para editar
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
};

export default SalesPageBuilder;
