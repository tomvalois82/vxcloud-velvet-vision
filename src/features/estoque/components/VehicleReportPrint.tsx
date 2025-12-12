import { forwardRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VehicleCost {
  id: string;
  descricao: string;
  data_compra: string | null;
  valor_liquido: number;
  pessoa?: {
    nome: string;
  } | null;
}

interface Vehicle {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  ano: string | null;
  ano_fabricacao: string | null;
  placa: string | null;
  cor: string | null;
  km: string | null;
  valor: string | null;
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  created_at: string;
}

interface Empresa {
  foto_url: string | null;
  nome_fantasia: string;
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

interface VehicleReportPrintProps {
  vehicle: Vehicle;
  costs: VehicleCost[];
  valorVenda: number | null;
  empresa?: Empresa | null;
  dataVenda?: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const VehicleReportPrint = forwardRef<HTMLDivElement, VehicleReportPrintProps>(
  ({ vehicle, costs, valorVenda, empresa, dataVenda }, ref) => {
    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    // Cálculos financeiros
    const valorAquisicao = vehicle.valor_aquisicao || 0;
    const custoPreparacao = costs.reduce((acc, c) => acc + c.valor_liquido, 0);
    const custoTotal = valorAquisicao + custoPreparacao;
    const lucro = valorVenda !== null ? valorVenda - custoTotal : null;
    const rentabilidade = lucro !== null && custoTotal > 0 ? (lucro / custoTotal) * 100 : null;
    
    // Dias em estoque
    const dataInicio = new Date(vehicle.data_aquisicao || vehicle.created_at);
    const dataFim = dataVenda ? new Date(dataVenda) : new Date();
    const diasEmEstoque = differenceInDays(dataFim, dataInicio);

    // Formatar endereço
    const formatEndereco = () => {
      if (!empresa) return '';
      const parts = [
        empresa.logradouro,
        empresa.numero,
        empresa.complemento,
        empresa.bairro,
        `${empresa.municipio} - ${empresa.estado}`,
        empresa.cep,
      ].filter(Boolean);
      return parts.join(', ');
    };

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-screen print:p-4">
        {/* Timbre da Empresa */}
        {empresa && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b-2 border-gray-300">
            {empresa.foto_url && (
              <img 
                src={empresa.foto_url} 
                alt="Logo da empresa" 
                className="h-16 w-auto object-contain"
              />
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold uppercase">{empresa.nome_fantasia}</h1>
              <p className="text-xs text-gray-600">{formatEndereco()}</p>
              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                {empresa.telefone && <span>Tel: {empresa.telefone}</span>}
                {empresa.site && <span>{empresa.site}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Header do Relatório */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase">Relatório do Veículo</h1>
          <p className="text-lg font-semibold mt-2">
            {vehicle.fabricante} {vehicle.modelo} - {vehicle.placa || 'Sem placa'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Ano: {vehicle.ano_fabricacao || vehicle.ano} | Cor: {vehicle.cor || '-'} | KM: {vehicle.km || '-'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Gerado em: {currentDate}
          </p>
        </div>

        {/* Tabela de Custos */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-400 pb-1">
            Custos do Veículo
          </h2>
          
          {costs.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-2 py-1 text-left">Descrição</th>
                  <th className="border border-gray-400 px-2 py-1 text-left w-40">Favorecido</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-28">Data Compra</th>
                  <th className="border border-gray-400 px-2 py-1 text-right w-28">Valor</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => (
                  <tr key={cost.id} className="even:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1">{cost.descricao}</td>
                    <td className="border border-gray-300 px-2 py-1">
                      {cost.pessoa?.nome || '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {cost.data_compra 
                        ? format(new Date(cost.data_compra), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(cost.valor_liquido)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={3} className="border border-gray-400 px-2 py-1 text-right">
                    TOTAL
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">
                    {formatCurrency(custoPreparacao)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-gray-500 italic text-center py-4">
              Nenhum custo registrado para este veículo.
            </p>
          )}
        </div>

        {/* Tabela Resumo Financeiro */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-400 pb-1">
            Resumo Financeiro
          </h2>
          
          <table className="w-full max-w-md border-collapse text-sm">
            <tbody>
              <tr className="bg-gray-200">
                <td className="border border-gray-400 px-3 py-2 font-bold">Valor de Venda</td>
                <td className="border border-gray-400 px-3 py-2 text-right font-bold">
                  {valorVenda !== null ? formatCurrency(valorVenda) : 'Não vendido'}
                </td>
              </tr>
              <tr className="even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">Valor de Compra</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(valorAquisicao)}
                </td>
              </tr>
              <tr className="even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">Custo de Preparação</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(custoPreparacao)}
                </td>
              </tr>
              <tr className="bg-gray-200">
                <td className="border border-gray-400 px-3 py-2 font-bold">Custo Total</td>
                <td className="border border-gray-400 px-3 py-2 text-right font-bold">
                  {formatCurrency(custoTotal)}
                </td>
              </tr>
              <tr className="bg-gray-300">
                <td className="border border-gray-400 px-3 py-2 font-bold">Lucro</td>
                <td className={`border border-gray-400 px-3 py-2 text-right font-bold ${
                  lucro !== null ? (lucro >= 0 ? 'text-green-700' : 'text-red-700') : ''
                }`}>
                  {lucro !== null ? formatCurrency(lucro) : '-'}
                </td>
              </tr>
              <tr className="even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">Rentabilidade</td>
                <td className={`border border-gray-300 px-3 py-2 text-right ${
                  rentabilidade !== null ? (rentabilidade >= 0 ? 'text-green-700' : 'text-red-700') : ''
                }`}>
                  {rentabilidade !== null ? `${rentabilidade.toFixed(2)}%` : '-'}
                </td>
              </tr>
              <tr className="even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">Tempo em Estoque</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {diasEmEstoque} {diasEmEstoque === 1 ? 'dia' : 'dias'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
          <p>Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </div>
    );
  }
);

VehicleReportPrint.displayName = 'VehicleReportPrint';
