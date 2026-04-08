import { memo } from "react";
import { Lock, Shield, ShieldCheck } from "lucide-react";

interface TrustFooterProps {
  isUSD?: boolean;
}

const TrustFooter = memo(function TrustFooter({ isUSD = false }: TrustFooterProps) {
  return (
    <div className="text-center space-y-3 pt-2 pb-2">
      <div className="flex items-center justify-center gap-4 text-xs text-[#565959]">
        <div className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-[#007185]" />
          <span>{isUSD ? "Secure payment" : "Pagamento seguro"}</span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#007185]" />
          <span>{isUSD ? "Data protected" : "Dados protegidos"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-[#007185]" />
          <span>SSL 256 bits</span>
        </div>
      </div>
      <p className="text-[11px] text-[#565959]">
        {isUSD ? (
          <>
            By continuing, you agree to the{" "}
            <a href="#" className="underline text-[#007185]">terms of use</a> and{" "}
            <a href="#" className="underline text-[#007185]">privacy policy</a>.
          </>
        ) : (
          <>
            Ao continuar, você concorda com os{" "}
            <a href="#" className="underline text-[#007185]">termos de uso</a> e{" "}
            <a href="#" className="underline text-[#007185]">política de privacidade</a>.
          </>
        )}
      </p>
    </div>
  );
});

export default TrustFooter;
