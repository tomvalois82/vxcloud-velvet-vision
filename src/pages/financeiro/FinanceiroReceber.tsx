import { useState, useEffect, useMemo } from "react";
import { format, isPast, isToday, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  ArrowUpCircle,
  Search,
  Pencil,
  Trash2,
  Loader2,
  CalendarIcon,
  X,
  Car,
  Repeat,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";
import { RecorrenciaActionDialog } from "@/features/financeiro/components/RecorrenciaActionDialog";
import { BaixaLoteDialog } from "@/features/financeiro/components/BaixaLoteDialog";
import { BaixaIndividualDialog } from "@/features/financeiro/components/BaixaIndividualDialog";
import { atualizarSaldoConta, calcularValorFinal } from "@/features/financeiro/utils/saldoUtils";

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
  vx_fin_conta: { banco: string; descricao: string | null } | null;
  vx_fin_categoria: { categoria: string } | null;
}

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
}

interface FormaPagamento {
  id: string;
  descricao: string;
}

// Generate competencia options from 01/2019 to current month/year
const gerarOpcoesCompetencia = (): { value: string; label: string }[] => {
  const opcoes: { value: string; label: string }[] = [];
  const dataInicio = new Date(2019, 0, 1);
  const dataAtual = new Date();
  
  let dataIteracao = new Date(dataInicio);
  while (dataIteracao <= dataAtual) {
    const mes = String(dataIteracao.getMonth() + 1).padStart(2, '0');
    const ano = dataIteracao.getFullYear();
    const value = `${mes}/${ano}`;
    opcoes.push({ value, label: value });
    dataIteracao = addMonths(dataIteracao, 1);
  }
  
  return opcoes.reverse();
};

const opcoesCompetencia = gerarOpcoesCompetencia();

interface Veiculo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  ano: string | null;
  status: string | null;
}

const FinanceiroReceber = () => {
  const { toast } = useToast();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [veiculoFilter, setVeiculoFilter] = useState<string>("todos");
  const [competenciaFilter, setCompetenciaFilter] = useState<string>("todos");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movimentoToDelete, setMovimentoToDelete] = useState<Movimento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Recurrence action states
  const [recorrenciaEditDialogOpen, setRecorrenciaEditDialogOpen] = useState(false);
  const [recorrenciaDeleteDialogOpen, setRecorrenciaDeleteDialogOpen] = useState(false);
  const [pendingEditMovimento, setPendingEditMovimento] = useState<Movimento | null>(null);
  const [editScope, setEditScope] = useState<"single" | "future">("single");

  // Baixa states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [baixaLoteDialogOpen, setBaixaLoteDialogOpen] = useState(false);
  const [baixaIndividualDialogOpen, setBaixaIndividualDialogOpen] = useState(false);
  const [movimentoBaixa, setMovimentoBaixa] = useState<Movimento | null>(null);

  // Estorno states
  const [estornoDialogOpen, setEstornoDialogOpen] = useState(false);
  const [movimentoEstorno, setMovimentoEstorno] = useState<Movimento | null>(null);
  const [estornando, setEstornando] = useState(false);

  const fetchMovimentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_movimento")
        .select(`
          *,
          vx_fin_conta!id_conta (banco, descricao),
          vx_fin_categoria (categoria)
        `)
        .eq("tipo_movimento", "Receber")
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      setMovimentos((data as unknown as Movimento[]) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lançamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase
        .from("vx_fin_conta")
        .select("id, banco, descricao")
        .order("banco");

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  const fetchFormasPagamento = async () => {
    try {
      const { data, error } = await supabase
        .from("vx_forma_pagamento")
        .select("id, descricao")
        .eq("ativa", true)
        .order("descricao");

      if (error) throw error;
      setFormasPagamento(data || []);
    } catch (error) {
      console.error("Erro ao carregar formas de pagamento:", error);
    }
  };

  const fetchVeiculos = async () => {
    try {
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

      const [veiculosEstoqueRes, vendasRecentesRes] = await Promise.all([
        supabase
          .from("estoque")
          .select("id, fabricante, modelo, placa, ano, status")
          .neq("status", "Vendido")
          .order("fabricante")
          .order("modelo"),
        supabase
          .from("vx_vendas")
          .select(`
            id_veiculo_vendido,
            estoque!id_veiculo_vendido (id, fabricante, modelo, placa, ano, status)
          `)
          .eq("fechada", true)
          .gte("data_venda", tresMesesAtras.toISOString()),
      ]);

      const veiculosEmEstoque = (veiculosEstoqueRes.data || []) as Veiculo[];
      const veiculosVendidosRecentes = (vendasRecentesRes.data || [])
        .map((v: any) => v.estoque)
        .filter((v: any): v is Veiculo => v !== null);

      const todosVeiculosMap = new Map<number, Veiculo>();
      veiculosEmEstoque.forEach((v) => todosVeiculosMap.set(v.id, v));
      veiculosVendidosRecentes.forEach((v) => {
        if (!todosVeiculosMap.has(v.id)) {
          todosVeiculosMap.set(v.id, v);
        }
      });

      const todosVeiculos = Array.from(todosVeiculosMap.values())
        .sort((a, b) => (a.fabricante || '').localeCompare(b.fabricante || ''));

      setVeiculos(todosVeiculos);
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    }
  };

  useEffect(() => {
    fetchMovimentos();
    fetchVeiculos();
    fetchContas();
    fetchFormasPagamento();
  }, []);

  // Clear selection when filtered list changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, veiculoFilter, competenciaFilter, dateFilter]);

  const handleEdit = (movimento: Movimento) => {
    if (movimento.status === "Pago") return;
    if (movimento.recorrencia_id) {
      setPendingEditMovimento(movimento);
      setRecorrenciaEditDialogOpen(true);
    } else {
      setEditScope("single");
      setSelectedMovimento(movimento);
      setDialogOpen(true);
    }
  };

  const handleRecorrenciaEditConfirm = (scope: "single" | "future") => {
    setRecorrenciaEditDialogOpen(false);
    if (pendingEditMovimento) {
      setEditScope(scope);
      setSelectedMovimento(pendingEditMovimento);
      setDialogOpen(true);
      setPendingEditMovimento(null);
    }
  };

  const handleNew = () => {
    setSelectedMovimento(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (movimento: Movimento) => {
    if (movimento.status === "Pago") return;
    setMovimentoToDelete(movimento);
    if (movimento.recorrencia_id) {
      setRecorrenciaDeleteDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!movimentoToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vx_fin_movimento")
        .delete()
        .eq("id", movimentoToDelete.id);

      if (error) throw error;

      toast({
        title: "Lançamento excluído",
        description: "O lançamento foi excluído com sucesso.",
      });
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setMovimentoToDelete(null);
    }
  };

  const handleRecorrenciaDeleteConfirm = async (scope: "single" | "future") => {
    if (!movimentoToDelete) return;

    setDeleting(true);
    try {
      if (scope === "single") {
        const { error } = await supabase
          .from("vx_fin_movimento")
          .delete()
          .eq("id", movimentoToDelete.id);

        if (error) throw error;

        toast({
          title: "Lançamento excluído",
          description: "A ocorrência foi excluída com sucesso.",
        });
      } else {
        // Delete this and all future occurrences
        const { error } = await supabase
          .from("vx_fin_movimento")
          .delete()
          .eq("recorrencia_id", movimentoToDelete.recorrencia_id)
          .gte("ordem_ocorrencia", movimentoToDelete.ordem_ocorrencia || 0);

        if (error) throw error;

        toast({
          title: "Lançamentos excluídos",
          description: "Esta e todas as ocorrências futuras foram excluídas.",
        });
      }
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setRecorrenciaDeleteDialogOpen(false);
      setMovimentoToDelete(null);
    }
  };

  // Baixa handlers
  const handleBaixaIndividual = (movimento: Movimento) => {
    if (movimento.status === "Pago") return;
    setMovimentoBaixa(movimento);
    setBaixaIndividualDialogOpen(true);
  };

  const handleBaixaIndividualConfirm = async (data: {
    id: string;
    dataPagamento: string;
    contaId: string;
    formaPagamentoId: string | null;
    desconto: number;
    acrescimo: number;
    motivoAjuste: string | null;
  }) => {
    try {
      // Buscar o movimento para obter o valor original
      const movimento = movimentos.find(m => m.id === data.id);
      if (!movimento) throw new Error("Movimento não encontrado");

      // Atualizar o movimento
      const { error } = await supabase
        .from("vx_fin_movimento")
        .update({
          status: "Pago",
          data_pagamento: data.dataPagamento,
          id_conta: data.contaId,
          id_forma_pagamento: data.formaPagamentoId,
          desconto: data.desconto,
          acrescimo: data.acrescimo,
          motivo_ajuste: data.motivoAjuste,
        })
        .eq("id", data.id);

      if (error) throw error;

      // Calcular valor final e atualizar saldo da conta
      const valorFinal = calcularValorFinal(movimento.valor_bruto, data.desconto, data.acrescimo);
      await atualizarSaldoConta(data.contaId, valorFinal, "Receber");

      toast({
        title: "Título baixado",
        description: "O título foi baixado e o saldo da conta atualizado com sucesso.",
      });
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao baixar título",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBaixaLoteConfirm = async (dataPagamento: string, contaId: string, formaPagamentoId: string | null) => {
    const selectedMovimentos = filteredMovimentos.filter(
      (mov) => selectedIds.has(mov.id) && mov.status !== "Pago"
    );

    if (selectedMovimentos.length === 0) return;

    try {
      let totalAtualizado = 0;
      
      for (const mov of selectedMovimentos) {
        const dataFinal = dataPagamento || mov.data_vencimento;
        
        const { error } = await supabase
          .from("vx_fin_movimento")
          .update({
            status: "Pago",
            data_pagamento: dataFinal,
            id_conta: contaId,
            id_forma_pagamento: formaPagamentoId,
          })
          .eq("id", mov.id);

        if (error) throw error;
        
        // Acumular valor para atualização do saldo
        totalAtualizado += mov.valor_bruto;
      }

      // Atualizar saldo da conta uma única vez com o total
      await atualizarSaldoConta(contaId, totalAtualizado, "Receber");

      toast({
        title: "Títulos baixados",
        description: `${selectedMovimentos.length} título(s) baixado(s) e saldo atualizado com sucesso.`,
      });
      setSelectedIds(new Set());
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao baixar títulos",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = filteredMovimentos
        .filter((mov) => mov.status !== "Pago")
        .map((mov) => mov.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Estorno handlers
  const handleEstornoClick = (movimento: Movimento) => {
    if (movimento.status !== "Pago") return;
    setMovimentoEstorno(movimento);
    setEstornoDialogOpen(true);
  };

  const handleEstornoConfirm = async () => {
    if (!movimentoEstorno) return;

    setEstornando(true);
    try {
      // Calcular valor que foi creditado/debitado originalmente
      const valorFinal = calcularValorFinal(
        movimentoEstorno.valor_bruto,
        movimentoEstorno.desconto || 0,
        movimentoEstorno.acrescimo || 0
      );

      // Reverter o saldo da conta (estorno)
      await atualizarSaldoConta(movimentoEstorno.id_conta, valorFinal, "Receber", true);

      const { error } = await supabase
        .from("vx_fin_movimento")
        .update({
          status: "Pendente",
          data_pagamento: null,
          desconto: 0,
          acrescimo: 0,
          motivo_ajuste: null,
        })
        .eq("id", movimentoEstorno.id);

      if (error) throw error;

      toast({
        title: "Título estornado",
        description: "O título foi reaberto e o saldo da conta revertido com sucesso.",
      });
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao estornar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEstornando(false);
      setEstornoDialogOpen(false);
      setMovimentoEstorno(null);
    }
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const vencimentoDate = new Date(dataVencimento + "T00:00:00");
    const isVencido = isPast(vencimentoDate) && !isToday(vencimentoDate) && status === "Pendente";

    if (isVencido) {
      return <Badge variant="destructive">Vencido</Badge>;
    }

    switch (status) {
      case "Pago":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Recebido</Badge>;
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

  const isRowVencido = (status: string, dataVencimento: string) => {
    const vencimentoDate = new Date(dataVencimento + "T00:00:00");
    return isPast(vencimentoDate) && !isToday(vencimentoDate) && status === "Pendente";
  };

  const getVeiculoDisplayName = (veiculo: Veiculo) => {
    const parts = [veiculo.fabricante, veiculo.modelo, veiculo.ano].filter(Boolean);
    const base = parts.join(" ") || "Veículo sem nome";
    const withPlaca = veiculo.placa ? `${base} - ${veiculo.placa}` : base;
    return veiculo.status === "Vendido" ? `${withPlaca} [Vendido]` : withPlaca;
  };

  const filteredMovimentos = movimentos.filter((mov) => {
    const matchesSearch = mov.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === "pendente") {
      matchesStatus = mov.status === "Pendente";
    } else if (statusFilter === "pago") {
      matchesStatus = mov.status === "Pago";
    } else if (statusFilter === "vencido") {
      matchesStatus = isRowVencido(mov.status, mov.data_vencimento);
    }

    let matchesDate = true;
    if (dateFilter) {
      const movDate = new Date(mov.data_vencimento + "T00:00:00");
      matchesDate =
        movDate.getFullYear() === dateFilter.getFullYear() &&
        movDate.getMonth() === dateFilter.getMonth() &&
        movDate.getDate() === dateFilter.getDate();
    }

    let matchesVeiculo = true;
    if (veiculoFilter !== "todos") {
      matchesVeiculo = mov.id_estoque === parseInt(veiculoFilter);
    }

    let matchesCompetencia = true;
    if (competenciaFilter !== "todos") {
      matchesCompetencia = mov.competencia === competenciaFilter;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesVeiculo && matchesCompetencia;
  });

  const pendingMovimentos = filteredMovimentos.filter((mov) => mov.status !== "Pago");
  const allPendingSelected = pendingMovimentos.length > 0 && pendingMovimentos.every((mov) => selectedIds.has(mov.id));
  const somePendingSelected = pendingMovimentos.some((mov) => selectedIds.has(mov.id));

  const selectedMovimentosForBaixa = filteredMovimentos.filter(
    (mov) => selectedIds.has(mov.id) && mov.status !== "Pago"
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas a Receber"
        description="Gerencie recebimentos e cobranças"
        action={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setBaixaLoteDialogOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Baixar Selecionados ({selectedMovimentosForBaixa.length})
              </Button>
            )}
            <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        }
      />

      <div className="glass rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando lançamentos...</span>
          </div>
        ) : movimentos.length === 0 ? (
          <EmptyState
            icon={ArrowUpCircle}
            title="Nenhuma conta a receber"
            description="Não há recebimentos ou cobranças cadastradas no momento."
          />
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Recebido</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={veiculoFilter} onValueChange={setVeiculoFilter}>
                <SelectTrigger className="w-[220px] bg-background/50 border-border/50">
                  <Car className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar veículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os veículos</SelectItem>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {getVeiculoDisplayName(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={competenciaFilter} onValueChange={setCompetenciaFilter}>
                <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Competência" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="todos">Todas</SelectItem>
                  {opcoesCompetencia.map((opcao) => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal bg-background/50 border-border/50",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(dateFilter || veiculoFilter !== "todos" || competenciaFilter !== "todos") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDateFilter(undefined);
                    setVeiculoFilter("todos");
                    setCompetenciaFilter("todos");
                  }}
                  className="h-10 w-10"
                  title="Limpar filtros"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allPendingSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todos"
                        className={somePendingSelected && !allPendingSelected ? "data-[state=checked]:bg-accent/50" : ""}
                      />
                    </TableHead>
                    <TableHead className="text-foreground font-semibold">Descrição</TableHead>
                    <TableHead className="text-foreground font-semibold">Valor</TableHead>
                    <TableHead className="text-foreground font-semibold">Vencimento</TableHead>
                    <TableHead className="text-foreground font-semibold">Competência</TableHead>
                    <TableHead className="text-foreground font-semibold">Conta</TableHead>
                    <TableHead className="text-foreground font-semibold">Categoria</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold w-[130px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovimentos.map((mov) => {
                      const isPago = mov.status === "Pago";
                      return (
                        <TableRow
                          key={mov.id}
                          className={cn(
                            "border-border/50",
                            isRowVencido(mov.status, mov.data_vencimento) && "bg-destructive/10",
                            isPago && "opacity-60 bg-green-500/5"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(mov.id)}
                              onCheckedChange={(checked) => handleSelectOne(mov.id, checked === true)}
                              disabled={isPago}
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
                            {mov.competencia || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getContaDisplayName(mov)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {mov.vx_fin_categoria?.categoria || "-"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(mov.status, mov.data_vencimento)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isPago ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-orange-500/20 text-orange-500"
                                  onClick={() => handleEstornoClick(mov)}
                                  title="Estornar/Reabrir"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-green-500/20 text-green-500"
                                  onClick={() => handleBaixaIndividual(mov)}
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
                                onClick={() => handleEdit(mov)}
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
                                onClick={() => handleDeleteClick(mov)}
                                disabled={isPago}
                                title={isPago ? "Estorne para excluir" : "Excluir"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <MovimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        movimento={selectedMovimento}
        defaultTipo="Receber"
        onSuccess={fetchMovimentos}
        editScope={editScope}
      />

      {/* Simple delete dialog for non-recurring */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o lançamento "{movimentoToDelete?.descricao}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recurrence edit dialog */}
      <RecorrenciaActionDialog
        open={recorrenciaEditDialogOpen}
        onOpenChange={setRecorrenciaEditDialogOpen}
        actionType="edit"
        onConfirm={handleRecorrenciaEditConfirm}
      />

      {/* Recurrence delete dialog */}
      <RecorrenciaActionDialog
        open={recorrenciaDeleteDialogOpen}
        onOpenChange={setRecorrenciaDeleteDialogOpen}
        actionType="delete"
        onConfirm={handleRecorrenciaDeleteConfirm}
        loading={deleting}
      />

      {/* Baixa em Lote */}
      <BaixaLoteDialog
        open={baixaLoteDialogOpen}
        onOpenChange={setBaixaLoteDialogOpen}
        movimentosSelecionados={selectedMovimentosForBaixa.map((mov) => ({
          id: mov.id,
          descricao: mov.descricao,
          valor_bruto: mov.valor_bruto,
          data_vencimento: mov.data_vencimento,
        }))}
        contas={contas}
        formasPagamento={formasPagamento}
        onConfirm={handleBaixaLoteConfirm}
      />

      {/* Baixa Individual */}
      <BaixaIndividualDialog
        open={baixaIndividualDialogOpen}
        onOpenChange={setBaixaIndividualDialogOpen}
        movimento={movimentoBaixa}
        contas={contas}
        formasPagamento={formasPagamento}
        onConfirm={handleBaixaIndividualConfirm}
      />

      {/* Estorno dialog */}
      <AlertDialog open={estornoDialogOpen} onOpenChange={setEstornoDialogOpen}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar estorno</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente estornar o título "{movimentoEstorno?.descricao}"?
              <br />
              <span className="text-muted-foreground text-sm">
                O status será alterado para "Pendente" e os valores de desconto/acréscimo serão zerados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={estornando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEstornoConfirm}
              disabled={estornando}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {estornando ? "Estornando..." : "Estornar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceiroReceber;
