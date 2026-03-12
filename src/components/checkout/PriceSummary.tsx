import { BadgePercent, Zap, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PriceSummaryProps {
  originalPrice: number;
  pixDiscount: number;
  couponDiscount: number;
  bumpTotal: number;
  finalAmount: number;
  paymentMethod: "pix" | "credit_card";
  couponCode?: string;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const PriceSummary = ({
  originalPrice,
  pixDiscount,
  couponDiscount,
  bumpTotal,
  finalAmount,
  paymentMethod,
  couponCode,
}: PriceSummaryProps) => {
  const hasDiscount = pixDiscount > 0 || couponDiscount > 0;

  return (
    <div className="rounded-xl border border-[#D5D9D9] bg-gradient-to-b from-[#FAFCFC] to-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#F7F8F8] border-b border-[#E8EBED] flex items-center gap-2">
        <BadgePercent className="w-4 h-4 text-[#007185]" />
        <span className="text-sm font-bold text-[#0F1111]">Resumo do pedido</span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Original price */}
        <div className="flex justify-between text-sm">
          <span className="text-[#565959]">Subtotal</span>
          <span className={hasDiscount ? "line-through text-[#565959]" : "font-semibold text-[#0F1111]"}>
            {fmt(originalPrice)}
          </span>
        </div>

        {/* PIX discount */}
        <AnimatePresence>
          {pixDiscount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between text-sm"
            >
              <span className="flex items-center gap-1.5 text-[#067D62]">
                <Zap className="w-3.5 h-3.5" />
                Desconto PIX (5%)
              </span>
              <span className="font-semibold text-[#067D62]">- {fmt(pixDiscount)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon discount */}
        <AnimatePresence>
          {couponDiscount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between text-sm"
            >
              <span className="flex items-center gap-1.5 text-[#067D62]">
                <Tag className="w-3.5 h-3.5" />
                Cupom {couponCode ? couponCode.toUpperCase() : ""}
              </span>
              <span className="font-semibold text-[#067D62]">- {fmt(couponDiscount)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bump total */}
        {bumpTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#565959]">Adicionais</span>
            <span className="text-[#0F1111]">+ {fmt(bumpTotal)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-dashed border-[#D5D9D9] my-1" />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-bold text-[#0F1111]">Total</span>
          <div className="text-right">
            <span className="text-xl font-extrabold text-[#0F1111]">{fmt(finalAmount)}</span>
            {paymentMethod === "pix" && pixDiscount > 0 && (
              <p className="text-[10px] text-[#067D62] font-semibold mt-0.5">
                Você economiza {fmt(pixDiscount)} com PIX! 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceSummary;
