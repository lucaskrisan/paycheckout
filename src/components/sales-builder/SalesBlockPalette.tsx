import { useDraggable } from "@dnd-kit/core";
import {
  AlignLeft, Image, ThumbsUp, Star, Video, LayoutGrid,
  MousePointerClick, Shield, DollarSign, HelpCircle,
} from "lucide-react";
import { SALES_BLOCK_CATALOG, type SalesBlockType } from "./types";

const iconMap: Record<string, React.ElementType> = {
  AlignLeft, Image, ThumbsUp, Star, Video, LayoutGrid,
  MousePointerClick, Shield, DollarSign, HelpCircle,
};

function DraggableItem({ type, label, icon }: { type: SalesBlockType; label: string; icon: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sp-palette-${type}`,
    data: { type, fromPalette: true },
  });
  const Icon = iconMap[icon] || AlignLeft;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 border border-border rounded-lg cursor-grab hover:border-primary hover:bg-primary/5 transition-colors select-none ${isDragging ? "opacity-50" : ""}`}
    >
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

const SalesBlockPalette = () => (
  <div className="space-y-4">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Blocos</p>
    <div className="grid grid-cols-2 gap-2">
      {SALES_BLOCK_CATALOG.map((b) => (
        <DraggableItem key={b.type} type={b.type} label={b.label} icon={b.icon} />
      ))}
    </div>
  </div>
);

export default SalesBlockPalette;
