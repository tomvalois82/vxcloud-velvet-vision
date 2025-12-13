import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SalesReportPrint from "@/features/vendas/components/SalesReportPrint";

interface Empresa {
  nome_fantasia: string;
  foto_url: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  cep: string;
  telefone: string | null;
  site: string | null;
}

interface Colaborador {
  id: string;
  nome: string;
}

interface SaleReportItem {
  id: string;
  data_venda: string;
  valor_total_venda: number;
  cliente_nome: string;
  cliente_telefone: string | null;
  vendedor_nome: string | null;
  veiculo_modelo: string | null;
  veiculo_motor: string | null;
  veiculo_cambio: string | null;
  veiculo_ano: string | null;
  financiado_valor: number;
  financeira_nome: string | null;
  servicos_produtos_valor: number;
}

const VendasRelatorios = () => {
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [vendedorId, setVendedorId] = useState<string>("all");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sales, setSales] = useState<SaleReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio_Vendas_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  useEffect(() => {
    loadColaboradores();
    loadEmpresa();
  }, []);

  const loadColaboradores = async () => {
    const { data } = await supabase
      .from("vx_pessoa")
      .select("id, nome")
      .eq("eh_colaborador", true)
      .order("nome");
    setColaboradores(data || []);
  };

  const loadEmpresa = async () => {
    const { data } = await supabase
      .from("empresa")
      .select(
        "nome_fantasia, foto_url, logradouro, numero, complemento, bairro, municipio, estado, cep, telefone, site"
      )
      .limit(1)
      .single();
    setEmpresa(data);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("vx_vendas")
        .select(
          `
          id,
          data_venda,
          valor_total_venda,
          id_cliente,
          id_vendedor,
          id_veiculo_vendido
        `
        )
        .eq("fechada", true)
        .order("data_venda", { ascending: true });

      if (dataInicio) {
        query = query.gte("data_venda", dataInicio.toISOString());
      }
      if (dataFim) {
        const endDate = new Date(dataFim);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("data_venda", endDate.toISOString());
      }
      if (vendedorId && vendedorId !== "all") {
        query = query.eq("id_vendedor", vendedorId);
      }

      const { data: vendasData, error } = await query;

      if (error) throw error;

      if (!vendasData || vendasData.length === 0) {
        toast({
          title: "Nenhuma venda encontrada",
          description: "Não há vendas fechadas no período selecionado.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Buscar dados relacionados
      const salesReport: SaleReportItem[] = await Promise.all(
        vendasData.map(async (venda) => {
          // Cliente
          const { data: clienteData } = await supabase
            .from("vx_pessoa")
            .select("nome, telefone")
            .eq("id", venda.id_cliente)
            .single();

          // Vendedor
          let vendedorNome: string | null = null;
          if (venda.id_vendedor) {
            const { data: vendedorData } = await supabase
              .from("vx_pessoa")
              .select("nome")
              .eq("id", venda.id_vendedor)
              .single();
            vendedorNome = vendedorData?.nome || null;
          }

          // Veículo
          const { data: veiculoData } = await supabase
            .from("estoque")
            .select("modelo, motor, cambio, ano")
            .eq("id", venda.id_veiculo_vendido)
            .single();

          // Financiamento
          const { data: financiamentoData } = await supabase
            .from("vx_vendas_financiamento")
            .select("valor, id_financeira")
            .eq("id_venda", venda.id)
            .maybeSingle();

          let financeiraNome: string | null = null;
          if (financiamentoData?.id_financeira) {
            const { data: financeiraData } = await supabase
              .from("vx_financeiras")
              .select("nome")
              .eq("id", financiamentoData.id_financeira)
              .single();
            financeiraNome = financeiraData?.nome || null;
          }

          // Produtos/Serviços
          const { data: servicosData } = await supabase
            .from("vx_vendas_servico_produto")
            .select("valor")
            .eq("id_venda", venda.id);

          const totalServicos = (servicosData || []).reduce(
            (sum, s) => sum + Number(s.valor),
            0
          );

          return {
            id: venda.id,
            data_venda: venda.data_venda,
            valor_total_venda: Number(venda.valor_total_venda),
            cliente_nome: clienteData?.nome || "Cliente não encontrado",
            cliente_telefone: clienteData?.telefone || null,
            vendedor_nome: vendedorNome,
            veiculo_modelo: veiculoData?.modelo || null,
            veiculo_motor: veiculoData?.motor || null,
            veiculo_cambio: veiculoData?.cambio || null,
            veiculo_ano: veiculoData?.ano || null,
            financiado_valor: financiamentoData?.valor
              ? Number(financiamentoData.valor)
              : 0,
            financeira_nome: financeiraNome,
            servicos_produtos_valor: totalServicos,
          };
        })
      );

      setSales(salesReport);

      // Aguardar renderização e abrir impressão
      setTimeout(() => {
        handlePrint();
      }, 100);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar relatório de vendas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const vendedorFiltroNome =
    vendedorId && vendedorId !== "all"
      ? colaboradores.find((c) => c.id === vendedorId)?.nome || null
      : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatórios de Vendas"
        description="Gere relatórios de vendas por período e vendedor"
      />

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Data Inicial */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio
                      ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Final */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim
                      ? format(dataFim, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Vendedor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendedor</label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {colaboradores.map((colab) => (
                    <SelectItem key={colab.id} value={colab.id}>
                      {colab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Componente de Impressão (oculto) */}
      <div className="hidden">
        <SalesReportPrint
          ref={printRef}
          sales={sales}
          empresa={empresa}
          dataInicio={dataInicio || null}
          dataFim={dataFim || null}
          vendedorFiltro={vendedorFiltroNome}
        />
      </div>
    </div>
  );
};

export default VendasRelatorios;
