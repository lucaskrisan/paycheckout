import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Sparkles, Bot, DollarSign, MessageCircle, Settings2, Image, Brain, Zap, ShieldCheck, Save, RefreshCw } from "lucide-react";
import mariaAvatar from "@/assets/maria-avatar.png";

interface MariaSettings {
  id: string;
  avatar_url: string | null;
  persona_name: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  model: string;
  cross_sell_enabled: boolean;
  auto_reply_on_approve: boolean;
  active: boolean;
  total_replies: number;
  total_tokens_used: number;
  updated_at: string;
}

interface ReplyStats {
  total: number;
  today: number;
  thisWeek: number;
  avgRating: number;
}

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Rápido e econômico", cost: "~$0.0001/req" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", desc: "Mais barato", cost: "~$0.00005/req" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", desc: "Nova geração, equilibrado", cost: "~$0.0002/req" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Mais inteligente, mais caro", cost: "~$0.001/req" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "Forte raciocínio", cost: "~$0.0005/req" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano", desc: "Velocidade e economia", cost: "~$0.0002/req" },
];

const DEFAULT_PROMPT = `Você é a MARIA 🌸 — a assistente inteligente e acolhedora do curso. Você é como uma mentora, amiga e, quando necessário, uma psicóloga/psicanalista empática.

PERSONALIDADE DA MARIA:
- Calorosa, inteligente e genuína. Nunca robótica ou genérica.
- Usa emojis com moderação (1-2 por resposta, nunca exagera).
- Fala de forma natural, como uma amiga querida que entende profundamente o assunto.
- Sempre chama a aluna pelo nome.

REGRAS ABSOLUTAS:
1. Fale EXCLUSIVAMENTE sobre o curso, a aula e o conteúdo relacionado. JAMAIS fale sobre assuntos que não tenham relação com o produto.
2. Se a aluna compartilhar dificuldades emocionais ou pessoais, acolha com empatia genuína — valide os sentimentos, ofereça palavras de encorajamento com sabedoria psicológica, e reconecte ao conteúdo como ferramenta de transformação.
3. Avaliação positiva (4-5⭐): celebre o progresso, destaque pontos específicos do comentário, encoraje a continuar aplicando.
4. Avaliação negativa (1-3⭐): acolha a frustração sem defensividade, reconheça o ponto, sugira como aproveitar melhor o conteúdo e diga que a equipe está atenta.
5. Responda em português BR, de forma concisa (máximo 3 parágrafos curtos).
6. NUNCA invente informações sobre o curso.
7. Se houver produtos complementares disponíveis E o contexto permitir naturalmente, mencione com sutileza — NUNCA force vendas.
8. Assine como "Maria 🌸"`;

const MariaAI = () => {
  const [settings, setSettings] = useState<MariaSettings | null>(null);
  const [stats, setStats] = useState<ReplyStats>({ total: 0, today: 0, thisWeek: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load settings
    const { data: settingsData } = await (supabase as any)
      .from("maria_ai_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsData) setSettings(settingsData);

    // Load reply stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    const { data: replies } = await supabase
      .from("review_replies")
      .select("id, created_at, is_ai_reply")
      .eq("is_ai_reply", true);

    const allReplies = replies || [];
    const todayReplies = allReplies.filter(r => r.created_at >= todayStart);
    const weekReplies = allReplies.filter(r => r.created_at >= weekStart);

    // Get avg rating of reviews that got AI replies
    const { data: reviewsWithAI } = await supabase
      .from("lesson_reviews")
      .select("rating, review_replies!inner(is_ai_reply)")
      .eq("review_replies.is_ai_reply", true);

    const avgRating = reviewsWithAI && reviewsWithAI.length > 0
      ? reviewsWithAI.reduce((sum, r) => sum + r.rating, 0) / reviewsWithAI.length
      : 0;

    setStats({
      total: allReplies.length,
      today: todayReplies.length,
      thisWeek: weekReplies.length,
      avgRating: Math.round(avgRating * 10) / 10,
    });

    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from("maria_ai_settings")
      .update({
        persona_name: settings.persona_name,
        system_prompt: settings.system_prompt,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        model: settings.model,
        cross_sell_enabled: settings.cross_sell_enabled,
        auto_reply_on_approve: settings.auto_reply_on_approve,
        active: settings.active,
        avatar_url: settings.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    } else {
      toast.success("Configurações da Maria salvas!");
    }
  };

  const estimatedCost = () => {
    const costPerReply = settings?.model.includes("lite") ? 0.00005
      : settings?.model.includes("flash") ? 0.0002
      : settings?.model.includes("pro") ? 0.001
      : settings?.model.includes("nano") ? 0.0002
      : settings?.model.includes("mini") ? 0.0005
      : 0.0002;
    return {
      perReply: costPerReply,
      monthly: (stats.thisWeek / 7 * 30 * costPerReply),
      total: stats.total * costPerReply,
    };
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!settings) {
    return <p className="text-muted-foreground text-center py-12">Configurações da Maria não encontradas.</p>;
  }

  const costs = estimatedCost();
  const selectedModel = MODELS.find(m => m.value === settings.model);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={settings.avatar_url || mariaAvatar} alt="Maria" className="w-16 h-16 rounded-full border-2 border-purple-400 shadow-lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Maria IA — Painel de Controle</h1>
            <Badge variant={settings.active ? "default" : "secondary"} className={settings.active ? "bg-green-600" : ""}>
              {settings.active ? "Ativa" : "Desativada"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Gerencie a personalidade, prompts, modelo e custos da assistente IA</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Respostas Totais</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-2xl font-bold">{stats.today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Nota Média</span>
            </div>
            <p className="text-2xl font-bold">{stats.avgRating > 0 ? `${stats.avgRating}⭐` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Custo Est. Total</span>
            </div>
            <p className="text-2xl font-bold">${costs.total.toFixed(4)}</p>
            <p className="text-[10px] text-muted-foreground">~${costs.monthly.toFixed(4)}/mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Identity + Behavior */}
        <div className="space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-purple-500" /> Identidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da Persona</Label>
                <Input
                  value={settings.persona_name}
                  onChange={(e) => setSettings({ ...settings, persona_name: e.target.value })}
                  placeholder="Maria 🌸"
                />
              </div>
              <div>
                <Label>URL do Avatar (deixe vazio para padrão)</Label>
                <Input
                  value={settings.avatar_url || ""}
                  onChange={(e) => setSettings({ ...settings, avatar_url: e.target.value || null })}
                  placeholder="https://..."
                />
                <div className="flex items-center gap-3 mt-2">
                  <img src={settings.avatar_url || mariaAvatar} alt="Preview" className="w-10 h-10 rounded-full border" />
                  <span className="text-xs text-muted-foreground">Preview do avatar</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Behavior */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-purple-500" /> Comportamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maria Ativa</Label>
                  <p className="text-xs text-muted-foreground">Liga/desliga a IA globalmente</p>
                </div>
                <Switch checked={settings.active} onCheckedChange={(v) => setSettings({ ...settings, active: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-responder ao Aprovar</Label>
                  <p className="text-xs text-muted-foreground">Maria responde automaticamente quando uma avaliação é aprovada</p>
                </div>
                <Switch checked={settings.auto_reply_on_approve} onCheckedChange={(v) => setSettings({ ...settings, auto_reply_on_approve: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cross-sell de Produtos</Label>
                  <p className="text-xs text-muted-foreground">Maria pode mencionar outros produtos do produtor</p>
                </div>
                <Switch checked={settings.cross_sell_enabled} onCheckedChange={(v) => setSettings({ ...settings, cross_sell_enabled: v })} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Model + Prompt */}
        <div className="space-y-6">
          {/* Model */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" /> Modelo de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Modelo</Label>
                <Select value={settings.model} onValueChange={(v) => setSettings({ ...settings, model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center gap-2">
                          <span>{m.label}</span>
                          <Badge variant="outline" className="text-[9px]">{m.cost}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModel && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedModel.desc} — custo estimado: {selectedModel.cost} por resposta</p>
                )}
              </div>

              <div>
                <Label>Temperatura: {settings.temperature}</Label>
                <p className="text-xs text-muted-foreground mb-2">Baixa = mais precisa, alta = mais criativa</p>
                <Slider
                  value={[settings.temperature]}
                  onValueChange={([v]) => setSettings({ ...settings, temperature: Math.round(v * 10) / 10 })}
                  min={0} max={1.5} step={0.1}
                />
              </div>

              <div>
                <Label>Max Tokens: {settings.max_tokens}</Label>
                <p className="text-xs text-muted-foreground mb-2">Tamanho máximo da resposta</p>
                <Slider
                  value={[settings.max_tokens]}
                  onValueChange={([v]) => setSettings({ ...settings, max_tokens: v })}
                  min={100} max={2000} step={50}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost briefing */}
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-500" /> Briefing de Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo por resposta:</span>
                <span className="font-medium">${costs.perReply.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Respostas esta semana:</span>
                <span className="font-medium">{stats.thisWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimativa mensal:</span>
                <span className="font-medium">${costs.monthly.toFixed(4)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Custo total acumulado:</span>
                <span className="text-purple-600">${costs.total.toFixed(4)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                💡 Custos baseados em estimativas do modelo selecionado. Para detalhes reais, acesse Settings → Cloud & AI balance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Prompt - full width */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-500" /> Prompt do Sistema (Personalidade da Maria)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSettings({ ...settings, system_prompt: DEFAULT_PROMPT })}>
              <RefreshCw className="w-3 h-3 mr-1" /> Resetar Padrão
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.system_prompt}
            onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
            rows={16}
            className="font-mono text-xs"
            placeholder="Prompt do sistema..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ O contexto do curso, aula e dados do aluno são adicionados automaticamente. Aqui você define apenas a personalidade e regras da Maria.
          </p>
        </CardContent>
      </Card>

      {/* Security badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        <span>Configurações protegidas — acesso exclusivo Super Admin. Prompts executados no backend via Edge Function.</span>
      </div>
    </div>
  );
};

export default MariaAI;
