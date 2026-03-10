import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

const AbandonedCarts = () => (
  <div className="space-y-6">
    <h1 className="font-display text-2xl font-bold text-foreground">Carrinho Abandonado</h1>
    <Card>
      <CardContent className="py-12 text-center">
        <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Em breve: recupere vendas com e-mails automáticos para carrinhos abandonados.</p>
      </CardContent>
    </Card>
  </div>
);

export default AbandonedCarts;
