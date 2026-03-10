import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "lucide-react";

const Coupons = () => (
  <div className="space-y-6">
    <h1 className="font-display text-2xl font-bold text-foreground">Cupons</h1>
    <Card>
      <CardContent className="py-12 text-center">
        <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Em breve: crie cupons de desconto para seus produtos.</p>
      </CardContent>
    </Card>
  </div>
);

export default Coupons;
