import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
}

interface ContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: Conta | null;
  onSuccess: () => void;
}

export function ContaDialog({ open, onOpenChange, conta, onSuccess }: ContaDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [banco, setBanco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [bancoError, setBancoError] = useState("");

  useEffect(() => {
    if (open) {
      if (conta) {
        setBanco(conta.banco);
        setDescricao(conta.descricao || "");
      } else {
        setBanco("");
        setDescricao("");
      }
      setBancoError("");
    }
  }, [open, conta]);

  const checkDuplicate = async (nome: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from("vx_fin_conta")
      .select("id")
      .ilike("banco", nome);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    return (data && data.length > 0) || false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBancoError("");

    if (!banco.trim()) {
      setBancoError("Nome da conta é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const isDuplicate = await checkDuplicate(banco.trim(), conta?.id);
      if (isDuplicate) {
        setBancoError("Já existe uma conta com este nome");
        setLoading(false);
        return;
      }

      const contaData = {
        banco: banco.trim(),
        descricao: descricao.trim() || null,
      };

      if (conta) {
        const { error } = await supabase
          .from("vx_fin_conta")
          .update(contaData)
          .eq("id", conta.id);

        if (error) throw error;

        toast({
          title: "Conta atualizada",
          description: "A conta foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("vx_fin_conta")
          .insert(contaData);

        if (error) throw error;

        toast({
          title: "Conta criada",
          description: "A conta foi criada com sucesso.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a conta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {conta ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="banco" className="text-foreground">
              Nome da Conta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="banco"
              value={banco}
              onChange={(e) => {
                setBanco(e.target.value);
                setBancoError("");
              }}
              placeholder="Ex: Caixa, Banco do Brasil, Nubank..."
              className={`bg-background/50 border-border/50 ${bancoError ? "border-destructive" : ""}`}
              disabled={loading}
            />
            {bancoError && (
              <p className="text-sm text-destructive">{bancoError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-foreground">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição opcional da conta..."
              className="bg-background/50 border-border/50 min-h-[80px]"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-accent hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
