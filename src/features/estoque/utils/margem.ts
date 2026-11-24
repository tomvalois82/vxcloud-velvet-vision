// Calcula a margem do veículo: real quando há venda (vx_vendas), prevista quando ainda está no estoque.
export interface ResultadoMargem {
  valor: number;
  percentual: number;
  prevista: boolean;
}

export function calcularMargemVeiculo(params: {
  valorVenda: number | null;
  valorAnunciado: number | null;
  valorAquisicao: number | null;
  custos: number;
}): ResultadoMargem | null {
  const aquisicao = params.valorAquisicao ?? 0;
  const base = params.valorVenda ?? params.valorAnunciado;
  if (!base || base <= 0) return null;
  const valor = base - aquisicao - params.custos;
  return { valor, percentual: (valor / base) * 100, prevista: params.valorVenda === null };
}
