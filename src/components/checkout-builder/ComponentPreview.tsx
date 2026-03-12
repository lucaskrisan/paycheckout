import { Clock, ThumbsUp, Star, Award, Image, Video, Facebook, LayoutGrid, ListOrdered } from "lucide-react";
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
        <div className="py-1">
          {component.props.url ? (
            <img src={component.props.url} alt="" className="w-full h-32 object-contain bg-muted/40 border border-border/30 rounded-lg p-1" />
          ) : (
            <div className="w-full h-28 bg-muted/50 border border-border/30 rounded-lg flex flex-col items-center justify-center gap-1">
              <Image className="w-10 h-10 text-muted-foreground/50" />
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

    case "form":
      return (
        <div className="group/form relative -mx-3 -my-3 p-4 bg-muted/40 hover:bg-muted/70 transition-colors cursor-default">
          {/* Tooltip on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/form:opacity-100 transition-opacity z-10 pointer-events-none">
            <div className="bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg">
              <p className="text-center">Checkout</p>
              <p className="text-center text-[10px] font-normal opacity-80">Será exibido aqui</p>
            </div>
          </div>
          {/* Simulated form */}
          <div className="space-y-2.5 group-hover/form:opacity-60 transition-opacity">
            <div className="h-9 w-full bg-foreground/10 rounded-md" />
            <div className="h-9 w-full bg-foreground/10 rounded-md" />
            <div className="h-9 w-full bg-foreground/10 rounded-md" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 bg-foreground/10 rounded-md" />
              <div className="h-9 bg-foreground/10 rounded-md" />
            </div>
            {/* Payment method tabs */}
            <div className="flex gap-2 pt-1">
              <div className="h-8 w-16 bg-foreground/8 rounded" />
              <div className="h-8 w-16 bg-foreground/8 rounded" />
              <div className="h-8 w-16 bg-foreground/8 rounded" />
              <div className="h-8 w-16 bg-foreground/8 rounded" />
            </div>
            {/* Card form */}
            <div className="border border-foreground/10 rounded-lg p-3 space-y-2">
              <div className="h-8 w-full bg-foreground/8 rounded" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 bg-foreground/8 rounded" />
                <div className="h-8 bg-foreground/8 rounded" />
                <div className="h-8 bg-foreground/8 rounded" />
              </div>
              <div className="h-8 w-full bg-foreground/8 rounded" />
            </div>
            {/* Price info */}
            <div className="space-y-1 pt-1">
              <div className="h-3 w-24 bg-foreground/12 rounded" />
              <div className="h-3 w-40 bg-foreground/8 rounded" />
            </div>
            {/* CTA */}
            <div className="h-12 w-full bg-primary/80 rounded-lg" />
            {/* Footer links */}
            <div className="flex justify-center gap-4 pt-1">
              <div className="h-3 w-20 bg-foreground/6 rounded" />
              <div className="h-3 w-20 bg-foreground/6 rounded" />
            </div>
          </div>
        </div>
      );

    case "button":
      return (
        <div className="py-2">
          <div className="h-12 w-full bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">
              {component.props.text || "Finalizar compra"}
            </span>
          </div>
        </div>
      );

    default:
      return <div className="py-2 text-xs text-muted-foreground">Componente desconhecido</div>;
  }
};

export default ComponentPreview;
