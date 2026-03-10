import { Clock, ThumbsUp, Star, Award, Image, Video, Facebook, LayoutGrid, ListOrdered, FileText, MousePointerClick } from "lucide-react";
import type { BuilderComponent } from "./types";

const ComponentPreview = ({ component }: { component: BuilderComponent }) => {
  switch (component.type) {
    case "text":
      return (
        <div className="py-2">
          <p className="text-sm text-foreground">{component.props.content || "Texto personalizado aqui..."}</p>
        </div>
      );

    case "image":
      return (
        <div className="py-2">
          {component.props.url ? (
            <img src={component.props.url} alt="" className="w-full h-32 object-cover rounded-lg" />
          ) : (
            <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center">
              <Image className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      );

    case "advantages":
      return (
        <div className="py-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <ThumbsUp className="w-3.5 h-3.5 text-primary" />
            <span>{component.props.items?.[0] || "Acesso imediato"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground">
            <ThumbsUp className="w-3.5 h-3.5 text-primary" />
            <span>{component.props.items?.[1] || "Suporte 24h"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground">
            <ThumbsUp className="w-3.5 h-3.5 text-primary" />
            <span>{component.props.items?.[2] || "Garantia de 7 dias"}</span>
          </div>
        </div>
      );

    case "seal":
      return (
        <div className="py-2 flex items-center justify-center gap-2">
          <Award className="w-8 h-8 text-primary" />
          <div>
            <p className="text-xs font-bold text-foreground">{component.props.title || "Compra Segura"}</p>
            <p className="text-[10px] text-muted-foreground">{component.props.subtitle || "Ambiente protegido"}</p>
          </div>
        </div>
      );

    case "header":
      return (
        <div className="py-2 flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground">{component.props.title || "TÍTULO DO PRODUTO"}</p>
        </div>
      );

    case "list":
      return (
        <div className="py-2 space-y-1">
          {(component.props.items || ["Item 1", "Item 2", "Item 3"]).map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-foreground">
              <ListOrdered className="w-3 h-3 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      );

    case "countdown":
      return (
        <div className="py-2 text-center">
          <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-semibold text-foreground">{component.props.text || "Oferta termina em:"}</p>
          <p className="text-lg font-bold text-primary">15:00</p>
        </div>
      );

    case "testimonial":
      return (
        <div className="py-2 border border-border/30 rounded-lg p-3">
          <div className="flex gap-0.5 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-xs text-foreground italic">"{component.props.text || "Produto incrível! Recomendo."}"</p>
          <p className="text-[10px] text-muted-foreground mt-1">— {component.props.author || "Cliente"}</p>
        </div>
      );

    case "video":
      return (
        <div className="py-2">
          <div className="w-full h-28 bg-muted rounded-lg flex items-center justify-center">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      );

    case "facebook":
      return (
        <div className="py-2 flex items-center gap-2 justify-center">
          <Facebook className="w-5 h-5 text-blue-600" />
          <span className="text-xs text-muted-foreground">Facebook Comments</span>
        </div>
      );

    default:
      return <div className="py-2 text-xs text-muted-foreground">Componente desconhecido</div>;
  }
};

export default ComponentPreview;
