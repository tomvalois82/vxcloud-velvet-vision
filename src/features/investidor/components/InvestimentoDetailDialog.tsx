import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Paperclip } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import { AnexosViewerDialog } from './AnexosViewerDialog';

interface Investimento {
  id: string;
  id_pessoa: string;
  id_estoque: number;
  percentual_investido: number;
  valor_investido: number;
  data_criacao: string;
  pessoa?: {
    nome: string;
  };
  veiculo?: {
    id: number;
    placa: string | null;
    modelo: string | null;
    motor: string | null;
    cambio: string | null;
    ano: string | null;
    cor: string | null;
    valor_aquisicao: number;
    valor: string | null;
    status: string | null;
    data_aquisicao: string | null;
  };
}

interface CustoItem {
  id: string;
  descricao: string;
  data_compra: string | null;
  valor_bruto: number;
  desconto: number;
  acrescimo: number;
  status: string;
  pessoa?: {
    nome: string;
  } | null;
  temAnexo?: boolean;
}

interface Empresa {
  nome_fantasia: string;
  razao_social: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  estado: string;
  cep: string;
  telefone: string | null;
  site: string | null;
  foto_url: string | null;
}

interface InvestimentoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investimento: Investimento | null;
}

export function InvestimentoDetailDialog({
  open,
  onOpenChange,
  investimento,
}: InvestimentoDetailDialogProps) {
  const [loading, setLoading] = useState(true);
  const [custos, setCustos] = useState<CustoItem[]>([]);
  const [venda, setVenda] = useState<{ valor_total_venda: number; data_venda: string } | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [anexosDialogOpen, setAnexosDialogOpen] = useState(false);
  const [selectedCusto, setSelectedCusto] = useState<CustoItem | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Investimento_${investimento?.pessoa?.nome || 'Relatorio'}`,
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const fetchData = useCallback(async () => {
    if (!investimento) return;

    setLoading(true);
    try {
      // Buscar custos do veículo
      const { data: custosData } = await supabase
        .from('vx_fin_movimento')
        .select(`
          id,
          descricao,
          data_compra,
          valor_bruto,
          desconto,
          acrescimo,
          status,
          pessoa:vx_pessoa(nome)
        `)
        .eq('id_estoque', investimento.id_estoque)
        .eq('tipo_movimento', 'Pagar')
        .order('data_compra', { ascending: false });

      // Buscar IDs de movimentos que possuem anexos
      const movimentoIds = (custosData || []).map(c => c.id);
      let anexosMap: Record<string, boolean> = {};
      
      if (movimentoIds.length > 0) {
        const { data: anexosData } = await supabase
          .from('vx_fin_anexo')
          .select('id_movimento')
          .in('id_movimento', movimentoIds);
        
        if (anexosData) {
          anexosData.forEach(a => {
            anexosMap[a.id_movimento] = true;
          });
        }
      }

      // Mapear custos com informação de anexo
      const custosComAnexo = (custosData || []).map(c => ({
        ...c,
        temAnexo: !!anexosMap[c.id]
      }));

      setCustos(custosComAnexo);

      // Buscar venda do veículo (se existir)
      const { data: vendaData } = await supabase
        .from('vx_vendas')
        .select('valor_total_venda, data_venda')
        .eq('id_veiculo_vendido', investimento.id_estoque)
        .maybeSingle();

      setVenda(vendaData);

      // Buscar dados da empresa
      const { data: empresaData } = await supabase
        .from('empresa')
        .select('nome_fantasia, razao_social, logradouro, numero, bairro, municipio, estado, cep, telefone, site, foto_url')
        .limit(1)
        .maybeSingle();

      setEmpresa(empresaData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [investimento]);

  useEffect(() => {
    if (open && investimento) {
      fetchData();
    }
  }, [open, investimento, fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Cálculos
  const totalCustos = custos.reduce((acc, mov) => {
    if (mov.status === 'Pago') {
      return acc + Number(mov.valor_bruto) - Number(mov.desconto || 0) + Number(mov.acrescimo || 0);
    }
    return acc + Number(mov.valor_bruto);
  }, 0);

  const valorVenda = venda
    ? venda.valor_total_venda
    : investimento?.veiculo?.valor
      ? parseFloat(investimento.veiculo.valor.replace(/[^\d,.-]/g, '').replace(',', '.'))
      : 0;

  const valorCompra = investimento?.veiculo?.valor_aquisicao || 0;
  const custoPreparacao = totalCustos;
  const custoTotal = valorCompra + custoPreparacao;
  const lucro = valorVenda - custoTotal;
  const percentual = investimento?.percentual_investido || 0;
  const lucroInvestidor = (lucro * percentual) / 100;
  const rentabilidade = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;

  // Dias em estoque
  const dataAquisicao = investimento?.veiculo?.data_aquisicao
    ? new Date(investimento.veiculo.data_aquisicao)
    : null;
  const dataVenda = venda?.data_venda ? new Date(venda.data_venda) : new Date();
  const diasEmEstoque = dataAquisicao ? differenceInDays(dataVenda, dataAquisicao) : 0;

  const formatVehicleInfo = () => {
    if (!investimento?.veiculo) return '-';
    const v = investimento.veiculo;
    return `${v.placa || 'S/P'} - ${v.modelo || ''} ${v.motor || ''} ${v.cambio || ''} - ${v.ano || ''} - ${v.cor || ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhamento do Investimento</span>
            <Button variant="outline" size="sm" onClick={() => handlePrint()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div ref={printRef} className="space-y-6 print:p-4">
            {/* Header para impressão */}
            <div className="hidden print:block mb-6">
              <div className="flex items-start justify-between border-b pb-4">
                {empresa?.foto_url && (
                  <img src={empresa.foto_url} alt="Logo" className="h-16 object-contain" />
                )}
                <div className="text-right text-sm">
                  <p className="font-bold text-lg">{empresa?.nome_fantasia}</p>
                  <p>{empresa?.logradouro}, {empresa?.numero} - {empresa?.bairro}</p>
                  <p>{empresa?.municipio}/{empresa?.estado} - CEP: {empresa?.cep}</p>
                  {empresa?.telefone && <p>Tel: {empresa.telefone}</p>}
                  {empresa?.site && <p>{empresa.site}</p>}
                </div>
              </div>
              <h2 className="text-center font-bold text-xl mt-4">
                Relatório de Investimento
              </h2>
              <p className="text-center text-sm text-muted-foreground">
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            {/* Info do investidor e veículo */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 print:bg-gray-100">
              <div>
                <span className="text-sm text-muted-foreground">Investidor</span>
                <p className="font-semibold">{investimento?.pessoa?.nome || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Percentual Investido</span>
                <p className="font-semibold">{percentual}%</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Veículo</span>
                <p className="font-semibold">{formatVehicleInfo()}</p>
              </div>
            </div>

            {/* Listagem de custos */}
            <div>
              <h3 className="font-semibold mb-3">Custos do Veículo</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Descrição</TableHead>
                      <TableHead>Favorecido</TableHead>
                      <TableHead>Data Compra</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12 print:hidden"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum custo registrado para este veículo
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {custos.map((custo) => {
                          const valorFinal = custo.status === 'Pago'
                            ? Number(custo.valor_bruto) - Number(custo.desconto || 0) + Number(custo.acrescimo || 0)
                            : Number(custo.valor_bruto);
                          return (
                            <TableRow key={custo.id}>
                              <TableCell>{custo.descricao}</TableCell>
                              <TableCell>{custo.pessoa?.nome || '-'}</TableCell>
                              <TableCell>{formatDate(custo.data_compra)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(valorFinal)}</TableCell>
                              <TableCell className="print:hidden">
                                {custo.temAnexo && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            setSelectedCusto(custo);
                                            setAnexosDialogOpen(true);
                                          }}
                                        >
                                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Ver comprovantes anexados</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell colSpan={3}>Total</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalCustos)}</TableCell>
                          <TableCell className="print:hidden"></TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tabela resumo */}
            <div>
              <h3 className="font-semibold mb-3">Resumo Financeiro</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow className="bg-accent/10">
                      <TableCell className="font-bold">Valor de Venda</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(valorVenda)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Valor de Compra</TableCell>
                      <TableCell className="text-right">{formatCurrency(valorCompra)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Custo de Preparação</TableCell>
                      <TableCell className="text-right">{formatCurrency(custoPreparacao)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-bold">Custo Total</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(custoTotal)}</TableCell>
                    </TableRow>
                    <TableRow className={lucro >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}>
                      <TableCell className="font-bold">Lucro</TableCell>
                      <TableCell className={`text-right font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(lucro)}
                      </TableCell>
                    </TableRow>
                    <TableRow className={lucroInvestidor >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}>
                      <TableCell className="font-bold">Lucro Investidor ({percentual}%)</TableCell>
                      <TableCell className={`text-right font-bold ${lucroInvestidor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(lucroInvestidor)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Rentabilidade</TableCell>
                      <TableCell className={`text-right font-semibold ${rentabilidade >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {rentabilidade.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Tempo em Estoque</TableCell>
                      <TableCell className="text-right">{diasEmEstoque} dias</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <AnexosViewerDialog
          open={anexosDialogOpen}
          onOpenChange={setAnexosDialogOpen}
          movimentoId={selectedCusto?.id || null}
          descricaoMovimento={selectedCusto?.descricao}
        />
      </DialogContent>
    </Dialog>
  );
}
