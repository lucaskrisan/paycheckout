import { motion } from "framer-motion";
import { Copy, Clock, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PixPaymentProps {
  totalAmount: number;
  qrCodeData?: string;
  pixCode?: string;
}

const PixPayment = ({ totalAmount, qrCodeData, pixCode }: PixPaymentProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* PIX info banner - teal left border */}
      <div className="flex items-center gap-3 bg-[#F7FAFA] border border-[#C8D3D9] border-l-4 border-l-[#007185] rounded-md p-3.5">
        <div className="p-1.5 rounded bg-[#007185]/10">
          <QrCode className="w-5 h-5 text-[#007185]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F1111]">Pagamento via PIX</p>
          <p className="text-xs text-[#565959] mt-0.5">
            Aprovação instantânea. Escaneie o QR Code ou copie o código para pagar.
          </p>
        </div>
      </div>

      {/* QR Code area */}
      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-44 h-44 bg-white border-2 border-dashed border-[#D5D9D9] rounded-xl flex items-center justify-center"
        >
          {qrCodeData ? (
            <img src={qrCodeData} alt="QR Code PIX" className="w-full h-full rounded-xl" />
          ) : (
            <div className="text-center space-y-2">
              <QrCode className="w-10 h-10 text-[#D5D9D9] mx-auto" />
              <p className="text-xs text-[#565959]">QR Code será gerado<br />ao finalizar</p>
            </div>
          )}
        </motion.div>

        <div className="text-center">
          <p className="text-2xl font-bold text-[#0F1111]">
            R$ {totalAmount.toFixed(2).replace('.', ',')}
          </p>
          <div className="flex items-center gap-1.5 justify-center mt-1">
            <Clock className="w-3.5 h-3.5 text-[#007185]" />
            <p className="text-xs text-[#565959]">Expira em 30 minutos</p>
          </div>
        </div>

        {pixCode && (
          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full h-11 gap-2 border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7FAFA]"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#007185]" />
                Código copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar código PIX
              </>
            )}
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-[#F7FAFA] border border-[#D5D9D9] rounded-lg p-4 space-y-2">
        <p className="text-xs font-bold text-[#0F1111]">Como pagar com PIX:</p>
        <ol className="text-xs text-[#565959] space-y-1 list-decimal list-inside">
          <li>Clique em "Finalizar com PIX"</li>
          <li>Abra o app do seu <strong className="text-[#007185]">banco</strong></li>
          <li>Escaneie o QR Code ou cole o código</li>
          <li>Confirme o pagamento</li>
        </ol>
      </div>
    </div>
  );
};

export default PixPayment;
