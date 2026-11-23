import { normalizarPlacaBusca } from '../../estoque/utils/ciclos';

interface CicloCompra {
  id_estoque: number | null;
  id_venda: string | null;
  id_compra: string | null;
}

export function selecionarIdsCompra(ciclos: CicloCompra[], idCompra?: string | null): number[] {
  return ciclos
    .filter(ciclo => ciclo.id_venda === null &&
      (ciclo.id_compra === null || (Boolean(idCompra) && ciclo.id_compra === idCompra)))
    .map(ciclo => ciclo.id_estoque)
    .filter((id): id is number => id !== null);
}

export function correspondeBuscaVeiculo(
  veiculo: { modelo: string | null; fabricante: string | null; placa: string | null; ano: string | null },
  busca: string,
): boolean {
  const termo = busca.trim().toLowerCase();
  const placa = normalizarPlacaBusca(busca);
  return [veiculo.modelo, veiculo.fabricante, veiculo.placa, veiculo.ano]
    .some(campo => (campo || '').toLowerCase().includes(termo)) ||
    (placa.length > 0 && normalizarPlacaBusca(veiculo.placa || '').includes(placa));
}

export function placaParaConsultarCiclos(busca: string): string | null {
  const placa = normalizarPlacaBusca(busca);
  return placa.length >= 7 ? placa : null;
}