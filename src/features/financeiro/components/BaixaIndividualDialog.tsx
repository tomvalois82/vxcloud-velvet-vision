import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
}

interface FormaPagamento {
  id: string;
  descricao: string;
}

interface Movimento {
  id: string;
  descricao: string;
  valor_bruto: number;
  data_vencimento: string;
  id_conta: string;
  id_forma_pagamento: string | null;
}

interface BaixaIndividualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimento: Movimento | null;
  contas: Conta[];
  formasPagamento: FormaPagamento[];
  onConfirm: (data: {
    id: string;
    dataPagamento: string;
    contaId: string;
    formaPagamentoId: string | null;
    desconto: number;
    acrescimo: number;
    motivoAjuste: string | null;
  }) => Promise<void>;
}

// Máscara monetária
const maskCurrency = (value: string): string => {
  const numericValue = value.replace(/\D/g, "");
  const numberValue = parseInt(numericValue || "0", 10) / 100;
  return numberValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const parseCurrency = (value: string): number => {
  const numericValue = value.replace(/\D/g, "");
  return parseInt(numericValue || "0", 10) / 100;
};

export function BaixaIndividualDialog({
  open,
  onOpenChange,
  movimento,
  contas,
  formasPagamento,
  onConfirm,
}: BaixaIndividualDialogProps) {
  const [dataPagamento, setDataPagamento] = useState<Date | undefined>(new Date());
  const [contaId, setContaId] = useState<string>("");
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>("");
  const [descontoDisplay, setDescontoDisplay] = useState("R$ 0,00");
  const [acrescimoDisplay, setAcrescimoDisplay] = useState("R$ 0,00");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const desconto = useMemo(() => parseCurrency(descontoDisplay), [descontoDisplay]);
  const acrescimo = useMemo(() => parseCurrency(acrescimoDisplay), [acrescimoDisplay]);

  const valorOriginal = movimento?.valor_bruto || 0;
  const valorFinal = valorOriginal - desconto + acrescimo;

  const getContaDisplayName = (conta: Conta) => {
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  useEffect(() => {
    if (movimento && open) {
      setDataPagamento(new Date());
      setContaId(movimento.id_conta);
      setFormaPagamentoId(movimento.id_forma_pagamento || "");
      setDescontoDisplay("R$ 0,00");
      setAcrescimoDisplay("R$ 0,00");
      setMotivoAjuste("");
      setErrors({});
    }
  }, [movimento, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!dataPagamento) {
      newErrors.dataPagamento = "Data de pagamento é obrigatória";
    }

    if (!contaId) {
      newErrors.contaId = "Conta é obrigatória";
    }

    if ((desconto > 0 || acrescimo > 0) && !motivoAjuste.trim()) {
      newErrors.motivoAjuste = "Motivo é obrigatório quando há desconto ou acréscimo";
    }

    if (valorFinal < 0) {
      newErrors.valorFinal = "O valor final não pode ser negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!movimento || !validate()) return;

    setIsLoading(true);
    try {
      await onConfirm({
        id: movimento.id,
        dataPagamento: format(dataPagamento!, "yyyy-MM-dd"),
        contaId,
        formaPagamentoId: formaPagamentoId || null,
        desconto,
        acrescimo,
        motivoAjuste: (desconto > 0 || acrescimo > 0) ? motivoAjuste.trim() : null,
      });
      onOpenChange(false);
      resetForm();
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDataPagamento(new Date());
    setContaId("");
    setFormaPagamentoId("");
    setDescontoDisplay("R$ 0,00");
    setAcrescimoDisplay("R$ 0,00");
    setMotivoAjuste("");
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Baixar Título
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do título */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{movimento?.descricao}</p>
            <p className="text-sm text-muted-foreground">
              Valor original: <span className="font-semibold text-foreground">
                {valorOriginal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Vencimento: {movimento?.data_vencimento && format(new Date(movimento.data_vencimento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Data de Pagamento */}
          <div className="space-y-2">
            <Label className="text-foreground">Data de Pagamento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataPagamento && "text-muted-foreground",
                    errors.dataPagamento && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataPagamento ? (
                    format(dataPagamento, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataPagamento}
                  onSelect={setDataPagamento}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.dataPagamento && (
              <p className="text-xs text-destructive">{errors.dataPagamento}</p>
            )}
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label className="text-foreground">Conta para Baixa *</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className={cn("bg-background/50", errors.contaId && "border-destructive")}>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {getContaDisplayName(conta)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contaId && (
              <p className="text-xs text-destructive">{errors.contaId}</p>
            )}
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <Label className="text-foreground">Forma de Pagamento</Label>
            <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((fp) => (
                  <SelectItem key={fp.id} value={fp.id}>
                    {fp.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desconto e Acréscimo lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Desconto</Label>
              <Input
                value={descontoDisplay}
                onChange={(e) => setDescontoDisplay(maskCurrency(e.target.value))}
                className="bg-background/50"
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Acréscimo</Label>
              <Input
                value={acrescimoDisplay}
                onChange={(e) => setAcrescimoDisplay(maskCurrency(e.target.value))}
                className="bg-background/50"
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {/* Motivo (obrigatório se desconto ou acréscimo > 0) */}
          {(desconto > 0 || acrescimo > 0) && (
            <div className="space-y-2">
              <Label className="text-foreground">Motivo do Ajuste *</Label>
              <Textarea
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                className={cn("bg-background/50 resize-none", errors.motivoAjuste && "border-destructive")}
                placeholder="Informe o motivo do desconto ou acréscimo"
                rows={2}
              />
              {errors.motivoAjuste && (
                <p className="text-xs text-destructive">{errors.motivoAjuste}</p>
              )}
            </div>
          )}

          {/* Valor Final */}
          <div className={cn(
            "bg-muted/50 rounded-lg p-3 border",
            valorFinal < 0 ? "border-destructive" : "border-primary/30"
          )}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Final da Baixa:</span>
              <span className={cn(
                "text-lg font-bold",
                valorFinal < 0 ? "text-destructive" : "text-primary"
              )}>
                {valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            {desconto > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                - Desconto: {desconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
            {acrescimo > 0 && (
              <p className="text-xs text-muted-foreground">
                + Acréscimo: {acrescimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
            {errors.valorFinal && (
              <p className="text-xs text-destructive mt-1">{errors.valorFinal}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || valorFinal < 0}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Baixa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
