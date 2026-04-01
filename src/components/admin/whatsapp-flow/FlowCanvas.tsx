// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Pencil, Zap, ToggleLeft, BarChart3, CheckCircle,
  GripVertical, X, Plus, Send, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import FlowSidebar, { NODE_TYPES, type NodeType } from "./FlowSidebar";

/* ─── Types ─── */
interface FlowNodeData {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
  outputs: string[]; // connected node IDs
}

interface FlowCanvasProps {
  templateName: string;
  templateBody: string;
  templateActive: boolean;
  onBack: () => void;
  onSave?: (nodes: FlowNodeData[]) => void;
}

/* ─── Dot Grid Background ─── */
const DotGrid = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.8" fill="hsl(220 15% 22%)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotgrid)" />
  </svg>
);

/* ─── Connection Lines (SVG Bezier) ─── */
const ConnectionLines = ({ nodes }: { nodes: FlowNodeData[] }) => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const lines: { from: FlowNodeData; to: FlowNodeData }[] = [];
  nodes.forEach(n => {
    n.outputs.forEach(outId => {
      const target = nodeMap.get(outId);
      if (target) lines.push({ from: n, to: target });
    });
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
      {lines.map(({ from, to }, i) => {
        const x1 = from.x + 140;
        const y1 = from.y + 60;
        const x2 = to.x + 140;
        const y2 = to.y;
        const midY = (y1 + y2) / 2;
        const cp1y = y1 + Math.abs(y2 - y1) * 0.4;
        const cp2y = y2 - Math.abs(y2 - y1) * 0.4;

        return (
          <g key={i}>
            {/* Glow */}
            <path
              d={`M${x1},${y1} C${x1},${cp1y} ${x2},${cp2y} ${x2},${y2}`}
              fill="none"
              stroke="hsl(45 100% 51%)"
              strokeWidth="3"
              strokeOpacity="0.15"
            />
            {/* Main line */}
            <path
              d={`M${x1},${y1} C${x1},${cp1y} ${x2},${cp2y} ${x2},${y2}`}
              fill="none"
              stroke="hsl(45 100% 51%)"
              strokeWidth="2"
              strokeOpacity="0.7"
            />
            {/* Dot at end */}
            <circle cx={x2} cy={y2} r="4" fill="hsl(45 100% 51%)" fillOpacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
};

/* ─── Single Node on Canvas ─── */
const CanvasNode = ({
  node, onDrag, onSelect, selected, onDelete, onConnect,
}: {
  node: FlowNodeData;
  onDrag: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  selected: boolean;
  onDelete: (id: string) => void;
  onConnect: (fromId: string) => void;
}) => {
  const nodeType = NODE_TYPES.find(n => n.id === node.type);
  const Icon = nodeType?.icon || Zap;
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onDrag(node.id, dragRef.current.nodeX + dx, dragRef.current.nodeY + dy);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const isStart = node.type === "start";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute z-[2] group"
      style={{ left: node.x, top: node.y }}
    >
      <div
        onClick={() => onSelect(node.id)}
        className={`
          w-[280px] rounded-xl border bg-[hsl(220_20%_12%)] shadow-lg cursor-grab active:cursor-grabbing
          ${selected ? "border-[hsl(45_100%_51%)] shadow-[0_0_20px_hsl(45_100%_51%/0.15)]" : "border-[hsl(220_15%_20%)]"}
          hover:border-[hsl(45_100%_51%/0.5)] transition-colors
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[hsl(220_15%_18%)]">
          <GripVertical className="w-3.5 h-3.5 text-[hsl(220_10%_35%)]" />
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isStart ? "bg-[hsl(45_100%_51%/0.15)]" : "bg-[hsl(220_18%_18%)]"}`}>
            <Icon className={`w-3.5 h-3.5 ${isStart ? "text-[hsl(45_100%_51%)]" : "text-[hsl(45_100%_51%/0.7)]"}`} />
          </div>
          <span className="text-xs font-semibold text-[hsl(220_10%_80%)] flex-1 truncate">
            {node.label}
          </span>
          {!isStart && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(node.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[hsl(0_70%_50%/0.2)]"
            >
              <X className="w-3 h-3 text-[hsl(0_70%_60%)]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-3">
          {node.config.body ? (
            <p className="text-[11px] text-[hsl(220_10%_60%)] line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {node.config.body}
            </p>
          ) : node.config.options ? (
            <div className="space-y-1.5">
              {node.config.options.map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[hsl(220_18%_16%)] border border-[hsl(220_15%_22%)]">
                  <span className="text-[10px] font-bold text-[hsl(45_100%_51%)]">{i + 1}</span>
                  <span className="text-[11px] text-[hsl(220_10%_70%)]">{opt}</span>
                </div>
              ))}
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-[hsl(220_15%_25%)] w-full hover:border-[hsl(45_100%_51%/0.3)] transition-colors">
                <Plus className="w-3 h-3 text-[hsl(220_10%_40%)]" />
                <span className="text-[10px] text-[hsl(220_10%_40%)]">Adicionar opção</span>
              </button>
            </div>
          ) : node.config.waitTime ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[hsl(45_100%_51%)]">{node.config.waitTime}</span>
              <span className="text-[11px] text-[hsl(220_10%_55%)]">{node.config.waitUnit}</span>
            </div>
          ) : (
            <p className="text-[11px] text-[hsl(220_10%_40%)] italic">Clique para configurar</p>
          )}
        </div>

        {/* Footer actions */}
        {node.config.showActions && (
          <div className="px-3 pb-2.5 flex gap-1.5">
            {node.config.actions?.map((action: string, i: number) => (
              <span key={i} className="px-2 py-1 rounded text-[9px] font-medium bg-[hsl(45_100%_51%/0.1)] text-[hsl(45_100%_51%)] border border-[hsl(45_100%_51%/0.2)]">
                {action}
              </span>
            ))}
          </div>
        )}

        {/* Output connector */}
        <div className="flex justify-center -mb-2 relative z-10">
          <button
            onClick={e => { e.stopPropagation(); onConnect(node.id); }}
            className="w-4 h-4 rounded-full bg-[hsl(220_18%_18%)] border-2 border-[hsl(220_15%_25%)] hover:border-[hsl(45_100%_51%)] hover:bg-[hsl(45_100%_51%/0.2)] transition-all"
          />
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main Flow Canvas ─── */
const FlowCanvas = ({ templateName, templateBody, templateActive, onBack }: FlowCanvasProps) => {
  const [nodes, setNodes] = useState<FlowNodeData[]>([
    {
      id: "start",
      type: "start",
      label: "Início",
      x: 350,
      y: 40,
      config: { body: templateBody || "Configure o gatilho da automação" },
      outputs: ["msg-1"],
    },
    {
      id: "msg-1",
      type: "text",
      label: "Mensagem",
      x: 350,
      y: 200,
      config: {
        body: templateBody || "Olá {nome}, obrigado pela compra!",
        showActions: true,
        actions: ["Enviar", "Agendar"],
      },
      outputs: ["question-1"],
    },
    {
      id: "question-1",
      type: "question",
      label: "Perguntar",
      x: 550,
      y: 400,
      config: {
        body: "Gostou do produto?",
        options: ["Sim, adorei!", "Preciso de ajuda", "Quero trocar"],
      },
      outputs: ["wait-1"],
    },
    {
      id: "wait-1",
      type: "wait",
      label: "Esperar",
      x: 200,
      y: 400,
      config: { waitTime: "2", waitUnit: "horas" },
      outputs: [],
    },
  ]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleAddNode = useCallback((type: NodeType) => {
    const id = `${type.id}-${Date.now()}`;
    const defaultConfigs: Record<string, any> = {
      text: { body: "" },
      image: { body: "Enviar imagem" },
      music: { body: "Enviar música" },
      audio: { body: "Enviar áudio" },
      video: { body: "Enviar vídeo" },
      document: { body: "Enviar documento" },
      paths: { body: "Selecionar caminho", options: ["Caminho A", "Caminho B"] },
      wait: { waitTime: "5", waitUnit: "minutos" },
      question: { body: "Sua pergunta aqui", options: ["Opção 1", "Opção 2"] },
      tags: { body: "Adicionar tag" },
      variables: { body: "Definir variável" },
    };

    setNodes(prev => [...prev, {
      id,
      type: type.id,
      label: type.label,
      x: 350 + Math.random() * 100,
      y: 200 + prev.length * 80,
      config: defaultConfigs[type.id] || { body: "" },
      outputs: [],
    }]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNodes(prev => prev
      .filter(n => n.id !== id)
      .map(n => ({ ...n, outputs: n.outputs.filter(o => o !== id) }))
    );
    if (selectedNode === id) setSelectedNode(null);
  }, [selectedNode]);

  const handleConnect = useCallback((fromId: string) => {
    if (connectingFrom) {
      if (connectingFrom !== fromId) {
        setNodes(prev => prev.map(n =>
          n.id === connectingFrom
            ? { ...n, outputs: [...new Set([...n.outputs, fromId])] }
            : n
        ));
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(fromId);
    }
  }, [connectingFrom]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-[hsl(220_20%_8%)]"
    >
      {/* Sidebar */}
      <FlowSidebar onAddNode={handleAddNode} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 bg-[hsl(220_20%_10%)] border-b border-[hsl(220_15%_18%)] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[hsl(220_18%_16%)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[hsl(220_10%_60%)]" />
            </button>

            <div className="flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5 text-[hsl(151_100%_45%)]" />
              <span className="text-sm font-semibold text-[hsl(220_10%_85%)]">{templateName || "Novo Fluxo"}</span>
              <CheckCircle className="w-3.5 h-3.5 text-[hsl(151_100%_45%)]" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={`text-[10px] px-2 py-0.5 ${
                templateActive
                  ? "bg-[hsl(45_100%_51%/0.1)] text-[hsl(45_100%_51%)] border-[hsl(45_100%_51%/0.3)]"
                  : "bg-[hsl(220_18%_16%)] text-[hsl(220_10%_50%)] border-[hsl(220_15%_22%)]"
              }`}
              variant="outline"
            >
              <Zap className="w-3 h-3 mr-1" />
              Construtor de Funil
            </Badge>

            <div className="w-px h-5 bg-[hsl(220_15%_20%)]" />

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[hsl(220_18%_16%)] transition-colors">
              <ToggleLeft className="w-4 h-4 text-[hsl(220_10%_50%)]" />
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[hsl(220_18%_16%)] transition-colors text-[11px] text-[hsl(220_10%_60%)]">
              <BarChart3 className="w-3.5 h-3.5" />
              Métricas
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto"
          onClick={() => {
            setSelectedNode(null);
            setConnectingFrom(null);
          }}
        >
          <DotGrid />
          <ConnectionLines nodes={nodes} />

          {connectingFrom && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-[hsl(45_100%_51%/0.15)] border border-[hsl(45_100%_51%/0.3)] text-[11px] text-[hsl(45_100%_51%)] font-medium">
              Clique em outro nó para conectar
            </div>
          )}

          {nodes.map(node => (
            <CanvasNode
              key={node.id}
              node={node}
              onDrag={handleDrag}
              onSelect={setSelectedNode}
              selected={selectedNode === node.id}
              onDelete={handleDelete}
              onConnect={handleConnect}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default FlowCanvas;
