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
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <QrCode className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Pagamento via PIX</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aprovação instantânea. Escaneie o QR Code ou copie o código para pagar.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-48 h-48 bg-card border-2 border-dashed border-border rounded-2xl flex items-center justify-center"
        >
          {qrCodeData ? (
            <img src={qrCodeData} alt="QR Code PIX" className="w-full h-full rounded-2xl" />
          ) : (
            <div className="text-center space-y-2">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">QR Code será gerado<br />ao finalizar</p>
            </div>
          )}
        </motion.div>

        <div className="text-center">
          <p className="text-2xl font-display font-bold text-foreground">
            R$ {totalAmount.toFixed(2).replace('.', ',')}
          </p>
          <div className="flex items-center gap-1.5 justify-center mt-1">
            <Clock className="w-3.5 h-3.5 text-checkout-badge" />
            <p className="text-xs text-muted-foreground">Expira em 30 minutos</p>
          </div>
        </div>

        {pixCode && (
          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full h-12 gap-2"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-primary" />
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

      <div className="bg-secondary rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">Como pagar com PIX:</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Clique em "Finalizar com PIX"</li>
          <li>Abra o app do seu banco</li>
          <li>Escaneie o QR Code ou cole o código</li>
          <li>Confirme o pagamento</li>
        </ol>
      </div>
    </div>
  );
};

export default PixPayment;
