import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, Loader2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CouponResult {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface CouponFieldProps {
  productId: string;
  productPrice: number;
  onApply: (coupon: CouponResult | null) => void;
}

const CouponField = ({ productId, productPrice, onApply }: CouponFieldProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<CouponResult | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .rpc("validate_coupon", { p_code: code.trim() });

      if (fetchError) throw fetchError;
      const rows = data as any[];
      const coupon = rows?.[0];
      if (!coupon) { setError("Cupom não encontrado"); return; }
      if (coupon.product_id && coupon.product_id !== productId) { setError("Cupom não válido para este produto"); return; }
      if (coupon.min_amount && productPrice < coupon.min_amount) { setError(`Valor mínimo: R$ ${Number(coupon.min_amount).toFixed(2).replace(".", ",")}`); return; }

      const result: CouponResult = { id: data.id, code: data.code, discount_type: data.discount_type, discount_value: data.discount_value };
      setApplied(result);
      onApply(result);
    } catch {
      setError("Erro ao validar cupom");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => { setApplied(null); setCode(""); setError(""); onApply(null); };

  if (applied) {
    return (
      <div className="flex items-center gap-2 bg-[#F7FAFA] border border-[#007185] rounded-lg px-4 py-3">
        <Check className="w-4 h-4 text-[#007185] shrink-0" />
        <span className="text-sm font-medium text-[#0F1111] flex-1">
          Cupom <strong>{applied.code.toUpperCase()}</strong> aplicado
          {applied.discount_type === "percent"
            ? ` (${applied.discount_value}% off)`
            : ` (-R$ ${applied.discount_value.toFixed(2).replace(".", ",")})`}
        </span>
        <button onClick={handleRemove} className="text-[#565959] hover:text-[#B12704] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565959]" />
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            placeholder="CUPOM DE DESCONTO"
            className="pl-10 h-11 bg-white border-[#D5D9D9] text-[#0F1111] uppercase placeholder:text-[#767676] rounded-lg focus:border-[#007185]"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          variant="outline"
          className="h-11 px-5 border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7FAFA]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error && <p className="text-xs text-[#B12704]">{error}</p>}
    </div>
  );
};

export default CouponField;
