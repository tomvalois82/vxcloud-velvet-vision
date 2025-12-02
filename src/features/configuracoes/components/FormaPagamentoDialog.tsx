import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormaPagamento {
  id: string;
  descricao: string;
  ativa: boolean;
  id_conta_padrao: string | null;
}

interface FormaPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formaPagamento?: FormaPagamento | null;
  onSuccess: () => void;
}

export const FormaPagamentoDialog = ({
  open,
  onOpenChange,
  formaPagamento,
  onSuccess,
}: FormaPagamentoDialogProps) => {
  const [descricao, setDescricao] = useState("");
  const [ativa, setAtiva] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!formaPagamento;

  useEffect(() => {
    if (open) {
      if (formaPagamento) {
        setDescricao(formaPagamento.descricao);
        setAtiva(formaPagamento.ativa);
      } else {
        setDescricao("");
        setAtiva(true);
      }
      setError("");
    }
  }, [open, formaPagamento]);

  const checkDuplicate = async (nome: string, excludeId?: string) => {
    let query = supabase
      .from("vx_forma_pagamento")
      .select("id")
      .ilike("descricao", nome);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedDescricao = descricao.trim();

    if (!trimmedDescricao) {
      setError("O nome é obrigatório");
      return;
    }

    setSaving(true);

    try {
      // Check for duplicates
      const isDuplicate = await checkDuplicate(
        trimmedDescricao,
        formaPagamento?.id
      );

      if (isDuplicate) {
        setError("Já existe uma forma de pagamento com este nome");
        setSaving(false);
        return;
      }

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("vx_forma_pagamento")
          .update({
            descricao: trimmedDescricao,
            ativa,
          })
          .eq("id", formaPagamento.id);

        if (updateError) throw updateError;
        toast.success("Forma de pagamento atualizada com sucesso");
      } else {
        const { error: insertError } = await supabase
          .from("vx_forma_pagamento")
          .insert({
            descricao: trimmedDescricao,
            ativa,
          });

        if (insertError) throw insertError;
        toast.success("Forma de pagamento criada com sucesso");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar forma de pagamento:", err);
      toast.error("Erro ao salvar forma de pagamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-foreground">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setError("");
              }}
              placeholder="Ex: Cartão de Crédito, PIX, Dinheiro..."
              className="bg-background/50 border-border/50 text-foreground"
              disabled={saving}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativa" className="text-foreground">
              Ativa
            </Label>
            <Switch
              id="ativa"
              checked={ativa}
              onCheckedChange={setAtiva}
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="border-border/50 hover:bg-muted/50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-accent hover:bg-accent/80 text-accent-foreground"
            >
              {saving ? (
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
};
