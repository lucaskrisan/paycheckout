import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function UpdateTokenDialog({
  open,
  onOpenChange,
  pixelRowId,
  pixelLabel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pixelRowId: string;
  pixelLabel: string;
  onSaved: () => void;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (token.trim().length < 20) {
      toast.error("Token CAPI parece curto demais. Verifique antes de salvar.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc(
      "update_pixel_token" as any,
      { p_pixel_row_id: pixelRowId, p_new_token: token.trim() } as any
    );
    setSaving(false);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    if (!data) {
      toast.error("Pixel não encontrado");
      return;
    }
    toast.success("Token atualizado. A próxima verificação automática rodará em até 8h.");
    setToken("");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar token CAPI</DialogTitle>
          <DialogDescription>
            Pixel: <span className="font-mono">{pixelLabel}</span>
            <br />
            Cole o novo token de acesso do Facebook Business Manager. Ele será salvo
            criptografado e marcado como "não verificado" até o próximo health check.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="capi-token">Token CAPI</Label>
          <Input
            id="capi-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAAxxxxxx…"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !token}>
            {saving ? "Salvando…" : "Salvar token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
