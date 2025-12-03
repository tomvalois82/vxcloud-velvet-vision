import { useState, useEffect, useMemo } from "react";
import { format, isPast, isToday, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";
import { RecorrenciaActionDialog } from "@/features/financeiro/components/RecorrenciaActionDialog";

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
  observacoes: string | null;
  status: string;
  id_estoque: number | null;
  competencia: string | null;
  recorrencia_id: string | null;
  ordem_ocorrencia: number | null;
  total_ocorrencias: number | null;
  vx_fin_conta: { banco: string; descricao: string | null } | null;
  vx_fin_categoria: { categoria: string } | null;
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
  }, []);

  const handleEdit = (movimento: Movimento) => {
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas a Receber"
        description="Gerencie recebimentos e cobranças"
        action={
          <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
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
                    <TableHead className="text-foreground font-semibold">Descrição</TableHead>
                    <TableHead className="text-foreground font-semibold">Valor</TableHead>
                    <TableHead className="text-foreground font-semibold">Vencimento</TableHead>
                    <TableHead className="text-foreground font-semibold">Conta</TableHead>
                    <TableHead className="text-foreground font-semibold">Categoria</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovimentos.map((mov) => (
                      <TableRow
                        key={mov.id}
                        className={cn(
                          "border-border/50",
                          isRowVencido(mov.status, mov.data_vencimento) && "bg-destructive/10"
                        )}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
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
                          {getContaDisplayName(mov)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mov.vx_fin_categoria?.categoria || "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(mov.status, mov.data_vencimento)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-accent/20"
                              onClick={() => handleEdit(mov)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/20 text-destructive"
                              onClick={() => handleDeleteClick(mov)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
    </div>
  );
};

export default FinanceiroReceber;
