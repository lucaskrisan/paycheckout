import type { SalesBlock } from "./types";
import { Star, Shield, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  block: SalesBlock;
  productName?: string;
  productPrice?: number;
  originalPrice?: number;
  checkoutUrl?: string;
}

const SalesBlockPreview = ({ block, productName, productPrice, originalPrice, checkoutUrl }: Props) => {
  const p = block.props;

  switch (block.type) {
    case "hero":
      return (
        <div className="text-center py-12 px-6 space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">{p.title}</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">{p.subtitle}</p>
          {p.imageUrl && <img src={p.imageUrl} alt="" className="max-h-[300px] mx-auto rounded-xl object-contain" />}
          <a href={checkoutUrl || "#"} className="inline-block bg-primary text-primary-foreground font-bold py-4 px-10 rounded-xl text-lg hover:opacity-90 transition-opacity">
            {p.ctaText}
          </a>
        </div>
      );

    case "video":
      return (
        <div className="py-8 px-4">
          <div className="aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-muted">
            {p.videoUrl ? (
              <iframe src={p.videoUrl} className="w-full h-full" allowFullScreen allow="autoplay" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Cole a URL do vídeo</div>
            )}
          </div>
          {p.caption && <p className="text-center text-sm text-muted-foreground mt-3">{p.caption}</p>}
        </div>
      );

    case "benefits":
      return (
        <div className="py-10 px-6 space-y-6">
          <h2 className="text-2xl font-bold text-center text-foreground">{p.title}</h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {(p.items || []).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <span className="text-xl shrink-0">{item.icon}</span>
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonials":
      return (
        <div className="py-10 px-6 space-y-6 bg-muted/20">
          <h2 className="text-2xl font-bold text-center text-foreground">{p.title}</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {(p.items || []).map((t: any, i: number) => (
              <div key={i} className="bg-card p-5 rounded-xl shadow-sm border border-border space-y-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating || 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground italic">"{t.text}"</p>
                <p className="text-xs font-semibold text-muted-foreground">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "faq": {
      return <FaqPreview title={p.title} items={p.items || []} />;
    }

    case "guarantee":
      return (
        <div className="py-10 px-6 text-center space-y-3">
          <Shield className="w-12 h-12 mx-auto text-green-500" />
          <h3 className="text-xl font-bold text-foreground">{p.title}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{p.description}</p>
        </div>
      );

    case "pricing":
      return (
        <div className="py-10 px-6 text-center space-y-4">
          {p.highlight && <p className="text-sm font-semibold text-primary">{p.highlight}</p>}
          <div className="space-y-1">
            {p.showOriginalPrice && originalPrice && (
              <p className="text-lg text-muted-foreground line-through">
                R$ {originalPrice.toFixed(2).replace(".", ",")}
              </p>
            )}
            <p className="text-4xl font-extrabold text-foreground">
              R$ {(productPrice || 0).toFixed(2).replace(".", ",")}
            </p>
          </div>
          <a href={checkoutUrl || "#"} className="inline-block bg-primary text-primary-foreground font-bold py-4 px-10 rounded-xl text-lg hover:opacity-90 transition-opacity">
            {p.ctaText || "COMPRAR AGORA"}
          </a>
        </div>
      );

    case "text":
      return (
        <div className="py-6 px-6 max-w-2xl mx-auto">
          <p className="text-foreground whitespace-pre-wrap">{p.content}</p>
        </div>
      );

    case "image":
      return (
        <div className={`py-4 px-6 ${p.fullWidth ? "" : "max-w-2xl mx-auto"}`}>
          {p.url ? (
            <img src={p.url} alt={p.alt || ""} className="w-full rounded-xl object-contain" />
          ) : (
            <div className="h-40 bg-muted rounded-xl flex items-center justify-center text-muted-foreground text-sm">Adicione uma imagem</div>
          )}
        </div>
      );

    case "cta":
      return (
        <div className="py-8 px-6 text-center">
          <a href={checkoutUrl || "#"} className="inline-block bg-primary text-primary-foreground font-bold py-4 px-12 rounded-xl text-lg hover:opacity-90 transition-opacity shadow-lg">
            {p.text}
          </a>
        </div>
      );

    default:
      return <div className="p-4 text-sm text-muted-foreground">Bloco desconhecido: {block.type}</div>;
  }
};

function FaqPreview({ title, items }: { title: string; items: { question: string; answer: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="py-10 px-6 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-foreground">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
            >
              {item.question}
              <ChevronDown className={`w-4 h-4 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 text-sm text-muted-foreground">{item.answer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SalesBlockPreview;
