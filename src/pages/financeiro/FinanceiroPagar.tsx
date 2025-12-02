import { useState, useEffect } from "react";
import { format, isPast, isToday } from "date-fns";
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
  ArrowDownCircle,
  Search,
  Pencil,
  Trash2,
  Loader2,
  CalendarIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";

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
  vx_fin_conta: { banco: string; descricao: string | null } | null;
  vx_fin_categoria: { categoria: string } | null;
}

const FinanceiroPagar = () => {
  const { toast } = useToast();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movimentoToDelete, setMovimentoToDelete] = useState<Movimento | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        .eq("tipo_movimento", "pagar")
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

  useEffect(() => {
    fetchMovimentos();
  }, []);

  const handleEdit = (movimento: Movimento) => {
    setSelectedMovimento(movimento);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedMovimento(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (movimento: Movimento) => {
    setMovimentoToDelete(movimento);
    setDeleteDialogOpen(true);
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

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const vencimentoDate = new Date(dataVencimento + "T00:00:00");
    const isVencido = isPast(vencimentoDate) && !isToday(vencimentoDate) && status === "Pendente";

    if (isVencido) {
      return <Badge variant="destructive">Vencido</Badge>;
    }

    switch (status) {
      case "Pago":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pago</Badge>;
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

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie despesas e pagamentos"
        action={
          <Button className="bg-accent hover:bg-accent/90" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
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
            icon={ArrowDownCircle}
            title="Nenhuma conta a pagar"
            description="Não há despesas ou pagamentos cadastrados no momento."
          />
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
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

              {dateFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDateFilter(undefined)}
                  className="h-10 w-10"
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
                          {mov.descricao}
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
        defaultTipo="pagar"
        onSuccess={fetchMovimentos}
      />

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
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceiroPagar;
