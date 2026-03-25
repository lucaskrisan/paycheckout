import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Trash2, CheckCircle, AlertCircle, Clock, Copy, Info } from "lucide-react";
import { toast } from "sonner";

interface CustomDomain {
  id: string;
  hostname: string;
  status: string;
  ssl_status: string | null;
  cloudflare_hostname_id: string | null;
  created_at: string;
}

const statusBadge = (status: string, sslStatus: string | null) => {
  if (status === 'active' && sslStatus === 'active') {
    return <Badge className="text-[10px] gap-1 bg-green-500/15 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3" /> Ativo</Badge>;
  }
  if (status === 'active') {
    return <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="w-3 h-3" /> SSL pendente</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="destructive" className="text-[10px] gap-1"><AlertCircle className="w-3 h-3" /> Erro</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="w-3 h-3" /> Aguardando CNAME</Badge>;
};

const Domains = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    const { data } = await supabase
      .from("custom_domains")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDomains(data as CustomDomain[]);
  };

  const addDomain = async () => {
    if (!newDomain || !user) return;
    const hostname = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '');
    setAdding(true);

    const res = await supabase.functions.invoke('cloudflare-add-hostname', {
      body: { hostname },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error ?? "Erro ao adicionar domínio");
    } else {
      toast.success("Domínio adicionado! Configure o CNAME abaixo.");
      setNewDomain("");
      loadDomains();
    }
    setAdding(false);
  };

  const removeDomain = async (id: string) => {
    setRemoving(id);
    const res = await supabase.functions.invoke('cloudflare-remove-hostname', {
      body: { id },
    });

    if (res.error || res.data?.error) {
      toast.error("Erro ao remover domínio");
    } else {
      toast.success("Domínio removido");
      loadDomains();
    }
    setRemoving(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Domínios Customizados</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure domínios personalizados para seus checkouts</p>
      </div>

      {/* DNS Instructions */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2 text-blue-600">
            <Info className="w-4 h-4" /> Como configurar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Para usar um domínio próprio no seu checkout, siga os passos:</p>
          <ol className="list-decimal list-inside space-y-2 pl-1">
            <li>Adicione o domínio abaixo (ex: <code className="bg-muted px-1 rounded text-xs">checkout.meusite.com.br</code>)</li>
            <li>No painel DNS do seu domínio, crie um registro <strong>CNAME</strong>:</li>
          </ol>
          <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1 mt-2">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="text-muted-foreground">Nome: </span>
                <span className="text-foreground">checkout</span>
                <span className="text-muted-foreground ml-4">Tipo: </span>
                <span className="text-foreground">CNAME</span>
                <span className="text-muted-foreground ml-4">Valor: </span>
                <span className="text-foreground">app.panttera.com.br</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => copyToClipboard('app.panttera.com.br')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs">Após criar o CNAME, a ativação pode levar até 24h para o SSL ficar ativo.</p>
        </CardContent>
      </Card>

      {/* Domain list */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Globe className="w-4 h-4" /> Seus Domínios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum domínio configurado</p>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{d.hostname}</span>
                    {statusBadge(d.status, d.ssl_status)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={removing === d.id}
                    onClick={() => removeDomain(d.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              placeholder="ex: checkout.meusite.com.br"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              className="flex-1"
            />
            <Button onClick={addDomain} disabled={adding || !newDomain} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Domains;
