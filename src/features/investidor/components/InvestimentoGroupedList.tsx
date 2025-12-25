import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GroupByOption = "veiculo" | "investidor" | "none";

interface Investimento {
  id: string;
  id_pessoa: string;
  id_estoque: number;
  percentual_investido: number;
  valor_investido: number;
  data_criacao: string;
  data_finalizado: string | null;
  id_grupo_wtz: string | null;
  pessoa?: {
    nome: string;
  };
  veiculo?: {
    id: number;
    placa: string | null;
    modelo: string | null;
    motor: string | null;
    cambio: string | null;
    ano: string | null;
    cor: string | null;
    valor_aquisicao: number;
    valor: string | null;
    status: string | null;
    data_aquisicao: string | null;
    fabricante?: string | null;
  };
  custos_veiculo?: number;
  custos_proporcionais: number;
  rentabilidade_proporcional: number;
  lucro_percentual: number;
}

interface VeiculoGroup {
  id: number;
  placa: string;
  modelo: string;
  motor: string;
  ano: string;
  valorCompra: number;
  valorVenda: number;
  custosTotal: number;
  rentabilidadeGeral: number;
  lucroGeral: number;
  investimentos: Investimento[];
}

interface InvestidorGroup {
  id: string;
  nome: string;
  totalInvestido: number;
  rentabilidadeTotal: number;
  lucroTotal: number;
  investimentos: Investimento[];
}

interface InvestimentoGroupedListProps {
  investimentos: Investimento[];
  groupBy: GroupByOption;
  onEdit: (investimento: Investimento) => void;
  onDelete: (investimento: Investimento) => void;
  onDetail: (investimento: Investimento) => void;
  onFinalizar: (investimentoId: string) => void;
  onEstornar: (investimentoId: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export const InvestimentoGroupedList = ({
  investimentos,
  groupBy,
  onEdit,
  onDelete,
  onDetail,
  onFinalizar,
  onEstornar,
}: InvestimentoGroupedListProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const parseValorVenda = (valor: string | null | undefined): number => {
    if (!valor) return 0;
    return parseFloat(valor.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
  };

  // Group by Veículo
  const groupedByVeiculo = useMemo(() => {
    if (groupBy !== "veiculo") return [];

    const groups = new Map<number, VeiculoGroup>();

    investimentos.forEach((inv) => {
      if (!inv.veiculo) return;
      const veiculoId = inv.veiculo.id;

      if (!groups.has(veiculoId)) {
        const valorVenda = parseValorVenda(inv.veiculo.valor);
        const valorCompra = inv.veiculo.valor_aquisicao || 0;
        const custosTotal = inv.custos_veiculo || 0;
        const rentabilidadeGeral = valorVenda - valorCompra - custosTotal;
        const lucroGeral = valorCompra > 0 ? (rentabilidadeGeral / valorCompra) * 100 : 0;

        groups.set(veiculoId, {
          id: veiculoId,
          placa: inv.veiculo.placa || "S/P",
          modelo: `${inv.veiculo.fabricante || ""} ${inv.veiculo.modelo || ""}`.trim(),
          motor: inv.veiculo.motor || "",
          ano: inv.veiculo.ano || "",
          valorCompra,
          valorVenda,
          custosTotal,
          rentabilidadeGeral,
          lucroGeral,
          investimentos: [],
        });
      }

      groups.get(veiculoId)!.investimentos.push(inv);
    });

    return Array.from(groups.values());
  }, [investimentos, groupBy]);

  // Group by Investidor
  const groupedByInvestidor = useMemo(() => {
    if (groupBy !== "investidor") return [];

    const groups = new Map<string, InvestidorGroup>();

    investimentos.forEach((inv) => {
      const pessoaId = inv.id_pessoa;

      if (!groups.has(pessoaId)) {
        groups.set(pessoaId, {
          id: pessoaId,
          nome: inv.pessoa?.nome || "Sem nome",
          totalInvestido: 0,
          rentabilidadeTotal: 0,
          lucroTotal: 0,
          investimentos: [],
        });
      }

      const group = groups.get(pessoaId)!;
      group.investimentos.push(inv);
      group.totalInvestido += inv.valor_investido;
      group.rentabilidadeTotal += inv.rentabilidade_proporcional;
    });

    // Calculate lucro total for each group
    groups.forEach((group) => {
      group.lucroTotal = group.totalInvestido > 0
        ? (group.rentabilidadeTotal / group.totalInvestido) * 100
        : 0;
    });

    return Array.from(groups.values());
  }, [investimentos, groupBy]);

  const toggleGroup = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  const renderActionButtons = (inv: Investimento) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDetail(inv)}
        className="hover:text-accent h-8 w-8"
        title="Detalhamento do Investimento"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      {inv.data_finalizado ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEstornar(inv.id)}
          className="hover:text-amber-500 h-8 w-8"
          title="Estornar Finalização"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFinalizar(inv.id)}
          className="hover:text-green-500 h-8 w-8"
          title="Finalizar Investimento"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(inv)}
        className="hover:text-accent h-8 w-8"
        title="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(inv)}
        className="hover:text-destructive h-8 w-8"
        title="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  if (investimentos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum investimento encontrado
      </div>
    );
  }

  // Group by Veículo View
  if (groupBy === "veiculo") {
    return (
      <div className="space-y-2">
        {groupedByVeiculo.map((group) => {
          const isCollapsed = collapsedGroups.has(String(group.id));

          return (
            <Collapsible
              key={group.id}
              open={!isCollapsed}
              onOpenChange={() => toggleGroup(String(group.id))}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 px-4 py-3 rounded-lg cursor-pointer transition-colors border border-border/30">
                  <div className="flex items-center gap-3">
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-foreground">
                      {group.modelo} {group.motor} {group.ano} ({group.placa})
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Compra: <span className="text-foreground font-medium">{formatCurrency(group.valorCompra)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Venda: <span className="text-foreground font-medium">{formatCurrency(group.valorVenda)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Custos: <span className="text-foreground font-medium">{formatCurrency(group.custosTotal)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Rentabilidade: <span className={cn("font-medium", group.rentabilidadeGeral >= 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(group.rentabilidadeGeral)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Lucro: <span className={cn("font-medium", group.lucroGeral >= 0 ? "text-green-500" : "text-red-500")}>{formatPercent(group.lucroGeral)}</span>
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="rounded-lg border border-border/30 overflow-hidden mt-1 ml-8">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Investidor</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Investido R$</TableHead>
                        <TableHead className="text-center text-foreground font-semibold">Participação %</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Rentabilidade Individual R$</TableHead>
                        <TableHead className="text-center text-foreground font-semibold">Lucro Individual %</TableHead>
                        <TableHead className="w-[140px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.investimentos.map((inv) => (
                        <TableRow key={inv.id} className="border-border/30 hover:bg-muted/30">
                          <TableCell className="font-medium">{inv.pessoa?.nome || "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.valor_investido)}</TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-sm">
                              {inv.percentual_investido}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={inv.rentabilidade_proporcional >= 0 ? "text-green-500" : "text-red-500"}>
                              {formatCurrency(inv.rentabilidade_proporcional)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {inv.lucro_percentual >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              <span className={inv.lucro_percentual >= 0 ? "text-green-500" : "text-red-500"}>
                                {formatPercent(inv.lucro_percentual)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{renderActionButtons(inv)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  }

  // Group by Investidor View
  if (groupBy === "investidor") {
    return (
      <div className="space-y-2">
        {groupedByInvestidor.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <Collapsible
              key={group.id}
              open={!isCollapsed}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 px-4 py-3 rounded-lg cursor-pointer transition-colors border border-border/30">
                  <div className="flex items-center gap-3">
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-foreground">{group.nome}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Total Investido: <span className="text-foreground font-medium">{formatCurrency(group.totalInvestido)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Rentabilidade Total: <span className={cn("font-medium", group.rentabilidadeTotal >= 0 ? "text-green-500" : "text-red-500")}>{formatCurrency(group.rentabilidadeTotal)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Lucro Total: <span className={cn("font-medium", group.lucroTotal >= 0 ? "text-green-500" : "text-red-500")}>{formatPercent(group.lucroTotal)}</span>
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="rounded-lg border border-border/30 overflow-hidden mt-1 ml-8">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Veículo</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Compra</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Venda</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Custos</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Investido</TableHead>
                        <TableHead className="text-right text-foreground font-semibold">Rentabilidade</TableHead>
                        <TableHead className="text-center text-foreground font-semibold">Lucro %</TableHead>
                        <TableHead className="w-[140px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.investimentos.map((inv) => {
                        const valorVenda = parseValorVenda(inv.veiculo?.valor);
                        const veiculoLabel = inv.veiculo
                          ? `${inv.veiculo.modelo || ""} ${inv.veiculo.ano || ""} (${inv.veiculo.placa || "S/P"})`
                          : "-";

                        return (
                          <TableRow key={inv.id} className="border-border/30 hover:bg-muted/30">
                            <TableCell className="font-medium">{veiculoLabel}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inv.veiculo?.valor_aquisicao || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(valorVenda)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(inv.custos_proporcionais)}</TableCell>
                            <TableCell className="text-right">
                              <span>{formatCurrency(inv.valor_investido)}</span>
                              <span className="text-muted-foreground text-xs ml-1">({inv.percentual_investido}%)</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={inv.rentabilidade_proporcional >= 0 ? "text-green-500" : "text-red-500"}>
                                {formatCurrency(inv.rentabilidade_proporcional)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {inv.lucro_percentual >= 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className={inv.lucro_percentual >= 0 ? "text-green-500" : "text-red-500"}>
                                  {formatPercent(inv.lucro_percentual)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{renderActionButtons(inv)}</TableCell>
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
  }

  // No grouping - return null, the parent will handle this case
  return null;
};
