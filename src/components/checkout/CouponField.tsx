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
        .from("coupons")
        .select("id, code, discount_type, discount_value, max_uses, used_count, min_amount, product_id, expires_at")
        .ilike("code", code.trim())
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError("Cupom não encontrado");
        return;
      }

      // Validate product scope
      if (data.product_id && data.product_id !== productId) {
        setError("Cupom não válido para este produto");
        return;
      }

      // Validate max uses
      if (data.max_uses && data.used_count >= data.max_uses) {
        setError("Cupom esgotado");
        return;
      }

      // Validate expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("Cupom expirado");
        return;
      }

      // Validate min amount
      if (data.min_amount && productPrice < data.min_amount) {
        setError(`Valor mínimo: R$ ${data.min_amount.toFixed(2).replace(".", ",")}`);
        return;
      }

      const result: CouponResult = {
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
      };
      setApplied(result);
      onApply(result);
    } catch {
      setError("Erro ao validar cupom");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode("");
    setError("");
    onApply(null);
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
        <Check className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1">
          Cupom <strong>{applied.code.toUpperCase()}</strong> aplicado
          {applied.discount_type === "percent"
            ? ` (${applied.discount_value}% off)`
            : ` (-R$ ${applied.discount_value.toFixed(2).replace(".", ",")})`}
        </span>
        <button onClick={handleRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            placeholder="Cupom de desconto"
            className="pl-10 h-11 bg-card border-border uppercase"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          variant="outline"
          className="h-11 px-5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default CouponField;
