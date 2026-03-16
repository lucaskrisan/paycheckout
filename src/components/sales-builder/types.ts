export type SalesBlockType =
  | "hero"
  | "benefits"
  | "testimonials"
  | "faq"
  | "video"
  | "guarantee"
  | "pricing"
  | "text"
  | "image"
  | "cta";

export interface SalesBlock {
  id: string;
  type: SalesBlockType;
  order: number;
  props: Record<string, any>;
}

export interface SalesPageSettings {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export const SALES_BLOCK_CATALOG: {
  type: SalesBlockType;
  label: string;
  icon: string;
  defaultProps: Record<string, any>;
}[] = [
  {
    type: "hero",
    label: "Hero",
    icon: "LayoutGrid",
    defaultProps: {
      title: "Transforme sua vida hoje",
      subtitle: "Descubra o método comprovado para alcançar resultados extraordinários",
      ctaText: "QUERO COMEÇAR AGORA",
      imageUrl: "",
    },
  },
  {
    type: "video",
    label: "Vídeo",
    icon: "Video",
    defaultProps: { videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", caption: "" },
  },
  {
    type: "benefits",
    label: "Benefícios",
    icon: "ThumbsUp",
    defaultProps: {
      title: "O que você vai aprender",
      items: [
        { icon: "✅", text: "Estratégias comprovadas de vendas" },
        { icon: "✅", text: "Técnicas avançadas de marketing" },
        { icon: "✅", text: "Suporte exclusivo da comunidade" },
      ],
    },
  },
  {
    type: "testimonials",
    label: "Depoimentos",
    icon: "Star",
    defaultProps: {
      title: "O que nossos alunos dizem",
      items: [
        { name: "Maria Silva", text: "Mudou minha vida!", rating: 5, avatar: "" },
        { name: "João Santos", text: "Resultados incríveis em 30 dias.", rating: 5, avatar: "" },
      ],
    },
  },
  {
    type: "faq",
    label: "FAQ",
    icon: "HelpCircle",
    defaultProps: {
      title: "Perguntas Frequentes",
      items: [
        { question: "Como funciona?", answer: "Após a compra você recebe acesso imediato." },
        { question: "Tem garantia?", answer: "Sim, garantia incondicional de 7 dias." },
      ],
    },
  },
  {
    type: "guarantee",
    label: "Garantia",
    icon: "Shield",
    defaultProps: {
      title: "Garantia de 7 dias",
      description: "Se você não ficar satisfeito, devolvemos 100% do seu dinheiro.",
      days: 7,
    },
  },
  {
    type: "pricing",
    label: "Preço",
    icon: "DollarSign",
    defaultProps: {
      showOriginalPrice: true,
      ctaText: "COMPRAR AGORA",
      highlight: "Oferta por tempo limitado!",
    },
  },
  {
    type: "text",
    label: "Texto",
    icon: "AlignLeft",
    defaultProps: { content: "Adicione seu texto aqui..." },
  },
  {
    type: "image",
    label: "Imagem",
    icon: "Image",
    defaultProps: { url: "", alt: "Imagem", fullWidth: true },
  },
  {
    type: "cta",
    label: "Botão CTA",
    icon: "MousePointerClick",
    defaultProps: { text: "QUERO GARANTIR MINHA VAGA", variant: "primary" },
  },
];
