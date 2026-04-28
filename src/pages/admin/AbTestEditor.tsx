import { useCallback, useEffect, useMemo, useRef, useState, DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Settings as SettingsIcon,
  BarChart3,
  FileText,
  ShoppingCart,
  Link2,
  AlertCircle,
  X,
  GripVertical,
  Trash2,
  Play,
  Pause,
  Copy,
} from "lucide-react";

// ---------------- Types ----------------

type NodeKind = "config" | "abtest" | "page" | "checkout";

type ConfigData = { kind: "config"; label: string; testName: string; entryUrl: string; visits: number };
type AbTestData = { kind: "abtest"; label: string; subtitle: string; splits: { label: string; weight: number }[] };
type PageData = { kind: "page"; label: string; subtitle: string; url: string };
type CheckoutData = {
  kind: "checkout";
  label: string;
  subtitle: string;
  productId: string | null;
  offerId: string | null;
  templateId: string | null;
};

type FlowNode =
  | Node<ConfigData, "config">
  | Node<AbTestData, "abtest">
  | Node<PageData, "page">
  | Node<CheckoutData, "checkout">;

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const REDIRECT_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/ab-redirect`;

// ---------------- Custom Nodes ----------------

function NodeShell({
  color,
  icon,
  title,
  subtitle,
  children,
  inHandle = true,
  outHandle = true,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  inHandle?: boolean;
  outHandle?: boolean;
}) {
  return (
    <div
      className="rounded-xl bg-[#0d0f15]/95 backdrop-blur-sm shadow-xl min-w-[220px] max-w-[260px]"
      style={{ border: `1.5px solid ${color}`, boxShadow: `0 0 0 1px ${color}22, 0 8px 24px ${color}33` }}
    >
      {inHandle && (
        <Handle type="target" position={Position.Left} style={{ background: color, width: 10, height: 10, border: "2px solid #0d0f15" }} />
      )}
      {outHandle && (
        <Handle type="source" position={Position.Right} style={{ background: color, width: 10, height: 10, border: "2px solid #0d0f15" }} />
      )}
      <div className="p-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

function ConfigNode({ data }: NodeProps<Node<ConfigData, "config">>) {
  return (
    <NodeShell
      color="#3b82f6"
      icon={<SettingsIcon className="h-4 w-4" />}
      title={data.label}
      subtitle={data.testName}
      inHandle={false}
    >
      <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/40">
        <span className="text-muted-foreground">Acessos</span>
        <span className="font-bold">{data.visits ?? 0}</span>
      </div>
      {!data.entryUrl ? (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-300 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-3 w-3" /> Salve para gerar URL
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 truncate">
          <Link2 className="h-3 w-3 shrink-0" /> <span className="truncate">{data.entryUrl}</span>
        </div>
      )}
    </NodeShell>
  );
}

function AbTestNode({ data }: NodeProps<Node<AbTestData, "abtest">>) {
  return (
    <NodeShell color="#a855f7" icon={<BarChart3 className="h-4 w-4" />} title={data.label} subtitle={data.subtitle}>
      {data.splits.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
          <span className="font-semibold">{s.label}</span>
          <span className="text-muted-foreground">{s.weight}%</span>
        </div>
      ))}
    </NodeShell>
  );
}

function PageNode({ data }: NodeProps<Node<PageData, "page">>) {
  const hasUrl = !!data.url?.trim();
  return (
    <NodeShell color="#10b981" icon={<FileText className="h-4 w-4" />} title={data.label} subtitle={data.subtitle}>
      <div
        className={`flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded border truncate ${
          hasUrl ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" : "text-muted-foreground bg-muted/40 border-border/40"
        }`}
      >
        <Link2 className="h-3 w-3 shrink-0" />
        <span className="truncate">{hasUrl ? data.url : "Configurar URL"}</span>
      </div>
      {!hasUrl && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-300 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-3 w-3" /> Clique para configurar
        </div>
      )}
    </NodeShell>
  );
}

function CheckoutNode({ data }: NodeProps<Node<CheckoutData, "checkout">>) {
  return (
    <NodeShell color="#f97316" icon={<ShoppingCart className="h-4 w-4" />} title={data.label} subtitle={data.subtitle}>
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Oferta</div>
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded bg-muted/40 border border-border/40 truncate">
          {data.productId ? "Oferta selecionada" : "Selecionar oferta"}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Design</div>
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded bg-muted/40 border border-border/40 truncate">
          {data.templateId ? "Template customizado" : "Design padrão"}
        </div>
      </div>
      {!data.productId && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-300 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-3 w-3" /> Selecione uma oferta
        </div>
      )}
    </NodeShell>
  );
}

const nodeTypes = {
  config: ConfigNode,
  abtest: AbTestNode,
  page: PageNode,
  checkout: CheckoutNode,
};

// ---------------- Initial graph ----------------

function buildInitialGraph(testName: string): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = [
    { id: "config", type: "config", position: { x: 0, y: 200 }, data: { kind: "config", label: "Configuração Inicial", testName, entryUrl: "", visits: 0 } },
    { id: "abtest-pages", type: "abtest", position: { x: 290, y: 200 }, data: { kind: "abtest", label: "Teste Páginas", subtitle: "Divide tráfego", splits: [{ label: "A", weight: 50 }, { label: "B", weight: 50 }] } },
    { id: "page-a", type: "page", position: { x: 580, y: 60 }, data: { kind: "page", label: "Página A", subtitle: "Landing Page", url: "" } },
    { id: "page-b", type: "page", position: { x: 580, y: 340 }, data: { kind: "page", label: "Página B", subtitle: "Landing Page", url: "" } },
    { id: "abtest-checkouts", type: "abtest", position: { x: 880, y: 200 }, data: { kind: "abtest", label: "Teste Checkouts", subtitle: "Teste de checkout", splits: [{ label: "A", weight: 50 }, { label: "B", weight: 50 }] } },
    { id: "checkout-a", type: "checkout", position: { x: 1180, y: 60 }, data: { kind: "checkout", label: "Checkout A", subtitle: "Página de pagamento", productId: null, offerId: null, templateId: null } },
    { id: "checkout-b", type: "checkout", position: { x: 1180, y: 340 }, data: { kind: "checkout", label: "Checkout B", subtitle: "Página de pagamento", productId: null, offerId: null, templateId: null } },
  ];
  const edge = (id: string, source: string, target: string, color: string): Edge => ({
    id, source, target, type: "smoothstep",
    animated: true,
    style: { stroke: color, strokeWidth: 2, strokeDasharray: "6 6" },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  });
  const edges: Edge[] = [
    edge("e1", "config", "abtest-pages", "#a855f7"),
    edge("e2", "abtest-pages", "page-a", "#10b981"),
    edge("e3", "abtest-pages", "page-b", "#10b981"),
    edge("e4", "page-a", "abtest-checkouts", "#a855f7"),
    edge("e5", "page-b", "abtest-checkouts", "#a855f7"),
    edge("e6", "abtest-checkouts", "checkout-a", "#f97316"),
    edge("e7", "abtest-checkouts", "checkout-b", "#f97316"),
  ];
  return { nodes, edges };
}

// ---------------- Sidebar palette ----------------

const PALETTE: { kind: NodeKind; label: string; icon: React.ReactNode; color: string }[] = [
  { kind: "abtest", label: "Teste A/B", icon: <BarChart3 className="h-4 w-4" />, color: "#a855f7" },
  { kind: "page", label: "Página de Vendas", icon: <FileText className="h-4 w-4" />, color: "#10b981" },
  { kind: "checkout", label: "Checkout", icon: <ShoppingCart className="h-4 w-4" />, color: "#f97316" },
];

function PaletteItem({ kind, label, icon, color }: { kind: NodeKind; label: string; icon: React.ReactNode; color: string }) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("application/reactflow", kind);
    e.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-foreground/30 transition"
      style={{ borderColor: `${color}55` }}
    >
      <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      <GripVertical className="h-3 w-3 text-muted-foreground ml-auto" />
    </div>
  );
}

// ---------------- Main editor ----------------

function EditorInner() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reactFlow = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [testId, setTestId] = useState<string | null>(routeId && routeId !== "new" ? routeId : null);
  const [name, setName] = useState("Novo Teste A/B");
  const [autoWinner, setAutoWinner] = useState(true);
  const [stickyDays, setStickyDays] = useState(30);
  const [entryUrl, setEntryUrl] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");

  const initial = useMemo(() => buildInitialGraph("Novo Teste A/B"), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("config");

  // Load existing test if editing
  const { data: existing, isLoading } = useQuery({
    queryKey: ["ab_test_full", testId],
    enabled: !!testId && testId !== "new",
    queryFn: async () => {
      const { data, error } = await supabase.from("ab_tests" as any).select("*").eq("id", testId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });


  useEffect(() => {
    if (!existing) return;
    setName(existing.name ?? "Novo Teste A/B");
    setAutoWinner(!!existing.auto_winner_enabled);
    setStickyDays(existing.sticky_days ?? 30);
    setSlug(existing.slug ?? null);
    setStatus(existing.status ?? "draft");
    const generated = existing.slug ? `${REDIRECT_BASE}/${existing.slug}?type=page` : "";
    setEntryUrl(existing.entry_url ?? generated);
    const g = existing.graph;
    if (g && Array.isArray(g.nodes) && g.nodes.length > 0) {
      setNodes(g.nodes as FlowNode[]);
      setEdges((g.edges as Edge[]) ?? []);
    }
  }, [existing, setNodes, setEdges]);

  // Reflect entry URL inside Config node
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === "config"
          ? ({ ...n, data: { ...(n.data as ConfigData), entryUrl, testName: name } } as FlowNode)
          : n
      )
    );
  }, [entryUrl, name, setNodes]);

  // Products for checkout selector
  const { data: products = [] } = useQuery({
    queryKey: ["products_for_ab"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["checkout_templates_for_ab"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_templates")
        .select("id,name")
        .eq("published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Drag from palette → drop on canvas
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData("application/reactflow") as NodeKind;
      if (!kind || !wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlow.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
      const id = `${kind}-${Math.random().toString(36).slice(2, 7)}`;
      let newNode: FlowNode;
      if (kind === "abtest") {
        newNode = { id, type: "abtest", position, data: { kind: "abtest", label: "Novo Teste", subtitle: "Divide tráfego", splits: [{ label: "A", weight: 50 }, { label: "B", weight: 50 }] } };
      } else if (kind === "page") {
        const idx = nodes.filter((n) => n.type === "page").length;
        newNode = { id, type: "page", position, data: { kind: "page", label: `Página ${String.fromCharCode(65 + idx)}`, subtitle: "Landing Page", url: "" } };
      } else {
        const idx = nodes.filter((n) => n.type === "checkout").length;
        newNode = { id, type: "checkout", position, data: { kind: "checkout", label: `Checkout ${String.fromCharCode(65 + idx)}`, subtitle: "Página de pagamento", productId: null, offerId: null, templateId: null } };
      }
      setNodes((ns) => [...ns, newNode]);
    },
    [reactFlow, nodes, setNodes]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...c, type: "smoothstep", animated: true, style: { stroke: "#a855f7", strokeWidth: 2, strokeDasharray: "6 6" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7" } },
          eds
        )
      );
    },
    [setEdges]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const updateNodeData = (id: string, patch: Record<string, any>) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as FlowNode) : n)));
  };

  const deleteNode = (id: string) => {
    if (id === "config") {
      toast.error("O nó de Configuração Inicial não pode ser removido");
      return;
    }
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  };

  // Save
  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const slugify = (s: string) =>
        (s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) ||
          `teste-${Math.random().toString(36).slice(2, 8)}`);

      const graph = { nodes, edges };
      let id = testId;
      let theSlug = slug;

      if (!id) {
        theSlug = slugify(`${name}-${Math.random().toString(36).slice(2, 6)}`);
        const generatedEntry = `${REDIRECT_BASE}/${theSlug}?type=page`;
        const { data, error } = await supabase
          .from("ab_tests" as any)
          .insert({
            user_id: user.id,
            name: name.trim() || "Novo Teste A/B",
            slug: theSlug,
            auto_winner_enabled: autoWinner,
            sticky_days: stickyDays,
            graph,
            entry_url: generatedEntry,
          })
          .select()
          .single();
        if (error) throw error;
        id = (data as any).id;
        setTestId(id);
        setSlug(theSlug);
        setEntryUrl(generatedEntry);
        window.history.replaceState(null, "", `/admin/ab-tests/${id}`);
      } else {
        const { error } = await supabase
          .from("ab_tests" as any)
          .update({
            name: name.trim() || "Novo Teste A/B",
            auto_winner_enabled: autoWinner,
            sticky_days: stickyDays,
            graph,
            entry_url: entryUrl,
          })
          .eq("id", id);
        if (error) throw error;
      }

      const pageNodes = nodes.filter((n) => n.type === "page") as Node<PageData, "page">[];
      const checkoutNodes = nodes.filter((n) => n.type === "checkout") as Node<CheckoutData, "checkout">[];
      
      // Variants are defined by Page nodes. If no page nodes, we'll create at least 2 default ones.
      const variantSlots = Math.max(pageNodes.length, 2);

      const { data: existingVars } = await supabase.from("ab_test_variants" as any).select("id,sort_order").eq("test_id", id);
      const existing = ((existingVars ?? []) as unknown) as { id: string; sort_order: number }[];

      for (let i = 0; i < variantSlots; i++) {
        const label = String.fromCharCode(65 + i);
        const page = pageNodes[i];
        
        // Find if this page is connected to a checkout
        let checkoutUrl = null;
        if (page) {
          const connectedEdge = edges.find(e => e.source === page.id);
          if (connectedEdge) {
            const target = nodes.find(n => n.id === connectedEdge.target);
            if (target && target.type === "checkout") {
              const d = target.data as CheckoutData;
              if (d.productId) {
                // Construct Panttera checkout URL
                checkoutUrl = `https://checkout.panttera.com.br/pay/${d.productId}`;
                if (d.offerId) checkoutUrl += `?offer=${d.offerId}`;
              }
            }
          }
        }

        const payload = {
          name: page?.data?.label ?? `Variante ${label}`,
          page_url: page?.data?.url ?? null,
          checkout_url: checkoutUrl,
          weight: Math.round(100 / variantSlots),
          label,
          sort_order: i,
        };
        const found = existing.find((e) => e.sort_order === i);
        if (found) {
          await supabase.from("ab_test_variants" as any).update(payload).eq("id", found.id);
        } else {
          await supabase.from("ab_test_variants" as any).insert({ test_id: id, ...payload });
        }
      }
      for (const e of existing) {
        if (e.sort_order >= variantSlots) {
          await supabase.from("ab_test_variants" as any).delete().eq("id", e.id);
        }
      }

      return id!;
    },
    onSuccess: (id) => {
      const isFirstSave = (!routeId || routeId === "new") && !testId;
      toast.success(isFirstSave ? "Teste A/B criado com sucesso!" : "Teste salvo");
      qc.invalidateQueries({ queryKey: ["ab_tests"] });
      qc.invalidateQueries({ queryKey: ["ab_test_full", id] });
      if (!routeId || routeId === "new") navigate(`/admin/ab-tests/${id}`, { replace: true });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const validateForStart = (): string | null => {
    const pageNodes = nodes.filter((n) => n.type === "page") as Node<PageData, "page">[];
    const pagesMissing = pageNodes.filter((n) => !n.data.url || !n.data.url.trim()).map((n) => n.data.label);
    if (pagesMissing.length > 0) return `Configure as URLs das páginas de vendas: ${pagesMissing.join(", ")}`;
    return null;
  };

  const toggleStatus = useMutation({
    mutationFn: async () => {
      if (!testId) throw new Error("Salve o teste antes de iniciar");
      const newStatus = status === "active" ? "paused" : "active";
      if (newStatus === "active") {
        const err = validateForStart();
        if (err) { setValidationError(err); throw new Error(err); }
      }
      const patch: any = { status: newStatus };
      if (newStatus === "active" && !status.includes("active")) patch.started_at = new Date().toISOString();
      const { error } = await supabase.from("ab_tests" as any).update(patch).eq("id", testId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      setStatus(newStatus);
      setValidationError(null);
      toast.success(newStatus === "active" ? "Teste iniciado" : "Teste pausado");
    },
  });

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // No longer using useEffect for automatic save of everything.
  // We'll save only the graph layout (positions) automatically to keep the UI fluid.
  const isFirstAutosaveRef = useRef(true);
  useEffect(() => {
    if (isFirstAutosaveRef.current) { isFirstAutosaveRef.current = false; return; }
    if (status === "active" || !testId) return;

    const t = setTimeout(async () => {
      // Automatic save only for node positions (graph)
      const graph = { nodes, edges };
      await supabase.from("ab_tests" as any).update({ graph }).eq("id", testId);
      setLastSavedAt(new Date());
    }, 3000);
    
    return () => clearTimeout(t);
  }, [nodes, edges]);

  const copyEntryUrl = async () => {
    if (!entryUrl) return;
    await navigator.clipboard.writeText(entryUrl);
    toast.success("URL copiada!");
  };

  const statusBadge = (() => {
    if (status === "active") return { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    if (status === "paused") return { label: "Pausado", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    return { label: "Rascunho", cls: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40" };
  })();

  if (isLoading) {
    return (
      <div className="h-screen bg-[#0d0f15] flex flex-col items-center justify-center p-8 space-y-6">
        <div className="flex items-center justify-between w-full max-w-7xl px-4">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded bg-white/5 animate-pulse" />
            <div className="h-6 w-48 bg-white/5 animate-pulse rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-white/5 animate-pulse rounded" />
            <div className="h-9 w-32 bg-primary/20 animate-pulse rounded" />
          </div>
        </div>
        <div className="flex-1 w-full max-w-7xl bg-white/5 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {validationError && (
        <div className="bg-red-950/60 border-b border-red-500/40 text-red-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" /> <span>{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      <header className="h-14 border-b border-border/60 bg-background/80 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/ab-tests")}><ArrowLeft className="h-4 w-4" /></Button>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-64 bg-transparent border-transparent font-bold" />
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadge.cls}`}>{statusBadge.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {testId && (
            <Button onClick={() => toggleStatus.mutate()} className={status === "active" ? "bg-amber-600" : "bg-emerald-600"}>
              {status === "active" ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {status === "active" ? "Pausar" : "Iniciar"}
            </Button>
          )}
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {save.isPending ? "Salvando…" : lastSavedAt ? `Salvo ${lastSavedAt.toLocaleTimeString()}` : "Rascunho"}
          </span>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-violet-600"><Save className="h-4 w-4 mr-2" /> Salvar</Button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-60 border-r border-border/60 bg-background/60 p-4 space-y-4">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Paleta</p>
          {PALETTE.map((p) => <PaletteItem key={p.kind} {...p} />)}
        </aside>
        <div ref={wrapperRef} className="flex-1 relative bg-[#0a0c12]">
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onConnect={onConnect} 
            onNodeClick={(_, n) => setSelectedNodeId(n.id)} 
            onPaneClick={() => setSelectedNodeId(null)} 
            nodeTypes={nodeTypes as any} 
            fitView 
            proOptions={{ hideAttribution: true }}
            selectNodesOnDrag={false}
          >
            <Background gap={20} size={1} color="#1e2230" />
            <Controls />
          </ReactFlow>
        </div>
        {selectedNode && (
          <aside className="w-80 border-l border-border/60 p-5 space-y-4 overflow-y-auto">
            <h3 className="font-bold">{selectedNode.data.label}</h3>
            {selectedNode.type === "config" && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded border text-xs">
                  <p className="text-muted-foreground mb-1">URL de Entrada:</p>
                  <code className="break-all text-emerald-400">{entryUrl || "Salve para gerar"}</code>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Vencedor automático</Label>
                  <Switch checked={autoWinner} onCheckedChange={setAutoWinner} />
                </div>
              </div>
            )}
            {selectedNode.type === "page" && (
              <div className="space-y-4">
                <Label className="text-xs font-medium uppercase text-muted-foreground tracking-widest">Configuração da Página</Label>
                <div className="space-y-2">
                  <Label className="text-xs">Nome da Variante</Label>
                  <Input value={selectedNode.data.label} onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">URL da Página (LP)</Label>
                  <Input 
                    placeholder="https://suapagina.com.br"
                    value={(selectedNode.data as PageData).url || ""} 
                    onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })} 
                  />
                  <p className="text-[10px] text-muted-foreground italic">Insira a URL real da sua página de vendas.</p>
                </div>
                <Button variant="outline" className="w-full text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Página
                </Button>
              </div>
            )}
            {selectedNode.type === "checkout" && (
              <div className="space-y-4">
                <Label className="text-xs font-medium uppercase text-muted-foreground tracking-widest">Configuração do Checkout</Label>
                <div className="space-y-2">
                  <Label className="text-xs">Produto / Oferta</Label>
                  <Select 
                    value={(selectedNode.data as CheckoutData).productId || ""} 
                    onValueChange={(v) => updateNodeData(selectedNode.id, { productId: v })}
                  >
                    <SelectTrigger className="bg-muted/40 border-border/40">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                      {products.length === 0 && <div className="p-2 text-xs text-muted-foreground text-center">Nenhum produto ativo</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Design / Template</Label>
                  <Select 
                    value={(selectedNode.data as CheckoutData).templateId || ""} 
                    onValueChange={(v) => updateNodeData(selectedNode.id, { templateId: v })}
                  >
                    <SelectTrigger className="bg-muted/40 border-border/40">
                      <SelectValue placeholder="Design Padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Design Padrão Pantera</SelectItem>
                      {templates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Checkout
                </Button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default function AbTestEditor() {
  return <ReactFlowProvider><EditorInner /></ReactFlowProvider>;
}
