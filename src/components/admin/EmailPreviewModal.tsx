import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, Eye, Pencil } from "lucide-react";

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  body: string;
  fullHtml: string;
  to: string;
  customerName: string;
  productName: string;
  onSend: (subject: string, body: string) => Promise<void>;
}

export function EmailPreviewModal({
  open,
  onOpenChange,
  subject: initialSubject,
  body: initialBody,
  fullHtml,
  to,
  customerName,
  productName,
  onSend,
}: EmailPreviewModalProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<string>("preview");

  // Sync when props change (new modal open)
  const [prevSubject, setPrevSubject] = useState(initialSubject);
  if (initialSubject !== prevSubject) {
    setSubject(initialSubject);
    setBody(initialBody);
    setPrevSubject(initialSubject);
    setTab("preview");
  }

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(subject, body);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  // Build a simple preview by replacing body in the fullHtml template
  const previewHtml = fullHtml.replace(initialBody, body);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            ✉️ Lembrete PIX — {customerName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Para: <strong>{to}</strong> · Produto: <strong>{productName}</strong>
          </p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 overflow-auto mt-3">
            <div className="space-y-3">
              <div className="px-3 py-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Assunto</p>
                <p className="text-sm font-medium text-foreground">{subject}</p>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[400px] bg-white"
                  title="Email preview"
                  sandbox=""
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="flex-1 min-h-0 overflow-auto mt-3">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Assunto do email</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do email..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Corpo do email <span className="text-muted-foreground font-normal">(HTML)</span>
                </Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                  placeholder="HTML do corpo do email..."
                />
                <p className="text-xs text-muted-foreground">
                  O bloco do produto, botão de pagamento e rodapé são adicionados automaticamente.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
