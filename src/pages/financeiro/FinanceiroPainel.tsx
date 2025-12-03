import { useState, useEffect, useCallback, useRef } from "react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Filter,
  Printer,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  Banknote,
  PiggyBank,
  CreditCard,
  Edit,
  Trash2,
  Eye,
  Loader2
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  banco: string;
  descricao: string | null;
}

interface Categoria {
  id: string;
  categoria: string;
  operacao: string;
}

interface Pessoa {
  id: string;
  nome: string;
}

interface Veiculo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  status: string | null;
}

interface Movimento {
  id: string;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  tipo_movimento: string;
  competencia: string | null;
  id_conta: string;
  id_categoria: string;
  id_pessoa: string | null;
  id_estoque: number | null;
  id_empresa: string;
  id_forma_pagamento: string | null;
  observacoes: string | null;
  recorrencia_id: string | null;
  ordem_ocorrencia: number | null;
  total_ocorrencias: number | null;
  desconto: number | null;
  acrescimo: number | null;
  motivo_ajuste: string | null;
  conta?: Conta;
  categoria?: Categoria;
  pessoa?: Pessoa;
  veiculo?: Veiculo;
}

interface Filters {
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  competencia: string;
  status: string;
  idEstoque: string;
  idPessoa: string;
  idCategoria: string;
  busca: string;
}

const ITEMS_PER_PAGE = 30;

// Função para gerar opções de competência
function gerarOpcoesCompetencia(): { label: string; value: string }[] {
  const opcoes: { label: string; value: string }[] = [];
  const hoje = new Date();
  const anoInicio = 2019;
  const anoFim = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  for (let ano = anoFim; ano >= anoInicio; ano--) {
    const mesLimite = ano === anoFim ? mesAtual : 12;
    for (let mes = mesLimite; mes >= 1; mes--) {
      const valor = `${String(mes).padStart(2, "0")}/${ano}`;
      opcoes.push({ label: valor, value: valor });
    }
  }
  return opcoes;
}

// Ícones para cada tipo de conta
function getContaIcon(banco: string) {
  const bancoLower = banco.toLowerCase();
  if (bancoLower.includes("caixa") && !bancoLower.includes("econômica")) {
    return PiggyBank;
  }
  if (bancoLower.includes("carteira") || bancoLower.includes("cofre")) {
    return Banknote;
  }
  if (bancoLower.includes("cartão") || bancoLower.includes("cartao")) {
    return CreditCard;
  }
  return Building2;
}

export default function FinanceiroPainel() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movimentoToDelete, setMovimentoToDelete] = useState<Movimento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Summary values
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [saldoGeral, setSaldoGeral] = useState(0);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    dataInicio: startOfMonth(new Date()),
    dataFim: endOfMonth(new Date()),
    competencia: "__all__",
    status: "todos",
    idEstoque: "__all__",
    idPessoa: "__all__",
    idCategoria: "__all__",
    busca: "",
  });

  const listRef = useRef<HTMLDivElement>(null);
  const opcoesCompetencia = gerarOpcoesCompetencia();

  // Fetch contas (accounts)
  const fetchContas = async () => {
    const { data, error } = await supabase
      .from("vx_fin_conta")
      .select("*")
      .order("banco");
    if (!error && data) setContas(data);
  };

  // Fetch categorias
  const fetchCategorias = async () => {
    const { data, error } = await supabase
      .from("vx_fin_categoria")
      .select("*")
      .eq("ativo", true)
      .order("categoria");
    if (!error && data) setCategorias(data);
  };

  // Fetch pessoas
  const fetchPessoas = async () => {
    const { data, error } = await supabase
      .from("vx_pessoa")
      .select("id, nome")
      .order("nome");
    if (!error && data) setPessoas(data);
  };

  // Fetch veículos (estoque + vendidos nos últimos 3 meses)
  const fetchVeiculos = async () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data, error } = await supabase
      .from("estoque")
      .select("id, fabricante, modelo, placa, status")
      .or(`status.eq.Disponível,status.eq.Vendido`)
      .order("fabricante");
    
    if (!error && data) {
      setVeiculos(data);
    }
  };

  // Build query with filters
  const buildQuery = () => {
    let query = supabase
      .from("vx_fin_movimento")
      .select("*");

    if (filters.dataInicio) {
      query = query.gte("data_vencimento", format(filters.dataInicio, "yyyy-MM-dd"));
    }
    if (filters.dataFim) {
      query = query.lte("data_vencimento", format(filters.dataFim, "yyyy-MM-dd"));
    }
    if (filters.competencia && filters.competencia !== "__all__") {
      query = query.eq("competencia", filters.competencia);
    }
    if (filters.status && filters.status !== "todos") {
      if (filters.status === "vencido") {
        query = query.neq("status", "Pago").lt("data_vencimento", format(new Date(), "yyyy-MM-dd"));
      } else if (filters.status === "pago") {
        query = query.eq("status", "Pago");
      } else if (filters.status === "aberto") {
        query = query.neq("status", "Pago");
      }
    }
    if (filters.idEstoque && filters.idEstoque !== "__all__") {
      query = query.eq("id_estoque", parseInt(filters.idEstoque));
    }
    if (filters.idPessoa && filters.idPessoa !== "__all__") {
      query = query.eq("id_pessoa", filters.idPessoa);
    }
    if (filters.idCategoria && filters.idCategoria !== "__all__") {
      query = query.eq("id_categoria", filters.idCategoria);
    }
    if (filters.busca) {
      query = query.ilike("descricao", `%${filters.busca}%`);
    }

    return query;
  };

  // Fetch movimentos with pagination
  const fetchMovimentos = async (reset = false) => {
    const newOffset = reset ? 0 : offset;
    
    if (reset) {
      setLoading(true);
      setMovimentos([]);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const query = buildQuery()
        .order("data_vencimento", { ascending: false })
        .range(newOffset, newOffset + ITEMS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Enrich data with related info
      const enrichedData = await Promise.all(
        (data || []).map(async (mov) => {
          const conta = contas.find(c => c.id === mov.id_conta);
          const categoria = categorias.find(c => c.id === mov.id_categoria);
          const pessoa = pessoas.find(p => p.id === mov.id_pessoa);
          const veiculo = veiculos.find(v => v.id === mov.id_estoque);
          
          return {
            ...mov,
            conta,
            categoria,
            pessoa,
            veiculo,
          };
        })
      );

      if (reset) {
        setMovimentos(enrichedData);
      } else {
        setMovimentos(prev => [...prev, ...enrichedData]);
      }

      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
      setOffset(newOffset + ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Erro ao buscar movimentos:", error);
      toast.error("Erro ao carregar movimentações");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Calculate summary values
  const calculateSummary = async () => {
    try {
      // Fetch all filtered movements for summary
      const query = buildQuery();
      const { data, error } = await query;

      if (error) throw error;

      let entradas = 0;
      let saidas = 0;

      (data || []).forEach((mov) => {
        const valor = mov.status === "Pago" ? mov.valor_liquido : mov.valor_bruto;
        if (mov.tipo_movimento === "Receber") {
          entradas += valor;
        } else if (mov.tipo_movimento === "Pagar") {
          saidas += valor;
        }
      });

      setTotalEntradas(entradas);
      setTotalSaidas(saidas);

      // Calculate general balance from accounts
      // For simplicity, we'll calculate saldo as entradas - saidas since vx_fin_conta doesn't have saldo field
      setSaldoGeral(entradas - saidas);
    } catch (error) {
      console.error("Erro ao calcular resumo:", error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchContas(),
        fetchCategorias(),
        fetchPessoas(),
        fetchVeiculos(),
      ]);
    };
    loadInitialData();
  }, []);

  // Load movimentos when dependencies are ready
  useEffect(() => {
    if (contas.length > 0) {
      fetchMovimentos(true);
      calculateSummary();
    }
  }, [contas.length]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchMovimentos(false);
    }
  }, [loadingMore, hasMore, offset]);

  useEffect(() => {
    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
      return () => listElement.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Apply filters
  const handleApplyFilters = () => {
    setFiltersApplied(true);
    fetchMovimentos(true);
    calculateSummary();
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      dataInicio: startOfMonth(new Date()),
      dataFim: endOfMonth(new Date()),
      competencia: "__all__",
      status: "todos",
      idEstoque: "__all__",
      idPessoa: "__all__",
      idCategoria: "__all__",
      busca: "",
    });
    setFiltersApplied(false);
    setTimeout(() => {
      fetchMovimentos(true);
      calculateSummary();
    }, 0);
  };

  // Edit movimento
  const handleEdit = (movimento: Movimento) => {
    setSelectedMovimento(movimento);
    setDialogOpen(true);
  };

  // Delete movimento
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

      toast.success("Movimento excluído com sucesso!");
      fetchMovimentos(true);
      calculateSummary();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir movimento");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setMovimentoToDelete(null);
    }
  };

  // Print PDF
  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    const filterInfo = [];
    if (filters.dataInicio) filterInfo.push(`Data Início: ${format(filters.dataInicio, "dd/MM/yyyy")}`);
    if (filters.dataFim) filterInfo.push(`Data Fim: ${format(filters.dataFim, "dd/MM/yyyy")}`);
    if (filters.competencia) filterInfo.push(`Competência: ${filters.competencia}`);
    if (filters.status !== "todos") filterInfo.push(`Status: ${filters.status}`);
    if (filters.busca) filterInfo.push(`Busca: ${filters.busca}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro - VX Cloud</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #000; border-bottom: 2px solid #ee00ff; padding-bottom: 10px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; }
          .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; flex: 1; }
          .summary-card h3 { margin: 0 0 10px; font-size: 14px; color: #666; }
          .summary-card .value { font-size: 24px; font-weight: bold; }
          .entrada { color: #22c55e; }
          .saida { color: #ef4444; }
          .saldo { color: #ee00ff; }
          .filters { background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .row-entrada { background: rgba(34, 197, 94, 0.05); }
          .row-saida { background: rgba(239, 68, 68, 0.05); }
          .accounts { margin-top: 30px; }
          .accounts h2 { font-size: 16px; margin-bottom: 15px; }
          .account-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .account-card { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Relatório Financeiro</h1>
        <p>Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        
        ${filterInfo.length > 0 ? `<div class="filters"><strong>Filtros aplicados:</strong> ${filterInfo.join(" | ")}</div>` : ""}
        
        <div class="summary">
          <div class="summary-card">
            <h3>Total de Entradas</h3>
            <div class="value entrada">${maskCurrency(totalEntradas)}</div>
          </div>
          <div class="summary-card">
            <h3>Total de Saídas</h3>
            <div class="value saida">${maskCurrency(totalSaidas)}</div>
          </div>
          <div class="summary-card">
            <h3>Saldo</h3>
            <div class="value saldo">${maskCurrency(saldoGeral)}</div>
          </div>
        </div>

        <div class="accounts">
          <h2>Saldos por Conta</h2>
          <div class="account-grid">
            ${contas.map(conta => `
              <div class="account-card">
                <strong>${conta.banco}</strong>
                ${conta.descricao ? `<br><small>${conta.descricao}</small>` : ""}
              </div>
            `).join("")}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Conta</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${movimentos.map(mov => `
              <tr class="${mov.tipo_movimento === "Receber" ? "row-entrada" : "row-saida"}">
                <td>${format(parseISO(mov.data_vencimento), "dd/MM/yyyy")}</td>
                <td>${mov.descricao}</td>
                <td>${mov.categoria?.categoria || "-"}</td>
                <td>${mov.conta?.banco || "-"}</td>
                <td>${mov.status}</td>
                <td class="${mov.tipo_movimento === "Receber" ? "entrada" : "saida"}">
                  ${mov.tipo_movimento === "Receber" ? "+" : "-"} ${maskCurrency(mov.valor_bruto)}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Status badge
  const getStatusBadge = (movimento: Movimento) => {
    const hoje = new Date();
    const vencimento = parseISO(movimento.data_vencimento);
    
    if (movimento.status === "Pago") {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pago</Badge>;
    }
    if (vencimento < hoje) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
  };

  // Format conta display
  const getContaDisplayName = (conta?: Conta) => {
    if (!conta) return "-";
    return conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;
  };

  // Get vehicle display name
  const getVeiculoDisplayName = (veiculo?: Veiculo) => {
    if (!veiculo) return null;
    const parts = [veiculo.fabricante, veiculo.modelo].filter(Boolean);
    const name = parts.join(" ") || "Veículo";
    return veiculo.placa ? `${name} (${veiculo.placa})` : name;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Financeiro"
        description="Visão geral das movimentações financeiras"
        action={
          <Button onClick={handlePrintPDF} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-border/50 hover:border-green-500/50 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-green-400 font-medium">Entradas</span>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <span className="text-3xl font-bold text-green-400">
              {maskCurrency(totalEntradas)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Valor total de entradas</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:border-red-500/50 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-red-400 font-medium">Saídas</span>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <span className="text-3xl font-bold text-red-400">
              {maskCurrency(totalSaidas)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Valor total de saídas</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 hover:border-accent/50 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-accent font-medium">Saldo</span>
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-accent" />
              </div>
            </div>
            <span className={cn(
              "text-3xl font-bold",
              saldoGeral >= 0 ? "text-accent" : "text-red-400"
            )}>
              {maskCurrency(saldoGeral)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Saldo do período</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Balance Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Contas Bancárias</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contas.map((conta) => {
            const IconComponent = getContaIcon(conta.banco);
            return (
              <Card 
                key={conta.id} 
                className="glass border-border/50 hover:border-accent/30 transition-all group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <IconComponent className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{conta.banco}</h3>
                      {conta.descricao && (
                        <p className="text-xs text-muted-foreground truncate">{conta.descricao}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card className="glass border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-accent" />
                  <CardTitle className="text-base">Filtros Avançados</CardTitle>
                  {filtersApplied && (
                    <Badge variant="secondary" className="ml-2">Aplicados</Badge>
                  )}
                </div>
                {filtersOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Data Inicial */}
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dataInicio ? format(filters.dataInicio, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dataInicio}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dataInicio: date }))}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Final */}
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dataFim ? format(filters.dataFim, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dataFim}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dataFim: date }))}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Competência */}
                <div className="space-y-2">
                  <Label>Competência</Label>
                  <Select
                    value={filters.competencia}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, competencia: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {opcoesCompetencia.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Veículo */}
                <div className="space-y-2">
                  <Label>Veículo</Label>
                  <Select
                    value={filters.idEstoque}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, idEstoque: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {veiculos.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {getVeiculoDisplayName(v)}
                          {v.status === "Vendido" && " [Vendido]"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pessoa */}
                <div className="space-y-2">
                  <Label>Pessoa</Label>
                  <Select
                    value={filters.idPessoa}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, idPessoa: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {pessoas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={filters.idCategoria}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, idCategoria: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Busca */}
                <div className="space-y-2">
                  <Label>Buscar por descrição</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite para buscar..."
                      value={filters.busca}
                      onChange={(e) => setFilters(prev => ({ ...prev, busca: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                  <X className="w-4 h-4" />
                  Limpar Filtros
                </Button>
                <Button onClick={handleApplyFilters} className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrar
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Movements Table */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Movimentações Financeiras</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div 
            ref={listRef}
            className="max-h-[600px] overflow-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : movimentos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma movimentação encontrada
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Pessoa</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.map((mov) => (
                      <TableRow 
                        key={mov.id}
                        className={cn(
                          "hover:bg-muted/10 transition-colors",
                          mov.tipo_movimento === "Receber" 
                            ? "bg-green-500/5 hover:bg-green-500/10" 
                            : "bg-red-500/5 hover:bg-red-500/10"
                        )}
                      >
                        <TableCell className="font-medium">
                          {format(parseISO(mov.data_vencimento), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={mov.descricao}>
                            {mov.descricao}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(mov)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {mov.categoria?.categoria || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getContaDisplayName(mov.conta)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mov.pessoa?.nome || "-"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          mov.tipo_movimento === "Receber" ? "text-green-400" : "text-red-400"
                        )}>
                          {mov.tipo_movimento === "Receber" ? "+" : "-"} {maskCurrency(mov.valor_bruto)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(mov)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(mov)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}

                {!hasMore && movimentos.length > 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Fim da lista
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <MovimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        movimento={selectedMovimento as any}
        onSuccess={() => {
          fetchMovimentos(true);
          calculateSummary();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o movimento "{movimentoToDelete?.descricao}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
}
