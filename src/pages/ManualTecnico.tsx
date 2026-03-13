import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ManualTecnico = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadManual = async () => {
      try {
        const response = await fetch("/MANUAL_TECNICO.md");
        if (!response.ok) throw new Error("Não foi possível carregar o manual.");
        const text = await response.text();
        setContent(text);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar manual.");
      } finally {
        setLoading(false);
      }
    };

    loadManual();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto h-14 px-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>

          <a href="/MANUAL_TECNICO.md" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              Abrir arquivo
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">Manual Técnico</h1>

        {loading && (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando manual...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && (
          <article className="rounded-xl border border-border bg-card p-4 md:p-6 overflow-x-auto">
            <pre className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">{content}</pre>
          </article>
        )}
      </main>
    </div>
  );
};

export default ManualTecnico;
