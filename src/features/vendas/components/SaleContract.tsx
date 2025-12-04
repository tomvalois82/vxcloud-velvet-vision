import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContractData } from '../hooks/useSaleContract';

interface SaleContractProps {
  data: ContractData;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCPFCNPJ = (value: string | null) => {
  if (!value) return '-';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
};

const formatDateLong = (dateString: string) => {
  try {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
};

export const SaleContract = forwardRef<HTMLDivElement, SaleContractProps>(
  ({ data }, ref) => {
    const hasTrocas = data.trocas.length > 0;
    const tipoVenda = hasTrocas ? 'VENDA COM TROCA' : 'VENDA DIRETA';
    const statusVenda = data.fechada ? 'CONCRETIZADO' : 'EM ABERTO';

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
        style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-300 pb-4 mb-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            {data.empresa?.foto_url ? (
              <img 
                src={data.empresa.foto_url} 
                alt={data.empresa.nome_fantasia || 'Logo'}
                className="w-16 h-16 object-contain rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-800 text-white flex items-center justify-center text-2xl font-bold rounded">
                {data.empresa?.nome_fantasia?.charAt(0) || 'V'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {data.empresa?.nome_fantasia || 'VX MOTORS'}
              </h1>
              <p className="text-xs text-gray-600">
                CNPJ: {formatCPFCNPJ(data.empresa?.cnpj || null)}
              </p>
              <p className="text-xs text-gray-600">
                {data.empresa?.logradouro}, {data.empresa?.numero} - {data.empresa?.bairro}
              </p>
              <p className="text-xs text-gray-600">
                {data.empresa?.municipio}/{data.empresa?.estado} - CEP: {data.empresa?.cep}
              </p>
              <p className="text-xs text-gray-600">
                Tel: {data.empresa?.telefone || '-'} | {data.empresa?.site || data.empresa?.email}
              </p>
            </div>
          </div>

          {/* Contract Info */}
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              CONTRATO Nº {data.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600">
              Data: {formatDate(data.data_venda)}
            </p>
            <p className="text-sm text-gray-600">Tipo: {tipoVenda}</p>
            <p className={`text-sm font-semibold ${data.fechada ? 'text-green-600' : 'text-yellow-600'}`}>
              Status: {statusVenda}
            </p>
          </div>
        </div>

        {/* Client Data Section */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 mb-3">
            <h2 className="text-sm font-bold uppercase text-gray-800">
              DADOS DO CLIENTE
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="font-semibold">Nome:</span>{' '}
              {data.cliente?.nome || '-'}
            </div>
            <div>
              <span className="font-semibold">CPF/CNPJ:</span>{' '}
              {formatCPFCNPJ(data.cliente?.cpf_cnpj || null)}
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Endereço:</span>{' '}
              {data.cliente?.logradouro
                ? `${data.cliente.logradouro}, ${data.cliente.numero || 'S/N'} - ${data.cliente.bairro || ''}, ${data.cliente.municipio || ''}/${data.cliente.estado || ''}`
                : '-'}
            </div>
            <div>
              <span className="font-semibold">Telefone:</span>{' '}
              {data.cliente?.telefone || '-'}
            </div>
            <div>
              <span className="font-semibold">Email:</span>{' '}
              {data.cliente?.email || '-'}
            </div>
          </div>
        </div>

        {/* Vehicle Sold Section */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 mb-3">
            <h2 className="text-sm font-bold uppercase text-gray-800">
              VEÍCULO DE VENDA
            </h2>
            <p className="text-xs text-gray-600">
              VENDIDO PELA {data.empresa?.nome_fantasia || 'LOJA'} AO CLIENTE
            </p>
          </div>
          
          {/* Highlight */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-900">
                {data.veiculo?.fabricante} {data.veiculo?.modelo}
              </p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(data.totais.valorVenda)}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="font-semibold">Chassi:</span>{' '}
              {data.veiculo?.chassi || '-'}
            </div>
            <div>
              <span className="font-semibold">Placa:</span>{' '}
              {data.veiculo?.placa || '-'}
            </div>
            <div>
              <span className="font-semibold">Ano:</span>{' '}
              {data.veiculo?.ano_fabricacao || data.veiculo?.ano || '-'}/{data.veiculo?.ano || '-'}
            </div>
            <div>
              <span className="font-semibold">Cor:</span>{' '}
              {data.veiculo?.cor || '-'}
            </div>
            <div>
              <span className="font-semibold">Motor:</span>{' '}
              {data.veiculo?.motor || '-'}
            </div>
            <div>
              <span className="font-semibold">Renavam:</span>{' '}
              {data.veiculo?.renavan || '-'}
            </div>
            <div>
              <span className="font-semibold">KM:</span>{' '}
              {data.veiculo?.km || '-'}
            </div>
            <div>
              <span className="font-semibold">Entrega:</span>{' '}
              {formatDate(data.data_venda)}
            </div>
          </div>
        </div>

        {/* Trade-In Section */}
        {hasTrocas && (
          <div className="mb-6">
            <div className="bg-gray-100 px-3 py-2 mb-3">
              <h2 className="text-sm font-bold uppercase text-gray-800">
                VEÍCULO DE TROCA
              </h2>
              <p className="text-xs text-gray-600">
                VENDIDO PELO CLIENTE À {data.empresa?.nome_fantasia || 'LOJA'}
              </p>
            </div>

            {data.trocas.map((troca, index) => (
              <div key={troca.id} className={index > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}>
                {/* Highlight */}
                <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-900">
                      {troca.veiculo?.fabricante} {troca.veiculo?.modelo}
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {formatCurrency(Number(troca.valor_troca))}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Chassi:</span>{' '}
                    {troca.veiculo?.chassi || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Placa:</span>{' '}
                    {troca.veiculo?.placa || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Ano:</span>{' '}
                    {troca.veiculo?.ano_fabricacao || troca.veiculo?.ano || '-'}/{troca.veiculo?.ano || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Cor:</span>{' '}
                    {troca.veiculo?.cor || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Renavam:</span>{' '}
                    {troca.veiculo?.renavan || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">KM:</span>{' '}
                    {troca.veiculo?.km || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Financial Settlement Section */}
        {data.acertos.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-100 px-3 py-2 mb-3">
              <h2 className="text-sm font-bold uppercase text-gray-800">
                ACERTO FINANCEIRO {data.acertos.some(a => Number(a.valor) > 0) ? 'RECEBIDO' : ''}
              </h2>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold">Forma de Pagamento</th>
                  <th className="text-left py-2 font-semibold">Vencimento</th>
                  <th className="text-left py-2 font-semibold">Pagamento</th>
                  <th className="text-right py-2 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.acertos.map((acerto) => (
                  <tr key={acerto.id} className="border-b border-gray-100">
                    <td className="py-2">
                      {acerto.forma_pagamento?.descricao || '-'} ({acerto.numero})
                    </td>
                    <td className="py-2">{formatDate(acerto.data_lancamento)}</td>
                    <td className="py-2">
                      {acerto.data_pagamento ? formatDate(acerto.data_pagamento) : '-'}
                    </td>
                    <td className={`py-2 text-right font-semibold ${Number(acerto.valor) < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(Math.abs(Number(acerto.valor)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Financing Section */}
        {data.financiamento && (
          <div className="mb-6">
            <div className="bg-gray-100 px-3 py-2 mb-3">
              <h2 className="text-sm font-bold uppercase text-gray-800">
                FINANCIAMENTO
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="font-semibold">Financeira:</span>{' '}
                {data.financiamento.financeira?.nome || '-'}
              </div>
              <div>
                <span className="font-semibold">Contrato:</span>{' '}
                {data.financiamento.numero_contrato || '-'}
              </div>
              <div>
                <span className="font-semibold">Parcelas:</span>{' '}
                {data.financiamento.numero_prestacao || '-'}x de {formatCurrency(Number(data.financiamento.valor_prestacao) || 0)}
              </div>
              <div>
                <span className="font-semibold">Valor Financiado:</span>{' '}
                {formatCurrency(Number(data.financiamento.valor))}
              </div>
            </div>
          </div>
        )}

        {/* Services/Products Section */}
        {data.servicos_produtos.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-100 px-3 py-2 mb-3">
              <h2 className="text-sm font-bold uppercase text-gray-800">
                PRODUTOS / SERVIÇOS
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold">Descrição</th>
                  <th className="text-right py-2 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.servicos_produtos.map((sp) => (
                  <tr key={sp.id} className="border-b border-gray-100">
                    <td className="py-2">{sp.descricao}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(Number(sp.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary */}
        <div className="mb-8">
          <div className="bg-gray-100 px-3 py-2 mb-3">
            <h2 className="text-sm font-bold uppercase text-gray-800">
              RESUMO FINANCEIRO
            </h2>
          </div>
          <div className="flex justify-end">
            <div className="w-96 text-sm">
              {/* Valor Base */}
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>(+) Valor do Veículo:</span>
                <span className="font-semibold">{formatCurrency(data.totais.valorVenda)}</span>
              </div>
              
              {data.totais.totalServicosProdutos > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>(+) Produtos/Serviços:</span>
                  <span className="font-semibold">{formatCurrency(data.totais.totalServicosProdutos)}</span>
                </div>
              )}
              
              {data.totais.totalTrocas > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>(-) Veículo(s) de Troca:</span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(data.totais.totalTrocas)}
                  </span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between py-1 border-b border-gray-200 bg-gray-50 px-1">
                <span className="font-semibold">(=) Total a Receber:</span>
                <span className="font-semibold">
                  {formatCurrency(data.totais.valorVenda + data.totais.totalServicosProdutos - data.totais.totalTrocas)}
                </span>
              </div>

              {/* Financiamento */}
              {data.totais.totalFinanciamento > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>(-) Financiamento:</span>
                  <span className="font-semibold text-purple-700">
                    {formatCurrency(data.totais.totalFinanciamento)}
                  </span>
                </div>
              )}

              {/* Recebimentos (Acerto - valores positivos) */}
              {data.totais.totalRecebimentos > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>(-) Recebido do Cliente:</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(data.totais.totalRecebimentos)}
                  </span>
                </div>
              )}

              {/* Pagamentos pela Loja (Acerto - valores negativos) */}
              {data.totais.totalPagamentos > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>(+) Pago ao Cliente:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(data.totais.totalPagamentos)}
                  </span>
                </div>
              )}

              {/* Saldo Final */}
              {(() => {
                const totalAReceber = data.totais.valorVenda + data.totais.totalServicosProdutos - data.totais.totalTrocas;
                const saldoFinal = totalAReceber - data.totais.totalFinanciamento - data.totais.totalRecebimentos + data.totais.totalPagamentos;
                return (
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                    <span className="font-bold text-base">(=) SALDO FINAL:</span>
                    <span className={`font-bold text-base ${saldoFinal === 0 ? 'text-green-700' : saldoFinal > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatCurrency(saldoFinal)}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Footer - Signatures */}
        <div className="mt-12 pt-6 border-t border-gray-300">
          <p className="text-center text-sm mb-8">
            {data.empresa?.municipio || 'Local'}/{data.empresa?.estado || 'UF'},{' '}
            {formatDateLong(data.data_venda)}
          </p>

          <div className="grid grid-cols-3 gap-8 text-center text-sm">
            {/* Client Signature */}
            <div>
              <div className="border-t border-gray-900 pt-2 mt-12">
                <p className="font-semibold">{data.cliente?.nome || 'CLIENTE'}</p>
                <p className="text-xs text-gray-600">
                  CPF/CNPJ: {formatCPFCNPJ(data.cliente?.cpf_cnpj || null)}
                </p>
              </div>
            </div>

            {/* Company Signature */}
            <div>
              <div className="border-t border-gray-900 pt-2 mt-12">
                <p className="font-semibold">{data.empresa?.nome_fantasia || 'VENDEDOR'}</p>
                <p className="text-xs text-gray-600">
                  CNPJ: {formatCPFCNPJ(data.empresa?.cnpj || null)}
                </p>
              </div>
            </div>

            {/* Witness */}
            <div>
              <div className="border-t border-gray-900 pt-2 mt-12">
                <p className="font-semibold">TESTEMUNHA</p>
                <p className="text-xs text-gray-600">CPF: ___________________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SaleContract.displayName = 'SaleContract';
