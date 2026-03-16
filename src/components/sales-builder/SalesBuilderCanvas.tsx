import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { SalesBlock } from "./types";
import SalesBlockPreview from "./SalesBlockPreview";

function SortableBlock({
  block, onRemove, onSelect, isSelected, productName, productPrice, originalPrice, checkoutUrl,
}: {
  block: SalesBlock;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
  productName?: string;
  productPrice?: number;
  originalPrice?: number;
  checkoutUrl?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(block.id)}
      className={`group relative border-2 rounded-lg transition-colors cursor-pointer ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"
      }`}
    >
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button {...attributes} {...listeners} className="cursor-grab p-1 bg-card rounded shadow-sm border border-border text-muted-foreground hover:text-foreground">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="absolute -right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={(e) => { e.stopPropagation(); onRemove(block.id); }} className="p-1 bg-card rounded shadow-sm border border-border text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <SalesBlockPreview block={block} productName={productName} productPrice={productPrice} originalPrice={originalPrice} checkoutUrl={checkoutUrl} />
    </div>
  );
}

interface Props {
  blocks: SalesBlock[];
  selectedId: string | null;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  productName?: string;
  productPrice?: number;
  originalPrice?: number;
  checkoutUrl?: string;
}

const SalesBuilderCanvas = ({ blocks, selectedId, onRemove, onSelect, productName, productPrice, originalPrice, checkoutUrl }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: "sales-canvas" });
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const ids = sorted.map((b) => b.id);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] bg-background rounded-xl shadow-lg border transition-colors ${isOver ? "border-primary" : "border-border"}`}
    >
      {sorted.length === 0 && (
        <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
          Arraste blocos aqui para montar sua página de vendas
        </div>
      )}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border">
          {sorted.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onRemove={onRemove}
              onSelect={onSelect}
              isSelected={selectedId === block.id}
              productName={productName}
              productPrice={productPrice}
              originalPrice={originalPrice}
              checkoutUrl={checkoutUrl}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default SalesBuilderCanvas;
