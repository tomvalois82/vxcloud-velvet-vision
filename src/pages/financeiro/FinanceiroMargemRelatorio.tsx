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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Percent,
  FileText,
  RefreshCw,
  Users,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VendaAnalitica {
  id: string;
  data_venda: string;
  veiculo: {
    id: number;
    placa: string | null;
    fabricante: string | null;
    modelo: string | null;
    ano: string | null;
    cor: string | null;
    tipo_aquisicao: string;
  };
  cliente: {
    nome: string;
  };
  vendedor: {
    nome: string;
  } | null;
  valor_venda: number;
  valor_compra: number;
  custos_veiculo: number;
  produtos_servicos: number;
  receitas_veiculo: number;
  retornos_financiamento: number;
  margem: number;
  margem_percentual: number;
}

interface ResumoSintetico {
  totalNegociacoes: number;
  // Receitas
  vendasProprios: number;
  vendasConsignados: number;
  intermediacoes: number;
  produtosServicos: number;
  receitasVeiculos: number;
  retornosFinanciamentos: number;
  totalReceitas: number;
  // Despesas
  compras: number;
  fechamentosConsignacao: number;
  comissoes: number;
  despesasVeiculo: number;
  posVenda: number;
  totalDespesas: number;
  // Margem
  margem: number;
  margemPercentual: number;
}

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

const FinanceiroMargemRelatorio = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<"sintetico" | "analitico">("sintetico");
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [ano, setAno] = useState(currentYear.toString());
  const [vendedorId, setVendedorId] = useState<string>("todos");
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  
  const [vendasAnaliticas, setVendasAnaliticas] = useState<VendaAnalitica[]>([]);
  const [resumoSintetico, setResumoSintetico] = useState<ResumoSintetico | null>(null);

  // Fetch vendedores (colaboradores)
  useEffect(() => {
    const fetchVendedores = async () => {
      const { data } = await supabase
        .from("vx_pessoa")
        .select("id, nome")
        .eq("eh_colaborador", true)
        .order("nome");
      
      if (data) {
        setVendedores(data);
      }
    };
    fetchVendedores();
  }, []);

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const startDate = `${ano}-${mes}-01`;
      const endDate = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split("T")[0];

      // Fetch sales in the period
      let vendasQuery = supabase
        .from("vx_vendas")
        .select(`
          id,
          data_venda,
          valor_total_venda,
          id_veiculo_vendido,
          id_cliente,
          id_vendedor,
          fechada,
          cliente:vx_pessoa!vx_vendas_id_cliente_fkey(id, nome),
          vendedor:vx_pessoa!vx_vendas_id_vendedor_fkey(id, nome)
        `)
        .gte("data_venda", startDate)
        .lte("data_venda", `${endDate}T23:59:59`)
        .eq("fechada", true);

      if (vendedorId !== "todos") {
        vendasQuery = vendasQuery.eq("id_vendedor", vendedorId);
      }

      const { data: vendas, error: vendasError } = await vendasQuery;
      if (vendasError) throw vendasError;

      if (!vendas || vendas.length === 0) {
        setVendasAnaliticas([]);
        setResumoSintetico(null);
        setLoading(false);
        return;
      }

      const veiculoIds = vendas.map((v) => v.id_veiculo_vendido);
      const vendaIds = vendas.map((v) => v.id);

      // Fetch vehicles data
      const { data: veiculos } = await supabase
        .from("estoque")
        .select("id, placa, fabricante, modelo, ano, cor, tipo_aquisicao, valor_aquisicao")
        .in("id", veiculoIds);

      // Fetch financial movements for vehicles (costs)
      const { data: movimentosVeiculos } = await supabase
        .from("vx_fin_movimento")
        .select("id_estoque, tipo_movimento, valor_bruto")
        .in("id_estoque", veiculoIds);

      // Fetch products/services for sales
      const { data: servicosProdutos } = await supabase
        .from("vx_vendas_servico_produto")
        .select("id_venda, valor")
        .in("id_venda", vendaIds);

      // Fetch financing for sales (for retornos)
      const { data: financiamentos } = await supabase
        .from("vx_vendas_financiamento")
        .select("id_venda, valor, tac, plus")
        .in("id_venda", vendaIds);

      // Build vehicles map
      const veiculosMap = new Map(veiculos?.map((v) => [v.id, v]) || []);

      // Calculate costs per vehicle
      const custosVeiculoMap = new Map<number, { receitas: number; despesas: number }>();
      (movimentosVeiculos || []).forEach((mov) => {
        if (!mov.id_estoque) return;
        const atual = custosVeiculoMap.get(mov.id_estoque) || { receitas: 0, despesas: 0 };
        if (mov.tipo_movimento === "Receber") {
          atual.receitas += Number(mov.valor_bruto) || 0;
        } else if (mov.tipo_movimento === "Pagar") {
          atual.despesas += Number(mov.valor_bruto) || 0;
        }
        custosVeiculoMap.set(mov.id_estoque, atual);
      });

      // Calculate products/services per sale
      const servicosMap = new Map<string, number>();
      (servicosProdutos || []).forEach((sp) => {
        const atual = servicosMap.get(sp.id_venda) || 0;
        servicosMap.set(sp.id_venda, atual + Number(sp.valor));
      });

      // Calculate financing returns per sale (TAC + Plus)
      const retornosMap = new Map<string, number>();
      (financiamentos || []).forEach((fin) => {
        const retorno = (Number(fin.tac) || 0) + (Number(fin.plus) || 0);
        retornosMap.set(fin.id_venda, retorno);
      });

      // Build analytical data
      const analiticas: VendaAnalitica[] = vendas.map((venda) => {
        const veiculo = veiculosMap.get(venda.id_veiculo_vendido);
        const custosVeiculo = custosVeiculoMap.get(venda.id_veiculo_vendido) || { receitas: 0, despesas: 0 };
        const valorVenda = Number(venda.valor_total_venda) || 0;
        const valorCompra = Number(veiculo?.valor_aquisicao) || 0;
        const custos = custosVeiculo.despesas;
        const receitasVeiculo = custosVeiculo.receitas;
        const produtosServicos = servicosMap.get(venda.id) || 0;
        const retornosFinanciamento = retornosMap.get(venda.id) || 0;
        
        const totalReceitas = valorVenda + produtosServicos + retornosFinanciamento + receitasVeiculo;
        const totalDespesas = valorCompra + custos;
        const margem = totalReceitas - totalDespesas;
        const margemPercentual = totalDespesas > 0 ? (margem / totalDespesas) * 100 : 0;

        return {
          id: venda.id,
          data_venda: venda.data_venda,
          veiculo: {
            id: venda.id_veiculo_vendido,
            placa: veiculo?.placa || null,
            fabricante: veiculo?.fabricante || null,
            modelo: veiculo?.modelo || null,
            ano: veiculo?.ano || null,
            cor: veiculo?.cor || null,
            tipo_aquisicao: veiculo?.tipo_aquisicao || "Próprio",
          },
          cliente: {
            nome: (venda.cliente as any)?.nome || "Cliente não identificado",
          },
          vendedor: venda.vendedor ? { nome: (venda.vendedor as any).nome } : null,
          valor_venda: valorVenda,
          valor_compra: valorCompra,
          custos_veiculo: custos,
          produtos_servicos: produtosServicos,
          receitas_veiculo: receitasVeiculo,
          retornos_financiamento: retornosFinanciamento,
          margem,
          margem_percentual: margemPercentual,
        };
      });

      setVendasAnaliticas(analiticas);

      // Build synthetic data
      const countProprios = analiticas.filter((v) => v.veiculo.tipo_aquisicao === "Próprio").length;
      const countConsignados = analiticas.filter((v) => v.veiculo.tipo_aquisicao === "Agenciado").length;
      
      const vendasProprios = analiticas
        .filter((v) => v.veiculo.tipo_aquisicao === "Próprio")
        .reduce((acc, v) => acc + v.valor_venda, 0);
      
      const vendasConsignados = analiticas
        .filter((v) => v.veiculo.tipo_aquisicao === "Agenciado")
        .reduce((acc, v) => acc + v.valor_venda, 0);
      
      const produtosServicos = analiticas.reduce((acc, v) => acc + v.produtos_servicos, 0);
      const receitasVeiculos = analiticas.reduce((acc, v) => acc + v.receitas_veiculo, 0);
      const retornosFinanciamentos = analiticas.reduce((acc, v) => acc + v.retornos_financiamento, 0);
      
      const compras = analiticas.reduce((acc, v) => acc + v.valor_compra, 0);
      const despesasVeiculo = analiticas.reduce((acc, v) => acc + v.custos_veiculo, 0);
      
      const totalReceitas = vendasProprios + vendasConsignados + produtosServicos + receitasVeiculos + retornosFinanciamentos;
      const totalDespesas = compras + despesasVeiculo;
      const margem = totalReceitas - totalDespesas;
      const margemPercentual = totalDespesas > 0 ? (margem / totalDespesas) * 100 : 0;

      setResumoSintetico({
        totalNegociacoes: analiticas.length,
        vendasProprios,
        vendasConsignados,
        intermediacoes: 0,
        produtosServicos,
        receitasVeiculos,
        retornosFinanciamentos,
        totalReceitas,
        compras,
        fechamentosConsignacao: 0,
        comissoes: 0,
        despesasVeiculo,
        posVenda: 0,
        totalDespesas,
        margem,
        margemPercentual,
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
  }, [mes, ano, vendedorId]);

  const getVeiculoDisplayName = (veiculo: VendaAnalitica["veiculo"]) => {
    const parts = [veiculo.tipo_aquisicao?.toUpperCase(), veiculo.placa, veiculo.fabricante, veiculo.modelo, veiculo.cor, veiculo.ano].filter(Boolean);
    return parts.join(" ") || "Veículo sem nome";
  };

  const mesLabel = meses.find((m) => m.value === mes)?.label || "";
  const vendedorLabel = vendedorId === "todos" 
    ? "Todos" 
    : vendedores.find((v) => v.id === vendedorId)?.nome || "";

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Relatório de Margem"
        description="Análise de lucratividade das vendas"
        action={
          <Button variant="outline" onClick={fetchRelatorio} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        }
      />

      {/* Filters */}
      <div className="glass rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Mês</label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Ano</label>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-[100px] bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Vendedor</label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Tipo</label>
            <Tabs value={tipoRelatorio} onValueChange={(v) => setTipoRelatorio(v as "sintetico" | "analitico")}>
              <TabsList className="bg-background/50">
                <TabsTrigger value="sintetico" className="data-[state=active]:bg-accent/20">
                  <FileText className="w-4 h-4 mr-2" />
                  Sintético
                </TabsTrigger>
                <TabsTrigger value="analitico" className="data-[state=active]:bg-accent/20">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analítico
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="ml-3 text-muted-foreground">Carregando relatório...</span>
        </div>
      ) : !resumoSintetico || vendasAnaliticas.length === 0 ? (
        <div className="glass rounded-lg p-8">
          <EmptyState
            icon={BarChart3}
            title="Nenhuma venda encontrada"
            description={`Não há vendas fechadas em ${mesLabel} de ${ano}${vendedorId !== "todos" ? ` para ${vendedorLabel}` : ""}.`}
          />
        </div>
      ) : (
        <>
          {/* Summary Header */}
          <div className="glass rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Referência: {mesLabel} {ano}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Vendedor: {vendedorLabel}
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2 self-start">
                {resumoSintetico.totalNegociacoes} Negociações
              </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border/50 bg-green-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Receitas</p>
                    <p className="text-xl font-bold text-green-400">
                      {maskCurrency(resumoSintetico.totalReceitas)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-red-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Despesas</p>
                    <p className="text-xl font-bold text-red-400">
                      {maskCurrency(resumoSintetico.totalDespesas)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "rounded-lg border border-border/50 p-4",
                resumoSintetico.margem >= 0 ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    resumoSintetico.margem >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    <Percent className={cn(
                      "w-5 h-5",
                      resumoSintetico.margem >= 0 ? "text-green-400" : "text-red-400"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Margem</p>
                    <p className={cn(
                      "text-xl font-bold",
                      resumoSintetico.margem >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {maskCurrency(resumoSintetico.margem)}{" "}
                      <span className="text-base">({resumoSintetico.margemPercentual.toFixed(0)}%)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content based on type */}
          {tipoRelatorio === "sintetico" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receitas */}
              <div className="glass rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-green-500/10">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Receitas
                  </h3>
                </div>
                <div className="p-4">
                  <Table>
                    <TableBody>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Vendas Próprios</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.vendasProprios)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Vendas Consignados</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.vendasConsignados)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Intermediações</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.intermediacoes)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Outros Produtos e Serviços</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.produtosServicos)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Receitas com Veículos</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.receitasVeiculos)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Retornos com Financiamentos</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.retornosFinanciamentos)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-t-2 border-green-500/30">
                        <TableCell className="font-semibold text-green-400">Total Receitas</TableCell>
                        <TableCell className="text-right font-bold text-green-400">
                          {maskCurrency(resumoSintetico.totalReceitas)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Despesas */}
              <div className="glass rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-red-500/10">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    Despesas
                  </h3>
                </div>
                <div className="p-4">
                  <Table>
                    <TableBody>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Compras</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.compras)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Fechamentos Consignação</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.fechamentosConsignacao)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Comissões</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.comissoes)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Despesas Veículo</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.despesasVeiculo)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-border/50">
                        <TableCell className="text-muted-foreground">Pós Venda</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {maskCurrency(resumoSintetico.posVenda)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-t-2 border-red-500/30">
                        <TableCell className="font-semibold text-red-400">Total Despesas</TableCell>
                        <TableCell className="text-right font-bold text-red-400">
                          {maskCurrency(resumoSintetico.totalDespesas)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-foreground font-semibold">Veículo</TableHead>
                      <TableHead className="text-foreground font-semibold">Cliente</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Venda</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Prod./Serv.</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Retornos</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Receitas</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Compra</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Custos</TableHead>
                      <TableHead className="text-foreground font-semibold text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasAnaliticas.map((venda) => (
                      <TableRow key={venda.id} className="border-border/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {getVeiculoDisplayName(venda.veiculo)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {venda.cliente.nome}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {maskCurrency(venda.valor_venda)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {maskCurrency(venda.produtos_servicos)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {maskCurrency(venda.retornos_financiamento)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {maskCurrency(venda.receitas_veiculo)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-red-400">
                          {maskCurrency(venda.valor_compra)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-red-400">
                          {maskCurrency(venda.custos_veiculo)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold text-sm",
                          venda.margem >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          <div>
                            <p>{maskCurrency(venda.margem)}</p>
                            <p className="text-xs font-normal">
                              {venda.margem_percentual.toFixed(0)}%
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 border-accent/30 bg-accent/5">
                      <TableCell colSpan={2} className="font-bold text-foreground">
                        TOTAL ({vendasAnaliticas.length} vendas)
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.valor_venda, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-muted-foreground">
                        {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.produtos_servicos, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-muted-foreground">
                        {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.retornos_financiamento, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-muted-foreground">
                        {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.receitas_veiculo, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-400">
                        {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.valor_compra, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-400">
                        {maskCurrency(vendasAnaliticas.reduce((acc, v) => acc + v.custos_veiculo, 0))}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        resumoSintetico.margem >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        <div>
                          <p>{maskCurrency(resumoSintetico.margem)}</p>
                          <p className="text-xs font-normal">
                            {resumoSintetico.margemPercentual.toFixed(0)}%
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinanceiroMargemRelatorio;
