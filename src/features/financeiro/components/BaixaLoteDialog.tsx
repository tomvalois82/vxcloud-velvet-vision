import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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

interface MovimentoSelecionado {
  id: string;
  descricao: string;
  valor_bruto: number;
  data_vencimento: string;
}

interface BaixaLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimentosSelecionados: MovimentoSelecionado[];
  contas: Conta[];
  formasPagamento: FormaPagamento[];
  onConfirm: (dataPagamento: string, contaId: string, formaPagamentoId: string | null) => Promise<void>;
}

export function BaixaLoteDialog({
  open,
  onOpenChange,
  movimentosSelecionados,
  contas,
  formasPagamento,
  onConfirm,
}: BaixaLoteDialogProps) {
  const [dataPagamento, setDataPagamento] = useState<Date | undefined>(new Date());
  const [usarDataVencimento, setUsarDataVencimento] = useState(false);
  const [contaId, setContaId] = useState<string>("");
  const [formaPagamentoId, setFormaPagamentoId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const getContaDisplayName = (conta: Conta) => {
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  const handleConfirm = async () => {
    if (!contaId) return;

    setIsLoading(true);
    try {
      const dataFormatada = usarDataVencimento 
        ? "" // será tratado individualmente no handler
        : format(dataPagamento!, "yyyy-MM-dd");
      
      await onConfirm(dataFormatada, contaId, formaPagamentoId || null);
      onOpenChange(false);
      resetForm();
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDataPagamento(new Date());
    setUsarDataVencimento(false);
    setContaId("");
    setFormaPagamentoId("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const totalValor = movimentosSelecionados.reduce((acc, mov) => acc + mov.valor_bruto, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Baixar {movimentosSelecionados.length} título{movimentosSelecionados.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo dos títulos */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-sm text-muted-foreground">
              Total a baixar: <span className="font-semibold text-foreground">
                {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {movimentosSelecionados.length} título(s) selecionado(s)
            </p>
          </div>

          {/* Data de Pagamento */}
          <div className="space-y-2">
            <Label className="text-foreground">Data de Pagamento</Label>
            
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                id="usarDataVencimento"
                checked={usarDataVencimento}
                onCheckedChange={(checked) => setUsarDataVencimento(checked === true)}
              />
              <label
                htmlFor="usarDataVencimento"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Usar data de vencimento como data de pagamento
              </label>
            </div>

            {!usarDataVencimento && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataPagamento && "text-muted-foreground"
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
            )}
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label className="text-foreground">Conta para Baixa *</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="bg-background/50">
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
            disabled={isLoading || !contaId || (!usarDataVencimento && !dataPagamento)}
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
