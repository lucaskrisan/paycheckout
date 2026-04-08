import { memo, useState, useCallback } from "react";
import { Settings2, GripVertical, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";

export interface MetricConfig {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  allMetrics: MetricConfig[];
  visibleMetrics: string[];
  metricsOrder: string[];
  onSave: (visible: string[], order: string[]) => void;
  saving?: boolean;
}

const DashboardCustomizer = memo(function DashboardCustomizer({
  allMetrics,
  visibleMetrics,
  metricsOrder,
  onSave,
  saving,
}: Props) {
  const [open, setOpen] = useState(false);
  const [localVisible, setLocalVisible] = useState<string[]>(visibleMetrics);
  const [localOrder, setLocalOrder] = useState<string[]>(metricsOrder);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setLocalVisible([...visibleMetrics]);
      setLocalOrder([...metricsOrder]);
    }
    setOpen(isOpen);
  }, [visibleMetrics, metricsOrder]);

  const toggleMetric = (key: string) => {
    setLocalVisible((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...localOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setLocalOrder(newOrder);
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  const handleSave = () => {
    onSave(localVisible, localOrder);
    setOpen(false);
  };

  const orderedMetrics = localOrder
    .map((key) => allMetrics.find((m) => m.key === key))
    .filter(Boolean) as MetricConfig[];

  // Add any metrics not in the order yet (new ones)
  allMetrics.forEach((m) => {
    if (!orderedMetrics.find((om) => om.key === m.key)) {
      orderedMetrics.push(m);
    }
  });

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Personalizar dashboard">
          <Settings2 className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[340px] sm:w-[380px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Personalizar Dashboard
          </SheetTitle>
          <SheetDescription>
            Arraste para reordenar e use os toggles para mostrar/ocultar métricas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-1.5">
          {orderedMetrics.map((metric, idx) => {
            const isVisible = localVisible.includes(metric.key);
            const Icon = metric.icon;
            return (
              <div
                key={metric.key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                  dragIdx === idx
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : isVisible
                    ? "border-border bg-card hover:bg-muted/40"
                    : "border-border/50 bg-muted/20 opacity-60"
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className={`p-1.5 rounded-md ${isVisible ? "bg-primary/15" : "bg-muted"}`}>
                  <Icon className={`w-3.5 h-3.5 ${isVisible ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span className={`text-sm flex-1 ${isVisible ? "text-foreground" : "text-muted-foreground"}`}>
                  {metric.label}
                </span>
                <Switch
                  checked={isVisible}
                  onCheckedChange={() => toggleMetric(metric.key)}
                  className="scale-90"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default DashboardCustomizer;
