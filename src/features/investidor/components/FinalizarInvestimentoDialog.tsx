import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface FinalizarInvestimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investimentoId: string | null;
  onSuccess: () => void;
}

export function FinalizarInvestimentoDialog({
  open,
  onOpenChange,
  investimentoId,
  onSuccess,
}: FinalizarInvestimentoDialogProps) {
  const [dataFinalizacao, setDataFinalizacao] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const handleFinalizar = async () => {
    if (!investimentoId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("vx_investimento")
        .update({ data_finalizado: dataFinalizacao })
        .eq("id", investimentoId);

      if (error) throw error;

      toast.success("Investimento finalizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao finalizar investimento:", error);
      toast.error("Erro ao finalizar investimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Finalizar Investimento</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="dataFinalizacao">Data de Finalização</Label>
          <Input
            id="dataFinalizacao"
            type="date"
            value={dataFinalizacao}
            onChange={(e) => setDataFinalizacao(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleFinalizar} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
