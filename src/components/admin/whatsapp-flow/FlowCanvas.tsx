// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  File,
  FileText,
  GitBranch,
  GripVertical,
  Headphones,
  HelpCircle,
  Image,
  MessageSquare,
  Music,
  Plus,
  Save,
  Send,
  Smartphone,
  Tag,
  Trash2,
  Variable,
  Video,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import FlowSidebar, { NODE_TYPES, type NodeType } from "./FlowSidebar";
import WhatsAppPreview from "./WhatsAppPreview";
import VariableButtons from "./VariableButtons";

interface TemplateDraft {
  id: string;
  name: string;
  category: string;
  body: string;
  active: boolean;
}

interface FlowNodeData {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
  outputs: string[];
}

interface FlowCanvasProps {
  categories: Array<{ value: string; label: string }>;
  isNew?: boolean;
  onBack: () => void;
  onDelete?: () => void;
  onSave: (payload: { template: TemplateDraft; nodes: FlowNodeData[] }) => void;
  saving?: boolean;
  template: TemplateDraft;
  initialNodes?: FlowNodeData[];
}

const INTERNAL_NODE_META = {
  trigger: { label: "Gatilho", icon: Zap },
  delivery: { label: "Entrega", icon: Send },
};

const MESSAGE_TYPES = ["text", "image", "music", "audio", "video", "document"];
const OPTION_TYPES = ["question", "paths"];

const createStarterNodes = (body: string): FlowNodeData[] => [
  {
    id: "trigger-node",
    type: "trigger",
    label: "Disparo",
    x: 180,
    y: 90,
    config: {
      body: "Entrada que inicia a automação.",
      helper: "Escolha a categoria e o momento exato do disparo.",
    },
    outputs: ["message-node"],
  },
  {
    id: "message-node",
    type: "text",
    label: "Mensagem principal",
    x: 470,
    y: 240,
    config: {
      body: body || "Olá {nome}, obrigado por adquirir o {produto}!",
    },
    outputs: ["delivery-node"],
  },
  {
    id: "delivery-node",
    type: "delivery",
    label: "Envio WhatsApp",
    x: 760,
    y: 390,
    config: {
      body: "Entrega automática da mensagem no WhatsApp do cliente.",
    },
    outputs: [],
  },
];

const DotGrid = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern height="24" id="gold-grid" patternUnits="userSpaceOnUse" width="24">
        <circle cx="1" cy="1" fill="hsl(var(--border) / 0.5)" r="1" />
      </pattern>
    </defs>
    <rect fill="url(#gold-grid)" height="100%" width="100%" />
  </svg>
);

const ConnectionLines = ({ nodes }: { nodes: FlowNodeData[] }) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const connections: Array<{ from: FlowNodeData; to: FlowNodeData }> = [];

  nodes.forEach((node) => {
    node.outputs.forEach((outputId) => {
      const target = nodeMap.get(outputId);
      if (target) connections.push({ from: node, to: target });
    });
  });

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full">
      {connections.map(({ from, to }, index) => {
        const startX = from.x + 145;
        const startY = from.y + 112;
        const endX = to.x + 145;
        const endY = to.y;
        const deltaY = Math.max(80, Math.abs(endY - startY) * 0.55);

        return (
          <g key={`${from.id}-${to.id}-${index}`}>
            <path
              d={`M${startX},${startY} C${startX},${startY + deltaY} ${endX},${endY - deltaY} ${endX},${endY}`}
              fill="none"
              stroke="hsl(var(--gold) / 0.18)"
              strokeWidth="8"
            />
            <path
              d={`M${startX},${startY} C${startX},${startY + deltaY} ${endX},${endY - deltaY} ${endX},${endY}`}
              fill="none"
              stroke="hsl(var(--gold) / 0.8)"
              strokeWidth="2.5"
            />
            <circle cx={endX} cy={endY} fill="hsl(var(--gold))" r="4" />
          </g>
        );
      })}
    </svg>
  );
};

const CanvasNode = ({
  connecting,
  node,
  onConnect,
  onDelete,
  onDrag,
  onSelect,
  selected,
}: {
  connecting: boolean;
  node: FlowNodeData;
  onConnect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  selected: boolean;
}) => {
  const meta = NODE_TYPES.find((item) => item.id === node.type) || INTERNAL_NODE_META[node.type] || INTERNAL_NODE_META.trigger;
  const Icon = meta.icon;
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const locked = node.type === "trigger" || node.type === "delivery";

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const nextX = dragRef.current.nodeX + (moveEvent.clientX - dragRef.current.startX);
      const nextY = dragRef.current.nodeY + (moveEvent.clientY - dragRef.current.startY);
      onDrag(node.id, nextX, nextY);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="absolute z-[2]"
      initial={{ opacity: 0, scale: 0.94 }}
      style={{ left: node.x, top: node.y }}
    >
      <div
        className={`group w-[290px] rounded-[24px] border bg-card/95 shadow-2xl backdrop-blur ${
          selected ? "border-gold/70 shadow-[0_0_40px_hsl(var(--gold)/0.16)]" : "border-border/70"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3" onMouseDown={handleMouseDown}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{node.label}</p>
            <p className="text-[11px] text-muted-foreground">{meta.label}</p>
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          {!locked && (
            <button
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(node.id);
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {node.config.body || "Clique no painel lateral para configurar este nó."}
            </p>
          </div>

          {Array.isArray(node.config.options) && node.config.options.length > 0 && (
            <div className="space-y-2">
              {node.config.options.map((option: string, index: number) => (
                <div key={`${node.id}-option-${index}`} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/10 text-[10px] font-bold text-gold">
                    {index + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">{option}</span>
                </div>
              ))}
            </div>
          )}

          {node.type === "wait" && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold">
              <Clock3 className="h-3.5 w-3.5" />
              {node.config.waitTime || "5"} {node.config.waitUnit || "minutos"}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
          <button
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              connecting ? "border-gold/50 bg-gold/10 text-gold" : "border-border/60 bg-background/60 text-muted-foreground hover:border-gold/35 hover:text-gold"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onConnect(node.id);
            }}
            type="button"
          >
            <Workflow className="h-3.5 w-3.5" />
            {connecting ? "Escolha destino" : "Conectar"}
          </button>

          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold/30 bg-background">
            <div className="h-2.5 w-2.5 rounded-full bg-gold" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Mobile simplified editor fallback (#10)
const MobileEditor = ({
  categories,
  draft,
  onBack,
  onSave,
  saving,
  setDraft,
}: {
  categories: Array<{ value: string; label: string }>;
  draft: TemplateDraft;
  onBack: () => void;
  onSave: () => void;
  saving?: boolean;
  setDraft: React.Dispatch<React.SetStateAction<TemplateDraft>>;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newBody = draft.body.slice(0, start) + variable + draft.body.slice(end);
      setDraft((d) => ({ ...d, body: newBody }));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      }, 50);
    } else {
      setDraft((d) => ({ ...d, body: d.body + variable }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card/95 px-4 py-3">
        <button onClick={onBack} className="text-muted-foreground" type="button">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-sm font-semibold text-foreground truncate mx-2">
          {draft.name || "Novo template"}
        </h2>
        <Button size="sm" className="gap-1.5 bg-gold text-background" disabled={saving} onClick={onSave}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "..." : "Salvar"}
        </Button>
      </div>

      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Ex: Confirmação de compra" />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            ref={textareaRef}
            className="min-h-[140px]"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
        </div>

        <VariableButtons onInsert={handleInsertVariable} />

        <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
          <span className="text-sm text-foreground">Ativo</span>
          <Switch checked={draft.active} onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
        </div>

        <WhatsAppPreview body={draft.body} />
      </div>
    </div>
  );
};

const FlowCanvas = ({ categories, isNew, onBack, onDelete, onSave, saving, template, initialNodes }: FlowCanvasProps) => {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<TemplateDraft>(template);
  const [nodes, setNodes] = useState<FlowNodeData[]>(() => {
    // Use saved nodes if available (#9), otherwise create starter
    if (initialNodes && initialNodes.length > 0) return initialNodes;
    return createStarterNodes(template.body);
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string>("message-node");
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(template);
    if (initialNodes && initialNodes.length > 0) {
      setNodes(initialNodes);
    } else {
      setNodes(createStarterNodes(template.body));
    }
    setSelectedNodeId("message-node");
    setPendingConnection(null);
  }, [template, initialNodes]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );

  const primaryBody = useMemo(() => {
    const firstMessage = nodes.find((node) => MESSAGE_TYPES.includes(node.type));
    return (firstMessage?.config.body || draft.body || "").trim();
  }, [draft.body, nodes]);

  const handleDrag = (id: string, x: number, y: number) => {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, x, y } : node)));
  };

  const handleDeleteNode = (id: string) => {
    setNodes((current) =>
      current
        .filter((node) => node.id !== id)
        .map((node) => ({ ...node, outputs: node.outputs.filter((output) => output !== id) })),
    );
    if (selectedNodeId === id) setSelectedNodeId("message-node");
    if (pendingConnection === id) setPendingConnection(null);
  };

  const handleSelectNode = (id: string) => {
    if (pendingConnection && pendingConnection !== id) {
      setNodes((current) =>
        current.map((node) =>
          node.id === pendingConnection
            ? { ...node, outputs: [...new Set([...node.outputs, id])] }
            : node,
        ),
      );
      setPendingConnection(null);
    }
    setSelectedNodeId(id);
  };

  const handleConnect = (id: string) => {
    setSelectedNodeId(id);
    setPendingConnection((current) => (current === id ? null : id));
  };

  const handleAddNode = (type: NodeType) => {
    const anchor = nodes.find((node) => node.id === selectedNodeId) || nodes[nodes.length - 1];
    const nextId = `${type.id}-${Date.now()}`;
    const baseConfigMap = {
      text: { body: "Nova mensagem" },
      image: { body: "Envio de imagem com legenda" },
      music: { body: "Envio de música" },
      audio: { body: "Envio de áudio" },
      video: { body: "Envio de vídeo" },
      document: { body: "Envio de documento" },
      paths: { body: "Defina os caminhos do fluxo", options: ["Se respondeu sim", "Se pediu suporte"] },
      wait: { body: "Aguardar antes do próximo passo", waitTime: "5", waitUnit: "minutos" },
      question: { body: "Qual opção faz mais sentido?", options: ["Quero comprar", "Tenho dúvida"] },
      tags: { body: "Aplicar tag ao contato" },
      variables: { body: "Salvar resposta em variável" },
    };

    setNodes((current) => [
      ...current.map((node) =>
        node.id === anchor.id ? { ...node, outputs: [...new Set([...node.outputs, nextId])] } : node,
      ),
      {
        id: nextId,
        type: type.id,
        label: type.label,
        x: anchor.x + 260,
        y: anchor.y + 180,
        config: baseConfigMap[type.id] || { body: "Configuração do bloco" },
        outputs: [],
      },
    ]);
    setSelectedNodeId(nextId);
  };

  const updateSelectedNode = (updater: (node: FlowNodeData) => FlowNodeData) => {
    if (!selectedNode) return;

    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedNode.id) return node;
        const updatedNode = updater(node);

        if (node.id === "message-node" && typeof updatedNode.config.body === "string") {
          setDraft((currentDraft) => ({ ...currentDraft, body: updatedNode.config.body }));
        }

        return updatedNode;
      }),
    );
  };

  const updateOption = (index: number, value: string) => {
    updateSelectedNode((node) => ({
      ...node,
      config: {
        ...node.config,
        options: node.config.options.map((option: string, optionIndex: number) =>
          optionIndex === index ? value : option,
        ),
      },
    }));
  };

  const addOption = () => {
    updateSelectedNode((node) => ({
      ...node,
      config: {
        ...node.config,
        options: [...(node.config.options || []), `Nova opção ${(node.config.options || []).length + 1}`],
      },
    }));
  };

  const removeOption = (index: number) => {
    updateSelectedNode((node) => ({
      ...node,
      config: {
        ...node.config,
        options: node.config.options.filter((_: string, optionIndex: number) => optionIndex !== index),
      },
    }));
  };

  // Insert variable at cursor position in the content textarea (#6)
  const handleInsertVariable = (variable: string) => {
    if (!selectedNode) return;
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const currentBody = selectedNode.config.body || "";
      const newBody = currentBody.slice(0, start) + variable + currentBody.slice(end);
      updateSelectedNode((node) => ({ ...node, config: { ...node.config, body: newBody } }));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      }, 50);
    } else {
      updateSelectedNode((node) => ({
        ...node,
        config: { ...node.config, body: (node.config.body || "") + variable },
      }));
    }
  };

  // Test send (#4)
  const handleTestSend = async () => {
    if (!primaryBody.trim()) {
      toast.error("Adicione uma mensagem antes de testar");
      return;
    }

    setSendingTest(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
        .maybeSingle();

      if (!profile?.phone) {
        toast.error("Configure seu telefone em Minha Conta antes de enviar um teste.");
        setSendingTest(false);
        return;
      }

      const { error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          to_number: profile.phone,
          message: primaryBody
            .replace(/\{nome\}/gi, "Teste")
            .replace(/\{produto\}/gi, "Produto Teste")
            .replace(/\{valor\}/gi, "R$ 99,90")
            .replace(/\{link\}/gi, "https://exemplo.com")
            .replace(/\{telefone\}/gi, profile.phone),
        },
      });

      if (error) throw error;
      toast.success("Mensagem de teste enviada para seu WhatsApp!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar teste");
    } finally {
      setSendingTest(false);
    }
  };

  // Mobile fallback (#10)
  if (isMobile) {
    return (
      <MobileEditor
        categories={categories}
        draft={draft}
        onBack={onBack}
        onSave={() => onSave({ template: { ...draft, body: primaryBody }, nodes })}
        saving={saving}
        setDraft={setDraft}
      />
    );
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex bg-background"
      initial={{ opacity: 0 }}
    >
      <FlowSidebar onAddNode={handleAddNode} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border/60 bg-card/95 px-6">
          <div className="flex items-center gap-4">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-gold/35 hover:text-gold"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">{draft.name || (isNew ? "Novo template" : "Template sem nome")}</h2>
                <Badge className="border-gold/25 bg-gold/10 text-gold" variant="outline">
                  <Workflow className="mr-1.5 h-3 w-3" />
                  Construtor visual
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Clique nos cards, conecte os nós e configure tudo sem fricção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Smartphone className="h-3.5 w-3.5" />
              {showPreview ? "Ocultar preview" : "Preview"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleTestSend}
              disabled={sendingTest}
            >
              <Send className="h-3.5 w-3.5" />
              {sendingTest ? "Enviando..." : "Testar envio"}
            </Button>

            <Badge variant={draft.active ? "default" : "secondary"}>{draft.active ? "Ativo" : "Inativo"}</Badge>

            {onDelete && !isNew && (
              <Button className="gap-2" onClick={onDelete} type="button" variant="outline">
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}

            <Button
              className="gap-2 border border-gold/20 bg-gold text-background hover:bg-gold/90"
              disabled={saving}
              onClick={() => onSave({ template: { ...draft, body: primaryBody }, nodes })}
              type="button"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar template"}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="relative min-w-0 flex-1 overflow-auto bg-background"
            onClick={() => {
              setSelectedNodeId("");
              setPendingConnection(null);
            }}
          >
            <div className="relative min-h-[980px] min-w-[1200px]">
              <DotGrid />
              <ConnectionLines nodes={nodes} />

              <div className="absolute left-6 top-6 z-[3] flex items-center gap-3 rounded-full border border-gold/20 bg-card/90 px-4 py-2 text-sm text-muted-foreground shadow-lg backdrop-blur">
                <MessageSquare className="h-4 w-4 text-gold" />
                {pendingConnection ? "Agora clique no próximo nó para criar a ligação." : "Selecione um card para editar, arraste para reposicionar e conecte o fluxo."}
              </div>

              {nodes.map((node) => (
                <CanvasNode
                  connecting={pendingConnection === node.id}
                  key={node.id}
                  node={node}
                  onConnect={handleConnect}
                  onDelete={handleDeleteNode}
                  onDrag={handleDrag}
                  onSelect={handleSelectNode}
                  selected={selectedNodeId === node.id}
                />
              ))}
            </div>
          </div>

          <aside className="flex w-[360px] shrink-0 flex-col border-l border-border/60 bg-card/95">
            <div className="border-b border-border/60 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold/80">Configuração</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-foreground">Painel de edição</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tudo o que você selecionar no canvas fica intuitivo e imediato aqui.
              </p>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Identidade do template</p>
                    <p className="text-xs text-muted-foreground">Defina nome, categoria e status sem sair do fluxo.</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex: Recuperação de checkout"
                    value={draft.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select onValueChange={(value) => setDraft((current) => ({ ...current, category: value }))} value={draft.category}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Template ativo</p>
                    <p className="text-xs text-muted-foreground">Pronto para entrar na automação.</p>
                  </div>
                  <Switch checked={draft.active} onCheckedChange={(value) => setDraft((current) => ({ ...current, active: value }))} />
                </div>
              </section>

              {/* Preview section (#3) */}
              {showPreview && (
                <section className="space-y-2">
                  <WhatsAppPreview body={primaryBody} />
                </section>
              )}

              <section className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Resumo visual</p>
                    <p className="text-xs text-muted-foreground">O texto salvo sai do primeiro bloco de mensagem principal.</p>
                  </div>
                  <Badge className="border-gold/25 bg-gold/10 text-gold" variant="outline">{nodes.length} nós</Badge>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/80 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Mensagem principal</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{primaryBody || "Adicione uma mensagem principal no canvas."}</p>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Nó selecionado</p>
                  <p className="text-xs text-muted-foreground">Ajuste conteúdo, espera ou opções com precisão.</p>
                </div>

                {selectedNode ? (
                  <>
                    <div className="space-y-2">
                      <Label>Rótulo</Label>
                      <Input
                        onChange={(event) => updateSelectedNode((node) => ({ ...node, label: event.target.value }))}
                        value={selectedNode.label}
                      />
                    </div>

                    {(MESSAGE_TYPES.includes(selectedNode.type) || OPTION_TYPES.includes(selectedNode.type) || ["trigger", "delivery", "tags", "variables"].includes(selectedNode.type)) && (
                      <div className="space-y-2">
                        <Label>Conteúdo</Label>
                        <Textarea
                          ref={textareaRef}
                          className="min-h-[120px]"
                          onChange={(event) => updateSelectedNode((node) => ({ ...node, config: { ...node.config, body: event.target.value } }))}
                          placeholder="Descreva ou escreva o conteúdo deste bloco"
                          value={selectedNode.config.body || ""}
                        />
                        {/* Variable insertion buttons (#6) */}
                        {MESSAGE_TYPES.includes(selectedNode.type) && (
                          <VariableButtons onInsert={handleInsertVariable} />
                        )}
                      </div>
                    )}

                    {/* Media URL field for image/audio/video/document nodes */}
                    {["image", "music", "audio", "video", "document"].includes(selectedNode.type) && (
                      <div className="space-y-2">
                        <Label>
                          URL da mídia
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            ({selectedNode.type === "image" ? "JPG, PNG, WEBP" :
                              selectedNode.type === "video" ? "MP4" :
                              selectedNode.type === "audio" || selectedNode.type === "music" ? "MP3, OGG, M4A" :
                              "PDF, DOCX, etc."})
                          </span>
                        </Label>
                        <Input
                          placeholder="https://exemplo.com/arquivo.jpg"
                          value={selectedNode.config.media_url || ""}
                          onChange={(event) => updateSelectedNode((node) => ({
                            ...node,
                            config: { ...node.config, media_url: event.target.value },
                          }))}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Cole a URL pública do arquivo. Será enviado como {selectedNode.type === "music" ? "áudio" : selectedNode.type} no WhatsApp.
                        </p>
                      </div>
                    )}

                    {selectedNode.type === "wait" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Tempo</Label>
                          <Input
                            onChange={(event) => updateSelectedNode((node) => ({ ...node, config: { ...node.config, waitTime: event.target.value } }))}
                            value={selectedNode.config.waitTime || ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Select
                            onValueChange={(value) => updateSelectedNode((node) => ({ ...node, config: { ...node.config, waitUnit: value } }))}
                            value={selectedNode.config.waitUnit || "minutos"}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutos">Minutos</SelectItem>
                              <SelectItem value="horas">Horas</SelectItem>
                              <SelectItem value="dias">Dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {OPTION_TYPES.includes(selectedNode.type) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Opções</Label>
                          <Button className="gap-2" onClick={addOption} size="sm" type="button" variant="outline">
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {(selectedNode.config.options || []).map((option: string, index: number) => (
                            <div key={`${selectedNode.id}-editor-${index}`} className="flex items-center gap-2">
                              <Input onChange={(event) => updateOption(index, event.target.value)} value={option} />
                              <Button
                                onClick={() => removeOption(index)}
                                size="icon"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-card/70 p-5 text-sm text-muted-foreground">
                    Clique em qualquer card do canvas para editar esse bloco aqui.
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  );
};

export default FlowCanvas;
