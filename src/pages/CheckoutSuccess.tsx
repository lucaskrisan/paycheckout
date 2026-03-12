import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, PartyPopper, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const confettiColors = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#a855f7", "#ec4899"];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("product") || "seu produto";
  const method = searchParams.get("method") || "pix";
  const email = searchParams.get("email") || "";

  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      delay: Math.random() * 0.5,
      size: Math.random() * 8 + 4,
    }));
    setConfetti(pieces);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden relative">
      {/* Confetti */}
      {confetti.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute top-0 rounded-sm pointer-events-none"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: "100vh", opacity: 0, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
          transition={{ duration: 2.5 + Math.random(), delay: piece.delay, ease: "easeIn" }}
        />
      ))}

      <motion.div
        className="max-w-md w-full text-center space-y-6 z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <PartyPopper className="w-5 h-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              {method === "credit_card" ? "Pagamento Aprovado!" : "PIX Gerado com Sucesso!"}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {method === "credit_card"
              ? `Sua compra de "${productName}" foi confirmada.`
              : `Após a confirmação do pagamento, você receberá o acesso a "${productName}".`}
          </p>
        </div>

        {email && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Verifique seu e-mail</p>
              <p className="text-xs text-muted-foreground">
                Enviamos os detalhes da compra para <strong>{email}</strong>
              </p>
            </div>
          </div>
        )}

        <div className="pt-4">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              Voltar ao início
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
