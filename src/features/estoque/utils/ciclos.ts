// Status que caracterizam um veículo no estoque ativo (ciclo em andamento)
export const STATUS_ATIVOS = ['Em estoque', 'Em preparação', 'Reservado'] as const;

export type StatusAtivo = (typeof STATUS_ATIVOS)[number];

// Normaliza a placa para busca: apenas letras e números em maiúsculas (ex.: PDB2J73)
export const normalizarPlacaBusca = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function correspondeBuscaEstoque(veiculo: { modelo: string | null; placa: string | null }, busca: string): boolean {
  const termo = busca.trim().toLowerCase();
  const placaBusca = normalizarPlacaBusca(busca);
  return termo.length === 0 || (veiculo.modelo || '').toLowerCase().includes(termo) ||
    (placaBusca.length > 0 && normalizarPlacaBusca(veiculo.placa || '').includes(placaBusca));
}
