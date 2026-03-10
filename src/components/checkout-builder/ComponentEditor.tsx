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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Imagem</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2">
                {component.props.url ? (
                  <img src={component.props.url} alt="" className="w-full h-20 object-cover rounded" />
                ) : (
                  <>
                    <div className="w-10 h-10 text-muted-foreground/40 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="text-xs text-primary cursor-pointer">Selecione do computador</p>
                    <p className="text-[10px] text-muted-foreground">ou arraste aqui</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG até 10 MB</p>
                  </>
                )}
              </div>
              <Input
                value={component.props.url || ""}
                onChange={(e) => update("url", e.target.value)}
                placeholder="Ou cole a URL da imagem"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Alinhamento</Label>
              <div className="flex border border-border rounded-md overflow-hidden">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => update("align", align)}
                    className={`flex-1 py-1.5 text-xs transition-colors ${
                      (component.props.align || "center") === align
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {align === "left" ? "≡ᐊ" : align === "center" ? "≡" : "ᐅ≡"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">URL de redirecionamento</Label>
              <div className="flex items-center gap-1.5 border border-input rounded-md px-2 py-1.5">
                <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <input
                  value={component.props.redirectUrl || ""}
                  onChange={(e) => update("redirectUrl", e.target.value)}
                  placeholder="https://"
                  className="flex-1 text-xs bg-transparent outline-none"
                />
              </div>
            </div>
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

      case "button":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Texto do botão</Label>
            <Input
              value={component.props.text || ""}
              onChange={(e) => update("text", e.target.value)}
              placeholder="Finalizar compra"
            />
          </div>
        );

      case "form":
        return <p className="text-xs text-muted-foreground">O formulário de checkout é gerado automaticamente com os campos de nome, email, CPF e telefone.</p>;

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
