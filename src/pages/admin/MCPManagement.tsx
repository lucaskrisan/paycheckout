import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Cpu, Zap, Database, Activity, Globe, MessageSquare } from "lucide-react";
import WhatsAppBusinessConfig from "@/components/admin/WhatsAppBusinessConfig";

const MCPManagement = () => {
  const [activeTab, setActiveTab] = useState("connectors");

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold font-display text-foreground">MCP Control Center</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 py-0.5">
              <Cpu className="w-3 h-3 fill-primary" />
              Super Admin Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerenciamento centralizado de conectores externos e inteligência de dados.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 border p-1 h-auto flex-wrap">
          <TabsTrigger value="connectors" className="gap-2 py-2">
            <Zap className="w-4 h-4" />
            Conectores Meta
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-2 py-2">
            <Activity className="w-4 h-4" />
            IA & Inteligência
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="gap-2 py-2">
            <Database className="w-4 h-4" />
            Infraestrutura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-6">
          <WhatsAppBusinessConfig />
          
          <Card className="border-border/50 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Meta Ads Connector (Próximo Passo)
              </CardTitle>
              <CardDescription>
                Em breve: Sincronização direta de métricas de anúncios e ROAS.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                Model Context Tuning
              </CardTitle>
              <CardDescription>
                Ajuste como a IA processa o contexto dos seus produtores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center border-2 border-dashed rounded-xl opacity-50">
                <p className="text-sm">Configurações de modelo serão habilitadas após validação do MCP Meta.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status do Gateway</p>
                <p className="text-sm font-bold text-emerald-600">Online</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Uso de Contexto</p>
                <p className="text-sm font-bold">1.2 GB / 5 GB</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Latência MCP</p>
                <p className="text-sm font-bold">142ms</p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCPManagement;
