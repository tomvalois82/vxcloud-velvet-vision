import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PurchaseContractData } from '../hooks/usePurchaseContract';

interface PurchaseContractProps {
  data: PurchaseContractData;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatCPFCNPJ = (value: string | null) => {
  if (!value) return '-';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

// Evita deslocamento de fuso ao interpretar datas no formato YYYY-MM-DD
const parseDateOnlyAsLocal = (dateString: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(`${dateString}T00:00:00`);
  }
  return new Date(dateString);
};

const formatDate = (dateString: string) => {
  try {
    return format(parseDateOnlyAsLocal(dateString), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
};

const formatDateLong = (dateString: string) => {
  try {
    return format(parseDateOnlyAsLocal(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
};

export const PurchaseContract = forwardRef<HTMLDivElement, PurchaseContractProps>(
  ({ data }, ref) => {
    const statusCompra = data.cancelada
      ? 'CANCELADA'
      : data.fechada
        ? 'CONCRETIZADA'
        : 'EM ABERTO';

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
        style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b-2 border-gray-300 pb-4 mb-6">
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
              <h1 className="text-xl font-bold text-black">
                {data.empresa?.nome_fantasia || 'VX MOTORS'}
              </h1>
              <p className="text-xs text-black">
                CNPJ: {formatCPFCNPJ(data.empresa?.cnpj || null)}
              </p>
              <p className="text-xs text-black">
                {data.empresa?.logradouro}, {data.empresa?.numero} - {data.empresa?.bairro}
              </p>
              <p className="text-xs text-black">
                {data.empresa?.municipio}/{data.empresa?.estado} - CEP: {data.empresa?.cep}
              </p>
              <p className="text-xs text-black">
                Tel: {data.empresa?.telefone || '-'} | {data.empresa?.site || data.empresa?.email}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-black">
              CONTRATO Nº {data.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-black">Data: {formatDate(data.data_compra)}</p>
            <p className="text-sm text-black">Tipo: COMPRA DE VEÍCULO</p>
            <p className="text-sm font-semibold text-black">
              Status: {statusCompra}
            </p>
          </div>
        </div>

        {/* Dados do vendedor */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 mb-3">
            <h2 className="text-sm font-bold uppercase text-black">DADOS DO VENDEDOR</h2>
            <p className="text-xs text-black">
              PROPRIETÁRIO QUE VENDEU O VEÍCULO À {data.empresa?.nome_fantasia || 'LOJA'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="font-semibold">Nome:</span> {data.fornecedor?.nome || '-'}
            </div>
            <div>
              <span className="font-semibold">CPF/CNPJ:</span>{' '}
              {formatCPFCNPJ(data.fornecedor?.cpf_cnpj || null)}
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Endereço:</span>{' '}
              {data.fornecedor?.logradouro
                ? `${data.fornecedor.logradouro}, ${data.fornecedor.numero || 'S/N'} - ${data.fornecedor.bairro || ''}, ${data.fornecedor.municipio || ''}/${data.fornecedor.estado || ''} - CEP: ${data.fornecedor.cep || '-'}`
                : '-'}
            </div>
            <div>
              <span className="font-semibold">Telefone:</span> {data.fornecedor?.telefone || '-'}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {data.fornecedor?.email || '-'}
            </div>
          </div>
        </div>

        {/* Veículo adquirido */}
        <div className="mb-6">
          <div className="bg-gray-100 px-3 py-2 mb-3">
            <h2 className="text-sm font-bold uppercase text-black">VEÍCULO DE COMPRA</h2>
            <p className="text-xs text-black">
              ADQUIRIDO PELA {data.empresa?.nome_fantasia || 'LOJA'} DO VENDEDOR
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-black">
                {data.veiculo?.fabricante} {data.veiculo?.modelo}
              </p>
              <p className="text-lg font-bold text-black">
                {formatCurrency(data.totais.valorCompra)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="font-semibold">Chassi:</span> {data.veiculo?.chassi || '-'}
            </div>
            <div>
              <span className="font-semibold">Placa:</span> {data.veiculo?.placa || '-'}
            </div>
            <div>
              <span className="font-semibold">Ano:</span>{' '}
              {data.veiculo?.ano_fabricacao || data.veiculo?.ano || '-'}/{data.veiculo?.ano || '-'}
            </div>
            <div>
              <span className="font-semibold">Cor:</span> {data.veiculo?.cor || '-'}
            </div>
            <div>
              <span className="font-semibold">Motor:</span> {data.veiculo?.motor || '-'}
            </div>
            <div>
              <span className="font-semibold">Renavam:</span> {data.veiculo?.renavan || '-'}
            </div>
            <div>
              <span className="font-semibold">KM:</span> {data.veiculo?.km || '-'}
            </div>
            <div>
              <span className="font-semibold">Recebimento:</span> {formatDate(data.data_compra)}
            </div>
          </div>
        </div>

        {/* Acerto financeiro */}
        {data.pagamentos.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-100 px-3 py-2 mb-3">
              <h2 className="text-sm font-bold uppercase text-black">ACERTO FINANCEIRO</h2>
              <p className="text-xs text-black">
                VALORES PAGOS PELA {data.empresa?.nome_fantasia || 'LOJA'} AO VENDEDOR
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold">Forma de pagamento</th>
                  <th className="text-left py-2 font-semibold">Vencimento</th>
                  <th className="text-left py-2 font-semibold">Pagamento</th>
                  <th className="text-right py-2 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.pagamentos.map(pagamento => (
                  <tr key={pagamento.id} className="border-b border-gray-100">
                    <td className="py-2">
                      {pagamento.forma_pagamento?.descricao || '-'}
                      {pagamento.numero ? ` (${pagamento.numero})` : ''}
                    </td>
                    <td className="py-2">{formatDate(pagamento.data_lancamento)}</td>
                    <td className="py-2">
                      {pagamento.data_pagamento ? formatDate(pagamento.data_pagamento) : '-'}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(Math.abs(Number(pagamento.valor)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumo financeiro */}
        <div className="mb-8">
          <div className="bg-gray-100 px-3 py-2 mb-3">
            <h2 className="text-sm font-bold uppercase text-black">RESUMO FINANCEIRO</h2>
          </div>
          <div className="flex justify-end">
            <div className="w-96 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>(+) Valor do veículo:</span>
                <span className="font-semibold">{formatCurrency(data.totais.valorCompra)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-200 bg-gray-50 px-1">
                <span className="font-semibold">(=) Total a pagar:</span>
                <span className="font-semibold">
                  {formatCurrency(data.totais.totalPagamentos || data.totais.valorCompra)}
                </span>
              </div>

              {data.totais.totalPago > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>(-) Pago ao vendedor:</span>
                  <span className="font-semibold text-black">
                    {formatCurrency(data.totais.totalPago)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-base">(=) SALDO FINAL:</span>
                <span
                  className="font-bold text-base text-black"
                >
                  {formatCurrency(data.totais.saldoFinal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        {data.observacoes && (
          <div className="mb-6">
            <div className="bg-gray-100 px-3 py-2 mb-3">
              <h2 className="text-sm font-bold uppercase text-black">OBSERVAÇÕES</h2>
            </div>
            <p className="text-sm whitespace-pre-line">{data.observacoes}</p>
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-12 pt-6 border-t border-gray-300">
          <p className="text-center text-sm mb-8">
            {data.empresa?.municipio || 'Local'}/{data.empresa?.estado || 'UF'},{' '}
            {formatDateLong(data.data_compra)}
          </p>

          <div className="grid grid-cols-3 gap-8 text-center text-sm">
            <div>
              <div className="border-t border-gray-900 pt-2 mt-12">
                <p className="font-semibold">{data.fornecedor?.nome || 'VENDEDOR'}</p>
                <p className="text-xs text-black">
                  CPF/CNPJ: {formatCPFCNPJ(data.fornecedor?.cpf_cnpj || null)}
                </p>
              </div>
            </div>

            <div>
              <div className="border-t border-gray-900 pt-2 mt-12">
                <p className="font-semibold">{data.empresa?.nome_fantasia || 'COMPRADOR'}</p>
                <p className="text-xs text-black">
                  CNPJ: {formatCPFCNPJ(data.empresa?.cnpj || null)}
                </p>
              </div>
            </div>

            <div>
              <div className="border-t border-gray-900 pt-2 mt-12">
                <p className="font-semibold">TESTEMUNHA</p>
                <p className="text-xs text-black">CPF: ___________________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PurchaseContract.displayName = 'PurchaseContract';
