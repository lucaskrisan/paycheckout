// @ts-nocheck
import {
  File,
  FileText,
  GitBranch,
  Headphones,
  HelpCircle,
  Image,
  Clock3,
  Music,
  Tag,
  Variable,
  Video,
} from "lucide-react";
import { motion } from "framer-motion";

export interface NodeType {
  id: string;
  label: string;
  icon: any;
  group: "message" | "logic";
}

export const NODE_TYPES: NodeType[] = [
  { id: "text", label: "Texto", icon: FileText, group: "message" },
  { id: "image", label: "Imagem", icon: Image, group: "message" },
  { id: "music", label: "Música", icon: Music, group: "message" },
  { id: "audio", label: "Áudio", icon: Headphones, group: "message" },
  { id: "video", label: "Vídeo", icon: Video, group: "message" },
  { id: "document", label: "Documento", icon: File, group: "message" },
  { id: "paths", label: "Caminhos", icon: GitBranch, group: "logic" },
  { id: "wait", label: "Esperar", icon: Clock3, group: "logic" },
  { id: "question", label: "Perguntar", icon: HelpCircle, group: "logic" },
  { id: "tags", label: "Tags", icon: Tag, group: "logic" },
  { id: "variables", label: "Variáveis", icon: Variable, group: "logic" },
];

const NodeButton = ({ node, onAddNode }: { node: NodeType; onAddNode: (type: NodeType) => void }) => {
  const Icon = node.icon;

  return (
    <button
      onClick={() => onAddNode(node)}
      className="group relative flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-3 text-left transition-all hover:border-gold/40 hover:bg-gold/5"
      type="button"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold transition-colors group-hover:bg-gold/15">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{node.label}</p>
        <p className="text-[11px] text-muted-foreground">
          {node.group === "message" ? "Bloco de conteúdo" : "Regra de automação"}
        </p>
      </div>

      {node.id === "tags" && (
        <span className="absolute right-2 top-2 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-background">
          Novo
        </span>
      )}
    </button>
  );
};

const FlowSidebar = ({ onAddNode }: { onAddNode: (type: NodeType) => void }) => {
  const messages = NODE_TYPES.filter((node) => node.group === "message");
  const logic = NODE_TYPES.filter((node) => node.group === "logic");

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="flex w-[260px] shrink-0 flex-col border-r border-border/60 bg-card/95"
      initial={{ opacity: 0, x: -18 }}
    >
      <div className="border-b border-border/60 px-5 py-5">
        <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold/80">Canvas</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-foreground">Blocos de automação</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Arraste a lógica visual do template em um fluxo elegante e fácil de configurar.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <section>
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Mensagens</p>
          <div className="space-y-2">
            {messages.map((node) => (
              <NodeButton key={node.id} node={node} onAddNode={onAddNode} />
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Lógica</p>
          <div className="space-y-2">
            {logic.map((node) => (
              <NodeButton key={node.id} node={node} onAddNode={onAddNode} />
            ))}
          </div>
        </section>
      </div>
    </motion.aside>
  );
};

export default FlowSidebar;
