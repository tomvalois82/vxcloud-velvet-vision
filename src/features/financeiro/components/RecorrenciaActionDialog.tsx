import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface RecorrenciaActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: "edit" | "delete";
  onConfirm: (scope: "single" | "future") => void;
  loading?: boolean;
}

export function RecorrenciaActionDialog({
  open,
  onOpenChange,
  actionType,
  onConfirm,
  loading = false,
}: RecorrenciaActionDialogProps) {
  const [scope, setScope] = useState<"single" | "future">("single");

  const handleConfirm = () => {
    onConfirm(scope);
  };

  const title = actionType === "edit" 
    ? "Editar lançamento recorrente" 
    : "Excluir lançamento recorrente";

  const description = actionType === "edit"
    ? "Este lançamento faz parte de uma recorrência. Deseja alterar apenas esta ocorrência ou todas as futuras?"
    : "Este lançamento faz parte de uma recorrência. Deseja excluir apenas esta ocorrência ou todas as futuras?";

  const confirmText = actionType === "edit" ? "Editar" : "Excluir";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-strong border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={scope}
          onValueChange={(value) => setScope(value as "single" | "future")}
          className="space-y-3 my-4"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="cursor-pointer">
              Apenas esta ocorrência
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="future" id="future" />
            <Label htmlFor="future" className="cursor-pointer">
              Esta e todas as futuras
            </Label>
          </div>
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={actionType === "delete" ? "bg-destructive hover:bg-destructive/90" : "bg-accent hover:bg-accent/90"}
          >
            {loading ? "Processando..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
