import { useState, useEffect } from "react";
import { format, isPast, isToday, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowDownCircle,
  Search,
  Loader2,
  CalendarIcon,
  X,
  Landmark,
  CreditCard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";
import { RecorrenciaActionDialog } from "@/features/financeiro/components/RecorrenciaActionDialog";
import { BaixaLoteDialog } from "@/features/financeiro/components/BaixaLoteDialog";
import { BaixaIndividualDialog } from "@/features/financeiro/components/BaixaIndividualDialog";
import { MovimentoGroupedList } from "@/features/financeiro/components/MovimentoGroupedList";
import { atualizarSaldoConta, calcularValorFinal } from "@/features/financeiro/utils/saldoUtils";
import { deleteAnexosDoMovimento, deleteAnexosDeMovimentos } from "@/features/financeiro/utils/anexosUtils";

interface Movimento {
  id: string;
  tipo_movimento: string;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  data_vencimento: string;
  data_pagamento: string | null;
  data_compra: string | null;
  id_conta: string;
  id_categoria: string;
  id_empresa: string;
  id_forma_pagamento: string | null;
  id_cartao: string | null;
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

// Get current month/year competencia
const getCompetenciaAtual = (): string => {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const ano = now.getFullYear();
  return `${mes}/${ano}`;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const FinanceiroPagar = () => {
  const { toast } = useToast();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [contas, setContas] = useState<Conta[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [conciliacaoFilter, setConciliacaoFilter] = useState<string>("todos");
  const [contaFilter, setContaFilter] = useState<string>("todos");
  const [formaPagamentoFilter, setFormaPagamentoFilter] = useState<string>("todos");
  const [competenciaFilter, setCompetenciaFilter] = useState<string>(getCompetenciaAtual());
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movimentoToDelete, setMovimentoToDelete] = useState<Movimento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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

  // Conciliação em lote state
  const [conciliandoLote, setConciliandoLote] = useState(false);

  const fetchMovimentos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("vx_fin_movimento")
        .select(`
          *,
          vx_fin_conta!id_conta (banco, descricao),
          vx_fin_categoria (categoria)
        `, { count: 'exact' })
        .eq("tipo_movimento", "Pagar");

      // Apply filters at database level
      if (competenciaFilter && competenciaFilter !== "todos") {
        query = query.eq("competencia", competenciaFilter);
      }
      if (contaFilter && contaFilter !== "todos") {
        query = query.eq("id_conta", contaFilter);
      }
      if (formaPagamentoFilter && formaPagamentoFilter !== "todos") {
        query = query.eq("id_forma_pagamento", formaPagamentoFilter);
      }
      if (statusFilter === "pago") {
        query = query.eq("status", "Pago");
      } else if (statusFilter === "pendente") {
        query = query.eq("status", "Pendente");
      } else if (statusFilter === "vencido") {
        const today = format(new Date(), "yyyy-MM-dd");
        query = query.eq("status", "Pendente").lt("data_vencimento", today);
      }
      if (conciliacaoFilter === "conciliado") {
        query = query.eq("conciliado", true);
      } else if (conciliacaoFilter === "a_conciliar") {
        query = query.eq("conciliado", false);
      }
      if (dateFilter) {
        const dateStr = format(dateFilter, "yyyy-MM-dd");
        query = query.eq("data_vencimento", dateStr);
      }
      if (searchTerm) {
        query = query.ilike("descricao", `%${searchTerm}%`);
      }

      // Order by data_vencimento DESC
      query = query.order("data_vencimento", { ascending: false });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setMovimentos((data as unknown as Movimento[]) || []);
      setTotalCount(count || 0);
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

  useEffect(() => {
    fetchContas();
    fetchFormasPagamento();
  }, []);

  // Fetch movimentos when filters or pagination changes
  useEffect(() => {
    fetchMovimentos();
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, conciliacaoFilter, contaFilter, formaPagamentoFilter, competenciaFilter, dateFilter, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, conciliacaoFilter, contaFilter, formaPagamentoFilter, competenciaFilter, dateFilter, pageSize]);

  const getContaDisplayName = (conta: Conta) => {
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

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
      // Delete attachments first
      await deleteAnexosDoMovimento(movimentoToDelete.id);

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
        // Delete attachments first
        await deleteAnexosDoMovimento(movimentoToDelete.id);

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
        // Get all IDs to delete
        const { data: idsToDelete } = await supabase
          .from("vx_fin_movimento")
          .select("id")
          .eq("recorrencia_id", movimentoToDelete.recorrencia_id)
          .gte("ordem_ocorrencia", movimentoToDelete.ordem_ocorrencia || 0);

        // Delete attachments for all movements
        if (idsToDelete) {
          await deleteAnexosDeMovimentos(idsToDelete.map(m => m.id));
        }

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
      await atualizarSaldoConta(data.contaId, valorFinal, "Pagar");

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
    const selectedMovimentosLote = movimentos.filter(
      (mov) => selectedIds.has(mov.id) && mov.status !== "Pago"
    );

    if (selectedMovimentosLote.length === 0) return;

    try {
      let totalAtualizado = 0;
      
      for (const mov of selectedMovimentosLote) {
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
      await atualizarSaldoConta(contaId, totalAtualizado, "Pagar");

      toast({
        title: "Títulos baixados",
        description: `${selectedMovimentosLote.length} título(s) baixado(s) e saldo atualizado com sucesso.`,
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
      const allIds = movimentos.map((mov) => mov.id);
      setSelectedIds(new Set(allIds));
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

  // Conciliação handler
  const handleConciliar = async (movimento: Movimento) => {
    if (movimento.status !== "Pago" || movimento.conciliado) return;
    
    try {
      const { error } = await supabase
        .from("vx_fin_movimento")
        .update({ conciliado: true })
        .eq("id", movimento.id);

      if (error) throw error;

      toast({
        title: "Título conciliado",
        description: "O título foi marcado como conciliado com sucesso.",
      });
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Conciliação em lote handler
  const handleConciliarLote = async () => {
    const idsParaConciliar = movimentos
      .filter((mov) => selectedIds.has(mov.id) && mov.status === "Pago" && !mov.conciliado)
      .map((mov) => mov.id);

    if (idsParaConciliar.length === 0) return;

    setConciliandoLote(true);
    try {
      const { error } = await supabase
        .from("vx_fin_movimento")
        .update({ conciliado: true })
        .in("id", idsParaConciliar);

      if (error) throw error;

      toast({
        title: "Títulos conciliados",
        description: `${idsParaConciliar.length} título(s) conciliado(s) com sucesso.`,
      });
      setSelectedIds(new Set());
      fetchMovimentos();
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar títulos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConciliandoLote(false);
    }
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
      await atualizarSaldoConta(movimentoEstorno.id_conta, valorFinal, "Pagar", true);

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

  const isRowVencido = (status: string, dataVencimento: string) => {
    const vencimentoDate = new Date(dataVencimento + "T00:00:00");
    return isPast(vencimentoDate) && !isToday(vencimentoDate) && status === "Pendente";
  };

  // Get selected movimentos
  const selectedMovimentos = movimentos.filter((mov) => selectedIds.has(mov.id));
  
  // Check if ALL selected are pending (for baixa em lote)
  const allSelectedArePending = selectedMovimentos.length > 0 && 
    selectedMovimentos.every((mov) => mov.status !== "Pago");
  
  // Check if ALL selected are paid (for conciliação em lote)
  const allSelectedArePaid = selectedMovimentos.length > 0 && 
    selectedMovimentos.every((mov) => mov.status === "Pago");
  
  // Movimentos selecionados elegíveis para conciliação (pagos e não conciliados)
  const selectedMovimentosForConciliacao = selectedMovimentos.filter(
    (mov) => mov.status === "Pago" && !mov.conciliado
  );

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasFiltersActive = dateFilter || contaFilter !== "todos" || formaPagamentoFilter !== "todos" || competenciaFilter !== getCompetenciaAtual() || statusFilter !== "todos" || conciliacaoFilter !== "todos" || searchTerm;

  const handleClearFilters = () => {
    setDateFilter(undefined);
    setContaFilter("todos");
    setFormaPagamentoFilter("todos");
    setCompetenciaFilter(getCompetenciaAtual());
    setStatusFilter("todos");
    setConciliacaoFilter("todos");
    setSearchTerm("");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie despesas e pagamentos"
        action={
          <div className="flex items-center gap-2">
            {allSelectedArePaid && selectedMovimentosForConciliacao.length > 0 && (
              <Button
                onClick={handleConciliarLote}
                disabled={conciliandoLote}
                style={{ backgroundColor: '#0DCAF0' }}
                className="hover:opacity-90 text-black"
              >
                {conciliandoLote ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-2" />
                )}
                Conciliar Selecionados ({selectedMovimentosForConciliacao.length})
              </Button>
            )}
            {allSelectedArePending && selectedMovimentos.length > 0 && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setBaixaLoteDialogOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Baixar Selecionados ({selectedMovimentos.length})
              </Button>
            )}
            <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
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
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={conciliacaoFilter} onValueChange={setConciliacaoFilter}>
                <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Conciliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="conciliado">Conciliado</SelectItem>
                  <SelectItem value="a_conciliar">A Conciliar</SelectItem>
                </SelectContent>
              </Select>

              <Select value={contaFilter} onValueChange={setContaFilter}>
                <SelectTrigger className="w-[220px] bg-background/50 border-border/50">
                  <Landmark className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as contas</SelectItem>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getContaDisplayName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={formaPagamentoFilter} onValueChange={setFormaPagamentoFilter}>
                <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Forma pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as formas</SelectItem>
                  {formasPagamento.map((fp) => (
                    <SelectItem key={fp.id} value={fp.id}>
                      {fp.descricao}
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

              {hasFiltersActive && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearFilters}
                  className="h-10 w-10"
                  title="Limpar filtros"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Page Size Selector */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Registros por página:</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-[80px] bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grouped List */}
            {movimentos.length === 0 ? (
              <EmptyState
                icon={ArrowDownCircle}
                title="Nenhum registro encontrado"
                description="Não há lançamentos para os filtros selecionados."
              />
            ) : (
              <MovimentoGroupedList
                movimentos={movimentos}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectOne={handleSelectOne}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onBaixa={handleBaixaIndividual}
                onEstorno={handleEstornoClick}
                onConciliar={handleConciliar}
                tipoMovimento="Pagar"
              />
            )}

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/30">
                <span className="text-sm text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * pageSize + 1, totalCount)} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} registros
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1 || loading}
                    className="bg-background/50"
                  >
                    Primeira
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="bg-background/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="bg-background/50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    className="bg-background/50"
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <MovimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        movimento={selectedMovimento}
        defaultTipo="Pagar"
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
        movimentosSelecionados={selectedMovimentos.filter((mov) => mov.status !== "Pago").map((mov) => ({
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

export default FinanceiroPagar;
