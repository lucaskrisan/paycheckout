import type { SalesBlock } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  block: SalesBlock;
  onChange: (updated: SalesBlock) => void;
}

const SalesBlockEditor = ({ block, onChange }: Props) => {
  const p = block.props;
  const set = (key: string, value: any) =>
    onChange({ ...block, props: { ...p, [key]: value } });
  const setItem = (key: string, idx: number, field: string, val: any) => {
    const items = [...(p[key] || [])];
    items[idx] = { ...items[idx], [field]: val };
    set(key, items);
  };
  const addItem = (key: string, template: any) => set(key, [...(p[key] || []), template]);
  const removeItem = (key: string, idx: number) => set(key, (p[key] || []).filter((_: any, i: number) => i !== idx));

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label>Subtítulo</Label><Textarea value={p.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></div>
          <div><Label>Texto do botão</Label><Input value={p.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} /></div>
          <div><Label>URL da imagem</Label><Input value={p.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." /></div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <div><Label>URL do vídeo (embed)</Label><Input value={p.videoUrl || ""} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/embed/..." /></div>
          <div><Label>Legenda</Label><Input value={p.caption || ""} onChange={(e) => set("caption", e.target.value)} /></div>
        </div>
      );

    case "benefits":
      return (
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
          {(p.items || []).map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <Input className="w-12 shrink-0" value={item.icon || ""} onChange={(e) => setItem("items", i, "icon", e.target.value)} />
              <Input className="flex-1" value={item.text || ""} onChange={(e) => setItem("items", i, "text", e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => removeItem("items", i)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem("items", { icon: "✅", text: "" })}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
        </div>
      );

    case "testimonials":
      return (
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
          {(p.items || []).map((t: any, i: number) => (
            <div key={i} className="space-y-1 p-3 border border-border rounded-lg">
              <Input placeholder="Nome" value={t.name || ""} onChange={(e) => setItem("items", i, "name", e.target.value)} />
              <Textarea placeholder="Depoimento" value={t.text || ""} onChange={(e) => setItem("items", i, "text", e.target.value)} />
              <div className="flex items-center gap-2">
                <Label className="text-xs">Estrelas</Label>
                <Input type="number" className="w-16" min={1} max={5} value={t.rating || 5} onChange={(e) => setItem("items", i, "rating", parseInt(e.target.value))} />
                <Button variant="ghost" size="icon" onClick={() => removeItem("items", i)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem("items", { name: "", text: "", rating: 5 })}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
          {(p.items || []).map((item: any, i: number) => (
            <div key={i} className="space-y-1 p-3 border border-border rounded-lg">
              <Input placeholder="Pergunta" value={item.question || ""} onChange={(e) => setItem("items", i, "question", e.target.value)} />
              <Textarea placeholder="Resposta" value={item.answer || ""} onChange={(e) => setItem("items", i, "answer", e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => removeItem("items", i)}><Trash2 className="w-3.5 h-3.5 mr-1" />Remover</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addItem("items", { question: "", answer: "" })}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
        </div>
      );

    case "guarantee":
      return (
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={p.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
          <div><Label>Dias de garantia</Label><Input type="number" value={p.days || 7} onChange={(e) => set("days", parseInt(e.target.value))} /></div>
        </div>
      );

    case "pricing":
      return (
        <div className="space-y-3">
          <div><Label>Texto do botão</Label><Input value={p.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} /></div>
          <div><Label>Destaque</Label><Input value={p.highlight || ""} onChange={(e) => set("highlight", e.target.value)} /></div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-3">
          <div><Label>Conteúdo</Label><Textarea rows={6} value={p.content || ""} onChange={(e) => set("content", e.target.value)} /></div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <div><Label>URL da imagem</Label><Input value={p.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://..." /></div>
          <div><Label>Alt text</Label><Input value={p.alt || ""} onChange={(e) => set("alt", e.target.value)} /></div>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <div><Label>Texto do botão</Label><Input value={p.text || ""} onChange={(e) => set("text", e.target.value)} /></div>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">Editor não disponível</p>;
  }
};

export default SalesBlockEditor;
