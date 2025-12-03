import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
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
  BarChart3,
  Loader2,
  Car,
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";

interface VeiculoRelatorio {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  ano: string | null;
  status: string | null;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
}

interface ResumoGeral {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  veiculosComMovimento: number;
}

const FinanceiroRelatorios = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [veiculosRelatorio, setVeiculosRelatorio] = useState<VeiculoRelatorio[]>([]);
  const [resumo, setResumo] = useState<ResumoGeral>({
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    veiculosComMovimento: 0,
  });
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [ordenacao, setOrdenacao] = useState<string>("saldo-desc");

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      // Fetch all vehicles
      const { data: veiculos, error: veiculosError } = await supabase
        .from("estoque")
        .select("id, fabricante, modelo, placa, ano, status")
        .order("fabricante")
        .order("modelo");

      if (veiculosError) throw veiculosError;

      // Fetch all financial movements linked to vehicles
      const { data: movimentos, error: movimentosError } = await supabase
        .from("vx_fin_movimento")
        .select("id_estoque, tipo_movimento, valor_bruto, status")
        .not("id_estoque", "is", null);

      if (movimentosError) throw movimentosError;

      // Group movements by vehicle
      const movimentosPorVeiculo = new Map<number, { receitas: number; despesas: number }>();
      
      (movimentos || []).forEach((mov) => {
        if (!mov.id_estoque) return;
        
        const atual = movimentosPorVeiculo.get(mov.id_estoque) || { receitas: 0, despesas: 0 };
        
        if (mov.tipo_movimento === "Receber") {
          atual.receitas += Number(mov.valor_bruto) || 0;
        } else if (mov.tipo_movimento === "Pagar") {
          atual.despesas += Number(mov.valor_bruto) || 0;
        }
        
        movimentosPorVeiculo.set(mov.id_estoque, atual);
      });

      // Build report data
      const relatorio: VeiculoRelatorio[] = (veiculos || [])
        .filter((v) => movimentosPorVeiculo.has(v.id))
        .map((v) => {
          const mov = movimentosPorVeiculo.get(v.id)!;
          return {
            id: v.id,
            fabricante: v.fabricante,
            modelo: v.modelo,
            placa: v.placa,
            ano: v.ano,
            status: v.status,
            totalReceitas: mov.receitas,
            totalDespesas: mov.despesas,
            saldo: mov.receitas - mov.despesas,
          };
        });

      // Calculate summary
      const totalReceitas = relatorio.reduce((acc, v) => acc + v.totalReceitas, 0);
      const totalDespesas = relatorio.reduce((acc, v) => acc + v.totalDespesas, 0);

      setVeiculosRelatorio(relatorio);
      setResumo({
        totalReceitas,
        totalDespesas,
        saldo: totalReceitas - totalDespesas,
        veiculosComMovimento: relatorio.length,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, []);

  const getVeiculoDisplayName = (veiculo: VeiculoRelatorio) => {
    const parts = [veiculo.fabricante, veiculo.modelo, veiculo.ano].filter(Boolean);
    return parts.join(" ") || "Veículo sem nome";
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Vendido":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Vendido</Badge>;
      case "Reservado":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Reservado</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Em estoque</Badge>;
    }
  };

  // Filter and sort
  const veiculosFiltrados = veiculosRelatorio
    .filter((v) => {
      if (filtroStatus === "todos") return true;
      if (filtroStatus === "estoque") return v.status !== "Vendido";
      if (filtroStatus === "vendido") return v.status === "Vendido";
      if (filtroStatus === "positivo") return v.saldo > 0;
      if (filtroStatus === "negativo") return v.saldo < 0;
      return true;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case "saldo-desc":
          return b.saldo - a.saldo;
        case "saldo-asc":
          return a.saldo - b.saldo;
        case "receitas-desc":
          return b.totalReceitas - a.totalReceitas;
        case "despesas-desc":
          return b.totalDespesas - a.totalDespesas;
        case "nome-asc":
          return getVeiculoDisplayName(a).localeCompare(getVeiculoDisplayName(b));
        default:
          return 0;
      }
    });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatórios Financeiros"
        description="Análise de receitas e despesas por veículo"
        action={
          <Button variant="outline" onClick={fetchRelatorio} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Receitas</p>
              <p className="text-lg font-semibold text-green-400">
                {maskCurrency(resumo.totalReceitas)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Despesas</p>
              <p className="text-lg font-semibold text-red-400">
                {maskCurrency(resumo.totalDespesas)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              resumo.saldo >= 0 ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              <Wallet className={cn(
                "w-5 h-5",
                resumo.saldo >= 0 ? "text-green-400" : "text-red-400"
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Geral</p>
              <p className={cn(
                "text-lg font-semibold",
                resumo.saldo >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {maskCurrency(resumo.saldo)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Car className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Veículos c/ Movimento</p>
              <p className="text-lg font-semibold text-foreground">
                {resumo.veiculosComMovimento}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-lg p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-muted-foreground">Carregando relatório...</span>
          </div>
        ) : veiculosRelatorio.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Nenhum dado disponível"
            description="Não há movimentações financeiras vinculadas a veículos."
          />
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os veículos</SelectItem>
                  <SelectItem value="estoque">Em estoque</SelectItem>
                  <SelectItem value="vendido">Vendidos</SelectItem>
                  <SelectItem value="positivo">Saldo positivo</SelectItem>
                  <SelectItem value="negativo">Saldo negativo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saldo-desc">Maior saldo</SelectItem>
                  <SelectItem value="saldo-asc">Menor saldo</SelectItem>
                  <SelectItem value="receitas-desc">Maior receita</SelectItem>
                  <SelectItem value="despesas-desc">Maior despesa</SelectItem>
                  <SelectItem value="nome-asc">Nome A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-foreground font-semibold">Veículo</TableHead>
                    <TableHead className="text-foreground font-semibold">Placa</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Receitas</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Despesas</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {veiculosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum veículo encontrado com os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    veiculosFiltrados.map((v) => (
                      <TableRow key={v.id} className="border-border/50">
                        <TableCell className="font-medium text-foreground">
                          {getVeiculoDisplayName(v)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {v.placa || "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(v.status)}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {maskCurrency(v.totalReceitas)}
                        </TableCell>
                        <TableCell className="text-right text-red-400">
                          {maskCurrency(v.totalDespesas)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold",
                          v.saldo >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {maskCurrency(v.saldo)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary footer */}
            <div className="flex justify-end pt-4 border-t border-border/50">
              <div className="text-sm text-muted-foreground">
                Exibindo <span className="text-foreground font-medium">{veiculosFiltrados.length}</span> de{" "}
                <span className="text-foreground font-medium">{veiculosRelatorio.length}</span> veículos
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceiroRelatorios;
