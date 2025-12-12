import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskCurrency } from '@/features/estoque/utils/masks';

interface Vehicle {
  id: number;
  modelo: string;
  fabricante: string;
  ano: string;
  ano_fabricacao?: string;
  valor: string;
  km: string;
  cor: string;
  placa: string | null;
  motor?: string;
  cambio?: string;
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

interface VehicleListPrintProps {
  vehicles: Vehicle[];
  empresa?: Empresa | null;
}

export const VehicleListPrint = forwardRef<HTMLDivElement, VehicleListPrintProps>(
  ({ vehicles, empresa }, ref) => {
    // Agrupar veículos por fabricante (marca)
    const vehiclesByBrand = vehicles.reduce((acc, vehicle) => {
      const brand = vehicle.fabricante || 'Sem Marca';
      if (!acc[brand]) {
        acc[brand] = [];
      }
      acc[brand].push(vehicle);
      return acc;
    }, {} as Record<string, Vehicle[]>);

    // Ordenar marcas alfabeticamente
    const sortedBrands = Object.keys(vehiclesByBrand).sort((a, b) => 
      a.localeCompare(b, 'pt-BR')
    );

    const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const totalVehicles = vehicles.length;

    // Montar endereço completo
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
          <h1 className="text-2xl font-bold uppercase">Listagem de Veículos em Estoque</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data: {currentDate} | Total de Veículos: {totalVehicles}
          </p>
        </div>

        {/* Tabelas por Marca */}
        {sortedBrands.map((brand) => (
          <div key={brand} className="mb-6 break-inside-avoid">
            {/* Header da Marca */}
            <div className="bg-gray-800 text-white px-3 py-2 font-bold text-sm uppercase">
              {brand} ({vehiclesByBrand[brand].length})
            </div>

            {/* Tabela */}
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-2 py-1 text-left w-24">Placa</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Modelo / Motor / Câmbio</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-24">Ano</th>
                  <th className="border border-gray-400 px-2 py-1 text-center w-20">Cor</th>
                  <th className="border border-gray-400 px-2 py-1 text-right w-24">Km</th>
                  <th className="border border-gray-400 px-2 py-1 text-right w-28">Valor Venda</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesByBrand[brand].map((vehicle, index) => (
                  <tr key={vehicle.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-2 py-1 font-mono text-xs">
                      {vehicle.placa || '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">
                      <span className="font-medium">{vehicle.modelo || '-'}</span>
                      {(vehicle.motor || vehicle.cambio) && (
                        <span className="text-gray-600 ml-1">
                          {vehicle.motor && ` ${vehicle.motor}`}
                          {vehicle.cambio && ` / ${vehicle.cambio}`}
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {vehicle.ano || '-'}/{vehicle.ano_fabricacao || '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {vehicle.cor || '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                      {vehicle.km ? `${vehicle.km}` : '-'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-bold">
                      {vehicle.valor ? maskCurrency(Number(vehicle.valor)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </div>
    );
  }
);

VehicleListPrint.displayName = 'VehicleListPrint';
