import { Card, CardContent } from "@/components/ui/card";
import { Link2 } from "lucide-react";

const Integrations = () => (
  <div className="space-y-6">
    <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
    <Card>
      <CardContent className="py-12 text-center">
        <Link2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Em breve: conecte webhooks, Zapier, e-mail marketing e mais.</p>
      </CardContent>
    </Card>
  </div>
);

export default Integrations;
