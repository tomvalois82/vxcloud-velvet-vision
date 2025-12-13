import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface SalesReportPrintProps {
  sales: SaleReportItem[];
  empresa: Empresa | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  vendedorFiltro: string | null;
}

const SalesReportPrint = forwardRef<HTMLDivElement, SalesReportPrintProps>(
  ({ sales, empresa, dataInicio, dataFim, vendedorFiltro }, ref) => {
    // Agrupar vendas por vendedor
    const salesByVendedor = sales.reduce((acc, sale) => {
      const vendedor = sale.vendedor_nome || 'Sem Vendedor';
      if (!acc[vendedor]) {
        acc[vendedor] = [];
      }
      acc[vendedor].push(sale);
      return acc;
    }, {} as Record<string, SaleReportItem[]>);

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatDate = (dateStr: string) => {
      try {
        return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
      } catch {
        return dateStr;
      }
    };

    const periodoTexto = () => {
      if (dataInicio && dataFim) {
        return `Período: ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}`;
      }
      if (dataInicio) {
        return `A partir de: ${format(dataInicio, 'dd/MM/yyyy')}`;
      }
      if (dataFim) {
        return `Até: ${format(dataFim, 'dd/MM/yyyy')}`;
      }
      return 'Período: Todos';
    };

    const totalGeral = sales.reduce((sum, s) => sum + s.valor_total_venda, 0);

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8"
        style={{
          width: '210mm',
          minHeight: '297mm',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
        }}
      >
        {/* Cabeçalho com Timbre da Empresa */}
        {empresa && (
          <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-4 mb-4">
            {empresa.foto_url && (
              <img
                src={empresa.foto_url}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold">{empresa.nome_fantasia}</h1>
              <p className="text-xs text-gray-600">
                {empresa.logradouro}, {empresa.numero}
                {empresa.complemento ? `, ${empresa.complemento}` : ''} - {empresa.bairro}
              </p>
              <p className="text-xs text-gray-600">
                {empresa.municipio}/{empresa.estado} - CEP: {empresa.cep}
              </p>
              <p className="text-xs text-gray-600">
                {empresa.telefone && `Tel: ${empresa.telefone}`}
                {empresa.telefone && empresa.site && ' | '}
                {empresa.site && empresa.site}
              </p>
            </div>
          </div>
        )}

        {/* Título do Relatório */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">RELATÓRIO DE VENDAS</h2>
          <p className="text-xs text-gray-600">{periodoTexto()}</p>
          {vendedorFiltro && (
            <p className="text-xs text-gray-600">Vendedor: {vendedorFiltro}</p>
          )}
          <p className="text-xs text-gray-500">
            Total de vendas: {sales.length} | Valor total: {formatCurrency(totalGeral)}
          </p>
        </div>

        {/* Listagem por Vendedor */}
        {Object.entries(salesByVendedor).map(([vendedor, vendas]) => {
          const totalVendedor = vendas.reduce((sum, s) => sum + s.valor_total_venda, 0);
          
          return (
            <div key={vendedor} className="mb-6">
              {/* Cabeçalho do Vendedor */}
              <div className="bg-gray-200 px-2 py-1 font-bold text-sm mb-1">
                {vendedor} - {vendas.length} venda(s) - Total: {formatCurrency(totalVendedor)}
              </div>

              {/* Tabela de Vendas */}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-1 py-1 text-left w-16">Data</th>
                    <th className="border border-gray-400 px-1 py-1 text-left">Veículo</th>
                    <th className="border border-gray-400 px-1 py-1 text-left">Cliente</th>
                    <th className="border border-gray-400 px-1 py-1 text-right w-20">Financiado</th>
                    <th className="border border-gray-400 px-1 py-1 text-left w-20">Financeira</th>
                    <th className="border border-gray-400 px-1 py-1 text-right w-20">Prod./Serv.</th>
                    <th className="border border-gray-400 px-1 py-1 text-right w-24">Valor Venda</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((venda) => {
                    const veiculoDesc = [
                      venda.veiculo_modelo,
                      venda.veiculo_motor,
                      venda.veiculo_cambio,
                    ]
                      .filter(Boolean)
                      .join(' ');
                    const veiculoCompleto = venda.veiculo_ano
                      ? `${veiculoDesc} - ${venda.veiculo_ano}`
                      : veiculoDesc;

                    const clienteCompleto = venda.cliente_telefone
                      ? `${venda.cliente_nome} (${venda.cliente_telefone})`
                      : venda.cliente_nome;

                    return (
                      <tr key={venda.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-1 py-1">
                          {formatDate(venda.data_venda)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1">
                          {veiculoCompleto || '-'}
                        </td>
                        <td className="border border-gray-300 px-1 py-1">
                          {clienteCompleto}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-right">
                          {venda.financiado_valor > 0
                            ? formatCurrency(venda.financiado_valor)
                            : '-'}
                        </td>
                        <td className="border border-gray-300 px-1 py-1">
                          {venda.financeira_nome || '-'}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-right">
                          {venda.servicos_produtos_valor > 0
                            ? formatCurrency(venda.servicos_produtos_valor)
                            : '-'}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-right font-semibold">
                          {formatCurrency(venda.valor_total_venda)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Rodapé */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    );
  }
);

SalesReportPrint.displayName = 'SalesReportPrint';

export default SalesReportPrint;
