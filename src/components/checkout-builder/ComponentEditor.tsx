import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { BuilderComponent } from "./types";

interface ComponentEditorProps {
  component: BuilderComponent;
  onUpdate: (id: string, props: Record<string, any>) => void;
  onRemove: (id: string) => void;
}

const ComponentEditor = ({ component, onUpdate, onRemove }: ComponentEditorProps) => {
  const update = (key: string, value: any) => {
    onUpdate(component.id, { ...component.props, [key]: value });
  };

  const renderFields = () => {
    switch (component.type) {
      case "text":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Conteúdo</Label>
            <Textarea
              value={component.props.content || ""}
              onChange={(e) => update("content", e.target.value)}
              rows={4}
              placeholder="Digite seu texto..."
            />
          </div>
        );

      case "image":
        return (
          <div className="space-y-2">
            <Label className="text-xs">URL da imagem</Label>
            <Input
              value={component.props.url || ""}
              onChange={(e) => update("url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        );

      case "header":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input
              value={component.props.title || ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Título do header"
            />
          </div>
        );

      case "countdown":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Texto</Label>
            <Input
              value={component.props.text || ""}
              onChange={(e) => update("text", e.target.value)}
              placeholder="Oferta termina em:"
            />
            <Label className="text-xs">Minutos</Label>
            <Input
              type="number"
              value={component.props.minutes || 15}
              onChange={(e) => update("minutes", parseInt(e.target.value))}
            />
          </div>
        );

      case "testimonial":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Depoimento</Label>
            <Textarea
              value={component.props.text || ""}
              onChange={(e) => update("text", e.target.value)}
              rows={3}
              placeholder="Texto do depoimento..."
            />
            <Label className="text-xs">Autor</Label>
            <Input
              value={component.props.author || ""}
              onChange={(e) => update("author", e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
        );

      case "seal":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input
              value={component.props.title || ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Compra Segura"
            />
            <Label className="text-xs">Subtítulo</Label>
            <Input
              value={component.props.subtitle || ""}
              onChange={(e) => update("subtitle", e.target.value)}
              placeholder="Ambiente protegido"
            />
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            <Label className="text-xs">URL do vídeo (YouTube/Vimeo)</Label>
            <Input
              value={component.props.url || ""}
              onChange={(e) => update("url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        );

      case "advantages":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Vantagens (uma por linha)</Label>
            <Textarea
              value={(component.props.items || ["Acesso imediato", "Suporte 24h", "Garantia de 7 dias"]).join("\n")}
              onChange={(e) => update("items", e.target.value.split("\n").filter(Boolean))}
              rows={4}
            />
          </div>
        );

      case "list":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Itens (um por linha)</Label>
            <Textarea
              value={(component.props.items || ["Item 1", "Item 2", "Item 3"]).join("\n")}
              onChange={(e) => update("items", e.target.value.split("\n").filter(Boolean))}
              rows={4}
            />
          </div>
        );

      default:
        return <p className="text-xs text-muted-foreground">Nenhuma configuração disponível.</p>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground capitalize">{component.type}</p>
        <Button variant="ghost" size="sm" onClick={() => onRemove(component.id)} className="text-destructive hover:text-destructive h-7 px-2">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {renderFields()}
    </div>
  );
};

export default ComponentEditor;
