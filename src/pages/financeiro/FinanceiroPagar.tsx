import { useState, useEffect, useCallback } from "react";
import { format, isPast, isToday, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, ArrowDownCircle, Search, Loader2, CalendarIcon, X, Landmark, CreditCard, CheckCircle2, ChevronLeft, ChevronRight, CheckCheck, FileText, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";
import { RecorrenciaActionDialog } from "@/features/financeiro/components/RecorrenciaActionDialog";
import { BaixaLoteDialog } from "@/features/financeiro/components/BaixaLoteDialog";
import { BaixaIndividualDialog } from "@/features/financeiro/components/BaixaIndividualDialog";
import { MovimentoGroupedList, type AnexoData } from "@/features/financeiro/components/MovimentoGroupedList";
import { GerarFaturaDialog } from "@/features/financeiro/components/GerarFaturaDialog";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/ui/multi-select-filter";

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
  id_pessoa: string | null;
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
  vx_fin_conta: {
    banco: string;
    descricao: string | null;
  } | null;
  vx_fin_categoria: {
    categoria: string;
  } | null;
  vx_fin_cartao: {
    descricao: string;
    final: string;
    bandeira: string;
  } | null;
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
interface Cartao {
  id: string;
  descricao: string;
  final: string;
  id_forma_pagamento: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// Helper to load array from localStorage
function loadArrayFilter(key: string): string[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

const FinanceiroPagar = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [contas, setContas] = useState<Conta[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Multi-select filters with localStorage persistence
  const [statusFilter, setStatusFilterRaw] = useState<string[]>(() => loadArrayFilter("fin-pagar-status"));
  const [conciliacaoFilter, setConciliacaoFilter] = useState<string>("todos");
  const [contaFilter, setContaFilterRaw] = useState<string[]>(() => loadArrayFilter("fin-pagar-contas"));
  const [formaPagamentoFilter, setFormaPagamentoFilterRaw] = useState<string[]>(() => loadArrayFilter("fin-pagar-formas"));
  const [cartaoFilter, setCartaoFilter] = useState<string>("todos");
  const [dateFilterStart, setDateFilterStart] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateFilterEnd, setDateFilterEnd] = useState<Date | undefined>(endOfMonth(new Date()));

  const setStatusFilter = useCallback((v: string[]) => {
    setStatusFilterRaw(v);
    localStorage.setItem("fin-pagar-status", JSON.stringify(v));
  }, []);
  const setContaFilter = useCallback((v: string[]) => {
    setContaFilterRaw(v);
    localStorage.setItem("fin-pagar-contas", JSON.stringify(v));
  }, []);
  const setFormaPagamentoFilter = useCallback((v: string[]) => {
    setFormaPagamentoFilterRaw(v);
    localStorage.setItem("fin-pagar-formas", JSON.stringify(v));
  }, []);

  // Group by / Filter date field
  const storageKey = "financeiro-groupBy-Pagar";
  const [groupByField, setGroupByField] = useState<"data_compra" | "data_vencimento" | "data_pagamento">(() => {
    const saved = localStorage.getItem(storageKey);
    return saved as "data_compra" | "data_vencimento" | "data_pagamento" || "data_compra";
  });
  const handleGroupByChange = (value: "data_compra" | "data_vencimento" | "data_pagamento") => {
    setGroupByField(value);
    localStorage.setItem(storageKey, value);
  };

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

  // Gerar fatura dialog state
  const [faturaDialogOpen, setFaturaDialogOpen] = useState(false);

  // Anexos state
  const [anexosMap, setAnexosMap] = useState<Record<string, AnexoData>>({});

  const fetchAnexos = async (movimentoIds: string[]) => {
    if (movimentoIds.length === 0) {
      setAnexosMap({});
      return;
    }
    try {
      const { data, error } = await supabase
        .from("vx_fin_anexo")
        .select("id, id_movimento, nome_arquivo, tipo_mime, base64, url_arquivo")
        .in("id_movimento", movimentoIds);
      if (error) throw error;
      const map: Record<string, AnexoData> = {};
      if (data) {
        data.forEach((anexo) => {
          if (!map[anexo.id_movimento]) {
            map[anexo.id_movimento] = {
              id: anexo.id,
              nome_arquivo: anexo.nome_arquivo,
              tipo_mime: anexo.tipo_mime,
              base64: anexo.base64,
              url_arquivo: anexo.url_arquivo,
            };
          }
        });
      }
      setAnexosMap(map);
    } catch (error) {
      console.error("Erro ao carregar anexos:", error);
    }
  };

  const fetchMovimentos = async () => {
    setLoading(true);
    try {
      let query = supabase.from("vx_fin_movimento").select(`
          *,
          vx_fin_conta!id_conta (banco, descricao),
          vx_fin_categoria (categoria),
          vx_fin_cartao (descricao, final, bandeira)
        `, { count: 'exact' }).eq("tipo_movimento", "Pagar");

      // Date filters
      if (dateFilterStart && dateFilterEnd) {
        const startStr = format(dateFilterStart, "yyyy-MM-dd");
        const endStr = format(dateFilterEnd, "yyyy-MM-dd");
        query = query.gte(groupByField, startStr).lte(groupByField, endStr);
      }

      // Multi-select conta filter
      if (contaFilter.length > 0) {
        query = query.in("id_conta", contaFilter);
      }

      // Multi-select forma pagamento filter
      if (formaPagamentoFilter.length > 0) {
        query = query.in("id_forma_pagamento", formaPagamentoFilter);
      }

      if (cartaoFilter && cartaoFilter !== "todos") {
        query = query.eq("id_cartao", cartaoFilter);
      }

      // Multi-select status filter
      if (statusFilter.length > 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        const orParts: string[] = [];
        if (statusFilter.includes("pago")) {
          orParts.push("status.eq.Pago");
        }
        if (statusFilter.includes("pendente") && statusFilter.includes("vencido")) {
          // Both pendente and vencido = all Pendente
          orParts.push("status.eq.Pendente");
        } else if (statusFilter.includes("pendente")) {
          orParts.push(`and(status.eq.Pendente,data_vencimento.gte.${today})`);
        } else if (statusFilter.includes("vencido")) {
          orParts.push(`and(status.eq.Pendente,data_vencimento.lt.${today})`);
        }
        if (orParts.length > 0) {
          query = query.or(orParts.join(","));
        }
      }

      if (conciliacaoFilter === "conciliado") {
        query = query.eq("conciliado", true);
      } else if (conciliacaoFilter === "a_conciliar") {
        query = query.eq("conciliado", false);
      }

      if (searchTerm) {
        const rawSearch = searchTerm.trim();
        const cleanedValue = rawSearch.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
        const numericValue = cleanedValue ? parseFloat(cleanedValue) : NaN;
        if (!isNaN(numericValue)) {
          query = query.eq("valor_bruto", numericValue);
        } else {
          query = query.ilike("descricao", `%${rawSearch}%`);
        }
      }

      query = query.order("data_vencimento", { ascending: false });

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      const movimentosData = data as unknown as Movimento[] || [];
      setMovimentos(movimentosData);
      setTotalCount(count || 0);
      const movimentoIds = movimentosData.map(m => m.id);
      await fetchAnexos(movimentoIds);
    } catch (error: any) {
      toast({ title: "Erro ao carregar lançamentos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchContas = async () => {
    try {
      const { data, error } = await supabase.from("vx_fin_conta").select("id, banco, descricao").order("banco");
      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  const fetchFormasPagamento = async () => {
    try {
      const { data, error } = await supabase.from("vx_forma_pagamento").select("id, descricao").eq("ativa", true).order("descricao");
      if (error) throw error;
      setFormasPagamento(data || []);
    } catch (error) {
      console.error("Erro ao carregar formas de pagamento:", error);
    }
  };

  const fetchCartoes = async () => {
    try {
      const { data, error } = await supabase.from("vx_fin_cartao").select("id, descricao, final, id_forma_pagamento").eq("ativo", true).order("descricao");
      if (error) throw error;
      setCartoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    }
  };

  // Cartões filtrados pela forma de pagamento selecionada
  const cartoesFiltrados = formaPagamentoFilter.length === 1
    ? cartoes.filter(c => c.id_forma_pagamento === formaPagamentoFilter[0])
    : [];

  // Reset cartaoFilter when formaPagamentoFilter changes
  useEffect(() => {
    setCartaoFilter("todos");
  }, [formaPagamentoFilter]);

  useEffect(() => {
    fetchContas();
    fetchFormasPagamento();
    fetchCartoes();
  }, []);

  useEffect(() => {
    fetchMovimentos();
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, conciliacaoFilter, contaFilter, formaPagamentoFilter, cartaoFilter, dateFilterStart, dateFilterEnd, groupByField, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, conciliacaoFilter, contaFilter, formaPagamentoFilter, cartaoFilter, dateFilterStart, dateFilterEnd, pageSize]);

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
      await deleteAnexosDoMovimento(movimentoToDelete.id);
      const { error } = await supabase.from("vx_fin_movimento").delete().eq("id", movimentoToDelete.id);
      if (error) throw error;
      toast({ title: "Lançamento excluído", description: "O lançamento foi excluído com sucesso." });
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
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
        await deleteAnexosDoMovimento(movimentoToDelete.id);
        const { error } = await supabase.from("vx_fin_movimento").delete().eq("id", movimentoToDelete.id);
        if (error) throw error;
        toast({ title: "Lançamento excluído", description: "A ocorrência foi excluída com sucesso." });
      } else {
        const { data: idsToDelete } = await supabase.from("vx_fin_movimento").select("id").eq("recorrencia_id", movimentoToDelete.recorrencia_id).gte("ordem_ocorrencia", movimentoToDelete.ordem_ocorrencia || 0);
        if (idsToDelete) {
          await deleteAnexosDeMovimentos(idsToDelete.map(m => m.id));
        }
        const { error } = await supabase.from("vx_fin_movimento").delete().eq("recorrencia_id", movimentoToDelete.recorrencia_id).gte("ordem_ocorrencia", movimentoToDelete.ordem_ocorrencia || 0);
        if (error) throw error;
        toast({ title: "Lançamentos excluídos", description: "Esta e todas as ocorrências futuras foram excluídas." });
      }
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
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
      const movimento = movimentos.find(m => m.id === data.id);
      if (!movimento) throw new Error("Movimento não encontrado");
      const { error } = await supabase.from("vx_fin_movimento").update({
        status: "Pago",
        data_pagamento: data.dataPagamento,
        id_conta: data.contaId,
        id_forma_pagamento: data.formaPagamentoId,
        desconto: data.desconto,
        acrescimo: data.acrescimo,
        motivo_ajuste: data.motivoAjuste,
        valor_liquido: movimento.valor_bruto - data.desconto + data.acrescimo,
      }).eq("id", data.id);
      if (error) throw error;
      toast({ title: "Título baixado", description: "O título foi baixado com sucesso." });
      setBaixaIndividualDialogOpen(false);
      setMovimentoBaixa(null);
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao baixar título", description: error.message, variant: "destructive" });
    }
  };

  const handleBaixaLoteConfirm = async (dataPagamento: string) => {
    const selectedMovimentosLote = movimentos.filter(
      (mov) => selectedIds.has(mov.id) && mov.status !== "Pago"
    );
    if (selectedMovimentosLote.length === 0) return;
    try {
      for (const mov of selectedMovimentosLote) {
        const dataFinal = dataPagamento || mov.data_vencimento;
        const { error } = await supabase.from("vx_fin_movimento").update({
          status: "Pago",
          data_pagamento: dataFinal,
        }).eq("id", mov.id);
        if (error) throw error;
      }
      toast({
        title: "Títulos baixados",
        description: `${selectedMovimentosLote.length} título(s) baixado(s) com sucesso.`,
      });
      setSelectedIds(new Set());
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao baixar títulos", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  // Selection handlers
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

  // Estorno handler
  const handleEstornoClick = (movimento: Movimento) => {
    if (movimento.status !== "Pago") return;
    setMovimentoEstorno(movimento);
    setEstornoDialogOpen(true);
  };

  const handleEstornoConfirm = async () => {
    if (!movimentoEstorno) return;
    setEstornando(true);
    try {
      const { error } = await supabase.from("vx_fin_movimento").update({
        status: "Pendente",
        data_pagamento: null,
        desconto: 0,
        acrescimo: 0,
        motivo_ajuste: null,
        valor_liquido: movimentoEstorno.valor_bruto,
        conciliado: false,
      }).eq("id", movimentoEstorno.id);
      if (error) throw error;
      toast({ title: "Título estornado", description: "O título foi reaberto e o saldo da conta revertido com sucesso." });
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao estornar", description: error.message, variant: "destructive" });
    } finally {
      setEstornando(false);
      setEstornoDialogOpen(false);
      setMovimentoEstorno(null);
    }
  };

  // Conciliar
  const handleConciliar = async (movimento: Movimento) => {
    if (movimento.status !== "Pago" || movimento.conciliado) return;
    try {
      const { error } = await supabase.from("vx_fin_movimento").update({ conciliado: true }).eq("id", movimento.id);
      if (error) throw error;
      toast({ title: "Título conciliado", description: "O título foi marcado como conciliado com sucesso." });
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao conciliar", description: error.message, variant: "destructive" });
    }
  };

  const handleConciliarLote = async () => {
    if (selectedMovimentosForConciliacao.length === 0) return;
    setConciliandoLote(true);
    try {
      for (const mov of selectedMovimentosForConciliacao) {
        const { error } = await supabase.from("vx_fin_movimento").update({ conciliado: true }).eq("id", mov.id);
        if (error) throw error;
      }
      toast({
        title: "Conciliação em lote",
        description: `${selectedMovimentosForConciliacao.length} título(s) conciliado(s) com sucesso.`,
      });
      setSelectedIds(new Set());
      fetchMovimentos();
    } catch (error: any) {
      toast({ title: "Erro ao conciliar em lote", description: error.message, variant: "destructive" });
    } finally {
      setConciliandoLote(false);
    }
  };

  const isRowVencido = (status: string, dataVencimento: string) => {
    const vencimentoDate = new Date(dataVencimento + "T00:00:00");
    return isPast(vencimentoDate) && !isToday(vencimentoDate) && status === "Pendente";
  };

  const selectedMovimentos = movimentos.filter(mov => selectedIds.has(mov.id));
  const allSelectedArePending = selectedMovimentos.length > 0 && selectedMovimentos.every(mov => mov.status !== "Pago");
  const allSelectedArePaid = selectedMovimentos.length > 0 && selectedMovimentos.every(mov => mov.status === "Pago");
  const selectedMovimentosForConciliacao = selectedMovimentos.filter(mov => mov.status === "Pago" && !mov.conciliado);

  const totalPages = Math.ceil(totalCount / pageSize);
  const defaultStart = startOfMonth(new Date());
  const defaultEnd = endOfMonth(new Date());
  const hasFiltersActive = (dateFilterStart?.getTime() !== defaultStart.getTime()) || (dateFilterEnd?.getTime() !== defaultEnd.getTime()) || contaFilter.length > 0 || formaPagamentoFilter.length > 0 || cartaoFilter !== "todos" || statusFilter.length > 0 || conciliacaoFilter !== "todos" || searchTerm;

  const handleClearFilters = () => {
    setDateFilterStart(startOfMonth(new Date()));
    setDateFilterEnd(endOfMonth(new Date()));
    setContaFilter([]);
    setFormaPagamentoFilter([]);
    setCartaoFilter("todos");
    setStatusFilter([]);
    setConciliacaoFilter("todos");
    setSearchInput("");
    setSearchTerm("");
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Build options for multiselects
  const statusOptions: MultiSelectOption[] = [
    { value: "pendente", label: "Pendente" },
    { value: "pago", label: "Pago" },
    { value: "vencido", label: "Vencido" },
  ];

  const contaOptions: MultiSelectOption[] = contas.map(c => ({
    value: c.id,
    label: getContaDisplayName(c),
  }));

  const formaPagamentoOptions: MultiSelectOption[] = formasPagamento.map(fp => ({
    value: fp.id,
    label: fp.descricao,
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Contas a Pagar" description="Gerencie despesas e pagamentos" action={
        <div className="flex items-center gap-2">
          {allSelectedArePaid && selectedMovimentosForConciliacao.length > 0 && (
            <Button onClick={handleConciliarLote} disabled={conciliandoLote} style={{ backgroundColor: '#0DCAF0' }} className="hover:opacity-90 text-black">
              {conciliandoLote ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2" />}
              Conciliar Selecionados ({selectedMovimentosForConciliacao.length})
            </Button>
          )}
          {allSelectedArePending && selectedMovimentos.length > 0 && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setBaixaLoteDialogOpen(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Baixar Selecionados ({selectedMovimentos.length})
            </Button>
          )}
          <Button variant="outline" className="border-accent/50 hover:bg-accent/10" onClick={() => setFaturaDialogOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Gerar Fatura
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/financeiro/fast?tipo=Pagar")}
            title="Lançamento Rápido"
            className="rounded-full w-10 h-10 border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10"
            style={{ boxShadow: '0 0 20px 3px rgba(251, 191, 36, 0.4), 0 0 40px 6px rgba(251, 191, 36, 0.2)' }}
          >
            <Zap className="w-5 h-5 text-amber-500" />
          </Button>
          <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      } />

      <div className="glass rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando lançamentos...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="space-y-4">
              {/* First row */}
              <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                <div className="flex items-center gap-1 flex-1 max-w-sm">
                  <Input placeholder="Buscar por descrição ou valor..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleSearchKeyDown} className="bg-background/50 border-border/50" />
                  <Button variant="outline" size="icon" onClick={handleSearch} className="shrink-0 border-border/50 hover:bg-accent/10">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <MultiSelectFilter
                  options={statusOptions}
                  selected={statusFilter}
                  onSelectedChange={setStatusFilter}
                  placeholder="Status"
                  width="w-[160px]"
                />

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

                <MultiSelectFilter
                  options={contaOptions}
                  selected={contaFilter}
                  onSelectedChange={setContaFilter}
                  placeholder="Todas as contas"
                  icon={<Landmark className="h-4 w-4" />}
                  width="w-[220px]"
                />

                {cartoesFiltrados.length > 0 && (
                  <Select value={cartaoFilter} onValueChange={setCartaoFilter}>
                    <SelectTrigger className="w-[180px] bg-background/50 border-border/50 border-purple-500/50">
                      <CreditCard className="mr-2 h-4 w-4 text-purple-400" />
                      <SelectValue placeholder="Cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os cartões</SelectItem>
                      {cartoesFiltrados.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.descricao} - {c.final}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {hasFiltersActive && (
                  <Button variant="ghost" size="icon" onClick={handleClearFilters} className="h-10 w-10" title="Limpar filtros">
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {/* Page Size Selector */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">Registros por página:</span>
                  <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                    <SelectTrigger className="w-[80px] bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second row - Date filters with type selector and payment method */}
              <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal bg-background/50 border-border/50", !dateFilterStart && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilterStart ? format(dateFilterStart, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFilterStart} onSelect={setDateFilterStart} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal bg-background/50 border-border/50", !dateFilterEnd && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilterEnd ? format(dateFilterEnd, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFilterEnd} onSelect={setDateFilterEnd} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <Select value={groupByField} onValueChange={handleGroupByChange}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                    <SelectValue placeholder="Agrupar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_compra">Data da Compra</SelectItem>
                    <SelectItem value="data_vencimento">Data de Vencimento</SelectItem>
                    <SelectItem value="data_pagamento">Data de Pagamento</SelectItem>
                  </SelectContent>
                </Select>

                <MultiSelectFilter
                  options={formaPagamentoOptions}
                  selected={formaPagamentoFilter}
                  onSelectedChange={setFormaPagamentoFilter}
                  placeholder="Todas as formas"
                  icon={<CreditCard className="h-4 w-4" />}
                  width="w-[200px]"
                />
              </div>
            </div>

            {/* Grouped List */}
            {movimentos.length === 0 ? (
              <EmptyState icon={ArrowDownCircle} title="Nenhum registro encontrado" description="Não há lançamentos para os filtros selecionados." />
            ) : (
              <MovimentoGroupedList movimentos={movimentos} selectedIds={selectedIds} onSelectAll={handleSelectAll} onSelectOne={handleSelectOne} onEdit={handleEdit} onDelete={handleDeleteClick} onBaixa={handleBaixaIndividual} onEstorno={handleEstornoClick} onConciliar={handleConciliar} tipoMovimento="Pagar" groupBy={groupByField} anexosMap={anexosMap} />
            )}

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/30">
                <span className="text-sm text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * pageSize + 1, totalCount)} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} registros
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || loading} className="bg-background/50">Primeira</Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading} className="bg-background/50">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3">Página {currentPage} de {totalPages}</span>
                  <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading} className="bg-background/50">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || loading} className="bg-background/50">Última</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <MovimentoDialog open={dialogOpen} onOpenChange={setDialogOpen} movimento={selectedMovimento} defaultTipo="Pagar" onSuccess={fetchMovimentos} editScope={editScope} />

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
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecorrenciaActionDialog open={recorrenciaEditDialogOpen} onOpenChange={setRecorrenciaEditDialogOpen} actionType="edit" onConfirm={handleRecorrenciaEditConfirm} />
      <RecorrenciaActionDialog open={recorrenciaDeleteDialogOpen} onOpenChange={setRecorrenciaDeleteDialogOpen} actionType="delete" onConfirm={handleRecorrenciaDeleteConfirm} loading={deleting} />

      <BaixaLoteDialog open={baixaLoteDialogOpen} onOpenChange={setBaixaLoteDialogOpen} movimentosSelecionados={selectedMovimentos.filter(mov => mov.status !== "Pago").map(mov => ({
        id: mov.id,
        descricao: mov.descricao,
        valor_bruto: mov.valor_bruto,
        data_vencimento: mov.data_vencimento
      }))} onConfirm={handleBaixaLoteConfirm} />

      <BaixaIndividualDialog open={baixaIndividualDialogOpen} onOpenChange={setBaixaIndividualDialogOpen} movimento={movimentoBaixa} contas={contas} formasPagamento={formasPagamento} onConfirm={handleBaixaIndividualConfirm} />

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
            <AlertDialogAction onClick={handleEstornoConfirm} disabled={estornando} className="bg-orange-500 hover:bg-orange-600">
              {estornando ? "Estornando..." : "Estornar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GerarFaturaDialog open={faturaDialogOpen} onOpenChange={setFaturaDialogOpen} onSuccess={fetchMovimentos} />
    </div>
  );
};

export default FinanceiroPagar;
