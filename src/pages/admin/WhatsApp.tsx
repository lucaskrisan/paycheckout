import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Plus, Smartphone, FileText } from "lucide-react";

const WhatsApp = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-green-500" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas conexões e templates de mensagens</p>
          </div>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nova Sessão
        </Button>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> Sessões
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma sessão criada</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Conecte seu primeiro número do WhatsApp para começar a enviar mensagens automáticas.
              </p>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Criar Primeira Sessão
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Como começar?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">›</span> Crie uma sessão
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">›</span> Configure templates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">›</span> Mensagens automáticas
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-1">Nenhum template criado</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Crie templates de mensagem para usar em automações de carrinho abandonado, confirmação de compra, etc.
              </p>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Criar Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsApp;
