import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Domains = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    const { data } = await supabase
      .from("facebook_domains")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDomains(data);
  };

  const addDomain = async () => {
    if (!newDomain || !user) return;
    setAdding(true);
    const { error } = await supabase.from("facebook_domains").insert({
      domain: newDomain,
      user_id: user.id,
      verified: false,
    });
    if (error) {
      toast.error("Erro ao adicionar domínio");
    } else {
      toast.success("Domínio adicionado");
      setNewDomain("");
      loadDomains();
    }
    setAdding(false);
  };

  const removeDomain = async (id: string) => {
    await supabase.from("facebook_domains").delete().eq("id", id);
    toast.success("Domínio removido");
    loadDomains();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Domínios Customizados</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure domínios personalizados para seus checkouts</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Globe className="w-4 h-4" /> Seus Domínios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum domínio encontrado</p>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{d.domain}</span>
                    {d.verified ? (
                      <Badge variant="default" className="text-[10px] gap-1">
                        <CheckCircle className="w-3 h-3" /> Verificado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <AlertCircle className="w-3 h-3" /> Pendente
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeDomain(d.id)}>
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
              className="flex-1"
            />
            <Button onClick={addDomain} disabled={adding || !newDomain} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Adicionar Domínio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Domains;
