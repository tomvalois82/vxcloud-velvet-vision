import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { Trash2, FileText, Car, Receipt } from "lucide-react";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";

interface InvestidorCarteira {
  id_pessoa: string;
  nome: string;
  alocado: number;
  carteira: number;
  total: number;
}

interface LancamentoCarteira {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  id_estoque: number | null;
  veiculo_info?: string;
}

interface Veiculo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
}

interface CarteiraDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investidor: InvestidorCarteira | null;
  onDeleted?: () => void;
  isSuperUser?: boolean;
}

export function CarteiraDetailDialog({
  open,
  onOpenChange,
  investidor,
  onDeleted,
  isSuperUser = false,
}: CarteiraDetailDialogProps) {
  const { toast } = useToast();
  const [lancamentos, setLancamentos] = useState<LancamentoCarteira[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lancamentoToDelete, setLancamentoToDelete] = useState<LancamentoCarteira | null>(null);
  
  // Estado para gerar título financeiro
  const [movimentoDialogOpen, setMovimentoDialogOpen] = useState(false);
  const [movimentoDefaultTipo, setMovimentoDefaultTipo] = useState<"Pagar" | "Receber">("Pagar");
  const [movimentoDefaultValor, setMovimentoDefaultValor] = useState(0);
  const [movimentoDefaultPessoaId, setMovimentoDefaultPessoaId] = useState<string | null>(null);

  // Filtros
  const [dataInicial, setDataInicial] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dataFinal, setDataFinal] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [veiculoFiltro, setVeiculoFiltro] = useState<string>("todos");

  const fetchVeiculos = useCallback(async () => {
    if (!investidor) return;

    const { data } = await supabase
      .from("vx_investimento_carteira")
      .select("id_estoque")
      .eq("id_pessoa", investidor.id_pessoa)
      .not("id_estoque", "is", null);

    if (data && data.length > 0) {
      const estoqueIds = [...new Set(data.map((d) => d.id_estoque).filter(Boolean))];
      
      if (estoqueIds.length > 0) {
        const { data: veiculosData } = await supabase
          .from("estoque")
          .select("id, fabricante, modelo, placa")
          .in("id", estoqueIds as number[]);

        setVeiculos(veiculosData || []);
      }
    }
  }, [investidor]);

  const fetchLancamentos = useCallback(async () => {
    if (!investidor) return;

    try {
      setLoading(true);

      let query = supabase
        .from("vx_investimento_carteira")
        .select("id, data, descricao, valor, id_estoque")
        .eq("id_pessoa", investidor.id_pessoa)
        .gte("data", dataInicial)
        .lte("data", dataFinal)
        .order("data", { ascending: false });

      if (veiculoFiltro !== "todos") {
        query = query.eq("id_estoque", parseInt(veiculoFiltro));
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar info dos veículos
      const estoqueIds = [...new Set((data || []).map((d) => d.id_estoque).filter(Boolean))];
      let veiculosMap: Record<number, string> = {};

      if (estoqueIds.length > 0) {
        const { data: veiculosData } = await supabase
          .from("estoque")
          .select("id, fabricante, modelo, placa")
          .in("id", estoqueIds as number[]);

        if (veiculosData) {
          veiculosMap = veiculosData.reduce((acc, v) => {
            acc[v.id] = `${v.fabricante || ""} ${v.modelo || ""} (${v.placa || "S/P"})`.trim();
            return acc;
          }, {} as Record<number, string>);
        }
      }

      setLancamentos(
        (data || []).map((item) => ({
          id: item.id,
          data: item.data,
          descricao: item.descricao || "",
          valor: Number(item.valor) || 0,
          id_estoque: item.id_estoque,
          veiculo_info: item.id_estoque ? veiculosMap[item.id_estoque] : undefined,
        }))
      );
    } catch (error) {
      console.error("Erro ao buscar lançamentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lançamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [investidor, dataInicial, dataFinal, veiculoFiltro, toast]);

  useEffect(() => {
    if (open && investidor) {
      fetchVeiculos();
      fetchLancamentos();

      // Realtime subscription para atualizações automáticas
      const channel = supabase
        .channel(`carteira-detail-${investidor.id_pessoa}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vx_investimento_carteira', filter: `id_pessoa=eq.${investidor.id_pessoa}` },
          fetchLancamentos
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vx_investimento', filter: `id_pessoa=eq.${investidor.id_pessoa}` },
          () => {
            fetchLancamentos();
            onDeleted?.();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, investidor, fetchVeiculos, fetchLancamentos, onDeleted]);

  const handleDelete = async () => {
    if (!lancamentoToDelete) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("vx_investimento_carteira")
        .delete()
        .eq("id", lancamentoToDelete.id);

      if (error) throw error;

      toast({
        title: "Lançamento excluído",
        description: "O lançamento foi removido com sucesso.",
      });

      fetchLancamentos();
      onDeleted?.();
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lançamento.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setLancamentoToDelete(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const saldoPeriodo = lancamentos.reduce((acc, l) => acc + l.valor, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extrato da Carteira - {investidor?.nome}
            </DialogTitle>
          </DialogHeader>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 py-4 border-b">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Alocado</p>
              <p className="text-lg font-semibold text-amber-600">
                {formatCurrency(investidor?.alocado || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Saldo em Carteira</p>
              <p className={`text-lg font-semibold ${(investidor?.carteira || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(investidor?.carteira || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">
                {formatCurrency(investidor?.total || 0)}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={veiculoFiltro} onValueChange={setVeiculoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.fabricante} {v.modelo} ({v.placa || "S/P"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Saldo do período */}
          <div className="flex justify-between items-center py-2 px-4 bg-muted rounded-md">
            <span className="text-sm font-medium">Saldo no período:</span>
            <span className={`font-semibold ${saldoPeriodo >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(saldoPeriodo)}
            </span>
          </div>

          {/* Tabela de lançamentos */}
          <div className="flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : lancamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        icon={Car}
                        title="Nenhum lançamento encontrado"
                        description="Não há lançamentos para o período selecionado."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentos.map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell className="text-sm">
                        {formatDate(lancamento.data)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lancamento.descricao}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lancamento.veiculo_info || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            lancamento.valor >= 0
                              ? "text-green-600"
                              : "text-destructive"
                          }
                        >
                          {formatCurrency(lancamento.valor)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSuperUser && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:text-primary"
                              onClick={() => {
                                // Valor positivo = Pagar, negativo = Receber
                                const tipo = lancamento.valor >= 0 ? "Pagar" : "Receber";
                                setMovimentoDefaultTipo(tipo);
                                setMovimentoDefaultValor(Math.abs(lancamento.valor));
                                setMovimentoDefaultPessoaId(investidor?.id_pessoa || null);
                                setMovimentoDialogOpen(true);
                              }}
                              title="Gerar Título Financeiro"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                setLancamentoToDelete(lancamento);
                                setDeleteDialogOpen(true);
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir este lançamento?
              <br />
              <strong>{lancamentoToDelete?.descricao}</strong>
              <br />
              <span className={lancamentoToDelete?.valor && lancamentoToDelete.valor >= 0 ? "text-green-600" : "text-destructive"}>
                {lancamentoToDelete && formatCurrency(lancamentoToDelete.valor)}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para lançamento de título financeiro */}
      <MovimentoDialog
        open={movimentoDialogOpen}
        onOpenChange={setMovimentoDialogOpen}
        defaultTipo={movimentoDefaultTipo}
        defaultValor={movimentoDefaultValor}
        defaultPessoaId={movimentoDefaultPessoaId}
        onSuccess={() => {
          setMovimentoDialogOpen(false);
        }}
      />
    </>
  );
}
