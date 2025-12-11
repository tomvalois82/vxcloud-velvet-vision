import { useState, useMemo } from "react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Repeat,
  ChevronDown,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maskCurrency } from "@/features/estoque/utils/masks";

interface Movimento {
  id: string;
  tipo_movimento: string;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  data_vencimento: string;
  data_pagamento: string | null;
  id_conta: string;
  id_categoria: string;
  id_empresa: string;
  id_forma_pagamento: string | null;
  observacoes: string | null;
  status: string;
  id_estoque: number | null;
  competencia: string | null;
  recorrencia_id: string | null;
  ordem_ocorrencia: number | null;
  total_ocorrencias: number | null;
  desconto: number | null;
  acrescimo: number | null;
  motivo_ajuste: string | null;
  conciliado: boolean;
  vx_fin_conta: { banco: string; descricao: string | null } | null;
  vx_fin_categoria: { categoria: string } | null;
}

interface DateGroup {
  dateKey: string;
  displayDate: Date;
  movimentos: Movimento[];
  total: number;
}

interface MovimentoGroupedListProps {
  movimentos: Movimento[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onEdit: (movimento: Movimento) => void;
  onDelete: (movimento: Movimento) => void;
  onBaixa: (movimento: Movimento) => void;
  onEstorno: (movimento: Movimento) => void;
  onConciliar: (movimento: Movimento) => void;
  tipoMovimento: "Pagar" | "Receber";
}

export const MovimentoGroupedList = ({
  movimentos,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
  onBaixa,
  onEstorno,
  onConciliar,
  tipoMovimento,
}: MovimentoGroupedListProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group movimentos by effective date (data_pagamento || data_vencimento)
  const groupedMovimentos = useMemo(() => {
    const groups = new Map<string, DateGroup>();

    movimentos.forEach((mov) => {
      const effectiveDate = mov.data_pagamento || mov.data_vencimento;
      const dateKey = effectiveDate;
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          dateKey,
          displayDate: new Date(effectiveDate + "T00:00:00"),
          movimentos: [],
          total: 0,
        });
      }
      
      const group = groups.get(dateKey)!;
      group.movimentos.push(mov);
      group.total += mov.valor_bruto;
    });

    // Sort groups by date
    return Array.from(groups.values()).sort((a, b) => 
      a.displayDate.getTime() - b.displayDate.getTime()
    );
  }, [movimentos]);

  const toggleGroup = (dateKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(dateKey)) {
      newCollapsed.delete(dateKey);
    } else {
      newCollapsed.add(dateKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  const isRowVencido = (status: string, dataVencimento: string) => {
    const vencimentoDate = new Date(dataVencimento + "T00:00:00");
    return isPast(vencimentoDate) && !isToday(vencimentoDate) && status === "Pendente";
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const isVencido = isRowVencido(status, dataVencimento);

    if (isVencido) {
      return <Badge variant="destructive">Vencido</Badge>;
    }

    switch (status) {
      case "Pago":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            {tipoMovimento === "Receber" ? "Recebido" : "Pago"}
          </Badge>
        );
      case "Cancelado":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
    }
  };

  const getContaDisplayName = (movimento: Movimento) => {
    if (!movimento.vx_fin_conta) return "-";
    return movimento.vx_fin_conta.descricao
      ? `${movimento.vx_fin_conta.banco} - ${movimento.vx_fin_conta.descricao}`
      : movimento.vx_fin_conta.banco;
  };

  const allSelected = movimentos.length > 0 && movimentos.every((mov) => selectedIds.has(mov.id));
  const someSelected = movimentos.some((mov) => selectedIds.has(mov.id));

  if (movimentos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum lançamento encontrado
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with select all */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Selecionar todos"
          className={someSelected && !allSelected ? "data-[state=checked]:bg-accent/50" : ""}
        />
        <span className="text-sm text-muted-foreground">Selecionar todos</span>
      </div>

      {groupedMovimentos.map((group) => {
        const isCollapsed = collapsedGroups.has(group.dateKey);
        const day = format(group.displayDate, "d", { locale: ptBR });
        const month = format(group.displayDate, "MMM", { locale: ptBR });
        const weekday = format(group.displayDate, "EEEE", { locale: ptBR });

        return (
          <Collapsible
            key={group.dateKey}
            open={!isCollapsed}
            onOpenChange={() => toggleGroup(group.dateKey)}
          >
            {/* Group Header */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 px-4 py-3 rounded-lg cursor-pointer transition-colors border border-border/30">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-2xl font-bold text-foreground">{day}</span>
                    <span className="text-xs text-muted-foreground uppercase">{month}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground capitalize">{weekday}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold text-accent">
                    {maskCurrency(group.total)}
                  </span>
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Group Content */}
            <CollapsibleContent>
              <div className="rounded-lg border border-border/30 overflow-hidden mt-1 ml-14">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="text-foreground font-semibold">Descrição</TableHead>
                      <TableHead className="text-foreground font-semibold">Valor</TableHead>
                      <TableHead className="text-foreground font-semibold">Vencimento</TableHead>
                      <TableHead className="text-foreground font-semibold">Pagamento</TableHead>
                      <TableHead className="text-foreground font-semibold">Competência</TableHead>
                      <TableHead className="text-foreground font-semibold">Conta</TableHead>
                      <TableHead className="text-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-foreground font-semibold w-[130px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.movimentos.map((mov) => {
                      const isPago = mov.status === "Pago";
                      return (
                        <TableRow
                          key={mov.id}
                          className={cn(
                            "border-border/30",
                            isRowVencido(mov.status, mov.data_vencimento) && "bg-destructive/10",
                            isPago && "opacity-60 bg-green-500/5"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(mov.id)}
                              onCheckedChange={(checked) => onSelectOne(mov.id, checked === true)}
                              aria-label={`Selecionar ${mov.descricao}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {isPago && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {mov.descricao}
                              {mov.recorrencia_id && (
                                <span title="Lançamento recorrente">
                                  <Repeat className="w-3 h-3 text-accent" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {maskCurrency(mov.valor_bruto)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {format(new Date(mov.data_vencimento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {mov.data_pagamento 
                              ? format(new Date(mov.data_pagamento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {mov.competencia || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getContaDisplayName(mov)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(mov.status, mov.data_vencimento)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isPago ? (
                                <>
                                  {/* Conciliar button - only for paid items */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-8 w-8",
                                      mov.conciliado 
                                        ? "text-[#0DCAF0] cursor-default" 
                                        : "hover:bg-[#0DCAF0]/20 text-[#0DCAF0]"
                                    )}
                                    onClick={() => !mov.conciliado && onConciliar(mov)}
                                    disabled={mov.conciliado}
                                    title={mov.conciliado ? "Conciliado" : "Conciliar"}
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-orange-500/20 text-orange-500"
                                    onClick={() => onEstorno(mov)}
                                    title="Estornar/Reabrir"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-green-500/20 text-green-500"
                                  onClick={() => onBaixa(mov)}
                                  title="Baixar"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8",
                                  isPago
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-accent/20"
                                )}
                                onClick={() => onEdit(mov)}
                                disabled={isPago}
                                title={isPago ? "Estorne para editar" : "Editar"}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8",
                                  isPago
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-destructive/20 text-destructive"
                                )}
                                onClick={() => onDelete(mov)}
                                disabled={isPago}
                                title={isPago ? "Estorne para excluir" : "Excluir"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};
