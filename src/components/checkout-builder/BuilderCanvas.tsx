import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { BuilderComponent } from "./types";
import ComponentPreview from "./ComponentPreview";

function SortableItem({
  component,
  onRemove,
  onSelect,
  isSelected,
}: {
  component: BuilderComponent;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(component.id)}
      className={`group relative border rounded-lg p-3 transition-colors cursor-pointer ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-border"
      }`}
    >
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button {...attributes} {...listeners} className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="absolute -right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(component.id); }}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <ComponentPreview component={component} />
    </div>
  );
}

function DropZone({
  zone,
  components,
  selectedId,
  onRemove,
  onSelect,
  label,
  className,
}: {
  zone: string;
  components: BuilderComponent[];
  selectedId: string | null;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  label: string;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone });
  const ids = components.map((c) => c.id);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-lg border-2 border-dashed transition-colors p-2 ${
        isOver ? "border-primary bg-primary/5" : "border-border/50"
      } ${className || ""}`}
    >
      {components.length === 0 && (
        <p className="text-xs text-primary/60 text-center py-6">{label}</p>
      )}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {components.map((c) => (
            <SortableItem
              key={c.id}
              component={c}
              onRemove={onRemove}
              onSelect={onSelect}
              isSelected={selectedId === c.id}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

/** Simulated checkout form (non-interactive, visual only) */
const CheckoutFormPreview = () => (
  <div className="p-4 space-y-3 pointer-events-none select-none opacity-80">
    {/* Product header */}
    <div className="flex items-center gap-3 pb-3 border-b border-border/30">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
        <span className="text-lg">📦</span>
      </div>
      <div>
        <div className="h-4 w-48 bg-foreground/10 rounded" />
        <div className="h-3 w-32 bg-foreground/5 rounded mt-1.5" />
      </div>
    </div>
    {/* Form fields */}
    <div className="space-y-2">
      <div className="h-9 w-full bg-muted/60 rounded-md border border-border/30" />
      <div className="h-9 w-full bg-muted/60 rounded-md border border-border/30" />
      <div className="h-9 w-full bg-muted/60 rounded-md border border-border/30" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-9 bg-muted/60 rounded-md border border-border/30" />
        <div className="h-9 bg-muted/60 rounded-md border border-border/30" />
      </div>
    </div>
    {/* Payment methods */}
    <div className="flex gap-2 pt-1">
      <div className="h-8 w-16 bg-muted/40 rounded" />
      <div className="h-8 w-16 bg-muted/40 rounded" />
      <div className="h-8 w-16 bg-muted/40 rounded" />
      <div className="h-8 w-16 bg-muted/40 rounded" />
    </div>
    {/* Card form */}
    <div className="border border-border/30 rounded-lg p-3 space-y-2">
      <div className="h-8 w-full bg-muted/50 rounded" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-8 bg-muted/50 rounded" />
        <div className="h-8 bg-muted/50 rounded" />
        <div className="h-8 bg-muted/50 rounded" />
      </div>
      <div className="h-8 w-full bg-muted/50 rounded" />
    </div>
    {/* Price */}
    <div className="space-y-1 pt-1">
      <div className="h-3 w-24 bg-foreground/10 rounded" />
      <div className="h-3 w-40 bg-foreground/5 rounded" />
    </div>
    {/* CTA button */}
    <div className="h-12 w-full bg-primary rounded-lg" />
    {/* Footer */}
    <div className="flex justify-center gap-4 pt-1">
      <div className="h-3 w-20 bg-foreground/5 rounded" />
      <div className="h-3 w-20 bg-foreground/5 rounded" />
    </div>
  </div>
);

interface BuilderCanvasProps {
  components: BuilderComponent[];
  selectedId: string | null;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  isMobile: boolean;
}

const BuilderCanvas = ({ components, selectedId, onRemove, onSelect, isMobile }: BuilderCanvasProps) => {
  const topComponents = components.filter((c) => c.zone === "top").sort((a, b) => a.order - b.order);
  const leftComponents = components.filter((c) => c.zone === "left").sort((a, b) => a.order - b.order);
  const rightComponents = components.filter((c) => c.zone === "right").sort((a, b) => a.order - b.order);

  return (
    <div className={`mx-auto bg-background rounded-xl shadow-lg border border-border overflow-hidden ${isMobile ? "max-w-[375px]" : "max-w-[900px]"}`}>
      {/* Top zone */}
      <DropZone
        zone="top"
        components={topComponents}
        selectedId={selectedId}
        onRemove={onRemove}
        onSelect={onSelect}
        label="Arraste componentes aqui (topo)"
        className="rounded-none border-x-0 border-t-0"
      />

      {/* Two-column layout */}
      <div className={`grid gap-0 ${isMobile ? "grid-cols-1" : "grid-cols-5"}`}>
        {/* Left column */}
        <div className={isMobile ? "" : "col-span-3 border-r border-dashed border-border/50"}>
          {/* Simulated checkout form */}
          <CheckoutFormPreview />

          {/* Drop zone below form */}
          <DropZone
            zone="left"
            components={leftComponents}
            selectedId={selectedId}
            onRemove={onRemove}
            onSelect={onSelect}
            label="Arraste componentes aqui"
            className="rounded-none border-x-0 border-b-0"
          />
        </div>

        {/* Right column */}
        {!isMobile && (
          <div className="col-span-2">
            <DropZone
              zone="right"
              components={rightComponents}
              selectedId={selectedId}
              onRemove={onRemove}
              onSelect={onSelect}
              label="Arraste componentes aqui"
              className="rounded-none border-0 min-h-[400px]"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderCanvas;
