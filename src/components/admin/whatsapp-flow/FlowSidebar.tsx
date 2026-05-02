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
      className="group relative flex w-full items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-2 text-left transition-all hover:border-gold/40 hover:bg-gold/5"
      type="button"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gold/20 bg-gold/10 text-gold transition-colors group-hover:bg-gold/15">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight text-foreground">{node.label}</p>
      </div>

      {node.id === "tags" && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-gold px-1 py-0.5 text-[8px] font-bold text-background">
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
      className="flex h-full w-[220px] shrink-0 flex-col border-r border-border/60 bg-card/95"
      initial={{ opacity: 0, x: -18 }}
    >
      <div className="shrink-0 border-b border-border/60 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/80">Blocos</p>
        <h3 className="mt-0.5 font-display text-sm font-semibold text-foreground">Automação</h3>
      </div>

      <div className="scrollbar-premium min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <section>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Mensagens</p>
          <div className="space-y-1.5">
            {messages.map((node) => (
              <NodeButton key={node.id} node={node} onAddNode={onAddNode} />
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Lógica</p>
          <div className="space-y-1.5">
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
