// @ts-nocheck
import {
  FileText, Image, Music, Headphones, Video, File,
  GitBranch, Clock, HelpCircle, Tag, Variable, X,
} from "lucide-react";
import { motion } from "framer-motion";

export interface NodeType {
  id: string;
  label: string;
  icon: any;
  group: "message" | "logic";
  color: string; // HSL values
}

export const NODE_TYPES: NodeType[] = [
  { id: "text", label: "Texto", icon: FileText, group: "message", color: "45 100% 51%" },
  { id: "image", label: "Imagem", icon: Image, group: "message", color: "45 100% 51%" },
  { id: "music", label: "Música", icon: Music, group: "message", color: "45 100% 51%" },
  { id: "audio", label: "Áudio", icon: Headphones, group: "message", color: "45 100% 51%" },
  { id: "video", label: "Vídeo", icon: Video, group: "message", color: "45 100% 51%" },
  { id: "document", label: "Documento", icon: File, group: "message", color: "45 100% 51%" },
  { id: "paths", label: "Caminhos", icon: GitBranch, group: "logic", color: "45 100% 51%" },
  { id: "wait", label: "Esperar", icon: Clock, group: "logic", color: "45 100% 51%" },
  { id: "question", label: "Perguntar", icon: HelpCircle, group: "logic", color: "45 100% 51%" },
  { id: "tags", label: "Tags", icon: Tag, group: "logic", color: "45 100% 51%" },
  { id: "variables", label: "Variáveis", icon: Variable, group: "logic", color: "45 100% 51%" },
];

const FlowSidebar = ({ onAddNode }: { onAddNode: (type: NodeType) => void }) => {
  const messages = NODE_TYPES.filter(n => n.group === "message");
  const logic = NODE_TYPES.filter(n => n.group === "logic");

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-[200px] shrink-0 bg-[hsl(220_20%_10%)] border-r border-[hsl(220_15%_18%)] flex flex-col overflow-y-auto"
    >
      {/* Messages */}
      <div className="p-4">
        <p className="text-[11px] font-medium text-[hsl(220_10%_55%)] mb-3 italic">Mensagens</p>
        <div className="grid grid-cols-2 gap-2">
          {messages.map(node => {
            const Icon = node.icon;
            return (
              <button
                key={node.id}
                onClick={() => onAddNode(node)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(220_18%_14%)] border border-[hsl(220_15%_20%)] hover:border-[hsl(45_100%_51%/0.4)] hover:bg-[hsl(220_18%_16%)] transition-all text-left group"
              >
                <Icon className="w-3.5 h-3.5 text-[hsl(220_10%_55%)] group-hover:text-[hsl(45_100%_51%)]" />
                <span className="text-[11px] text-[hsl(220_10%_70%)] group-hover:text-[hsl(220_10%_85%)]">{node.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logic */}
      <div className="p-4 pt-0">
        <p className="text-[11px] font-medium text-[hsl(220_10%_55%)] mb-3 italic">Lógica</p>
        <div className="grid grid-cols-2 gap-2">
          {logic.map(node => {
            const Icon = node.icon;
            return (
              <button
                key={node.id}
                onClick={() => onAddNode(node)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[hsl(220_18%_14%)] border border-[hsl(220_15%_20%)] hover:border-[hsl(45_100%_51%/0.4)] hover:bg-[hsl(220_18%_16%)] transition-all text-left group relative"
              >
                <Icon className="w-3.5 h-3.5 text-[hsl(220_10%_55%)] group-hover:text-[hsl(45_100%_51%)]" />
                <span className="text-[11px] text-[hsl(220_10%_70%)] group-hover:text-[hsl(220_10%_85%)]">{node.label}</span>
                {node.id === "tags" && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[hsl(15_100%_55%)] text-white">Novo</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default FlowSidebar;
