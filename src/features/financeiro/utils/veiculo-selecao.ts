export interface VeiculoResumo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  ano: string | null;
  status: string | null;
}

// Normaliza a busca para ignorar maiúsculas, minúsculas e acentos.
const normalizarTexto = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

export function formatarVeiculoParaSelecao(veiculo: VeiculoResumo): string {
  const identificacao = [veiculo.fabricante, veiculo.modelo, veiculo.ano]
    .filter((valor): valor is string => Boolean(valor?.trim()))
    .join(" ") || "Veículo sem nome";
  const placa = veiculo.placa?.trim() || "Sem placa";
  const status = veiculo.status?.trim() || "Sem status";

  return `${identificacao} | ${placa} [${status}]`;
}

export function filtrarVeiculosParaSelecao(
  veiculos: VeiculoResumo[],
  termoBusca: string,
): VeiculoResumo[] {
  const termos = normalizarTexto(termoBusca).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return veiculos;

  return veiculos.filter((veiculo) => {
    const textoPesquisavel = normalizarTexto(
      [veiculo.fabricante, veiculo.modelo, veiculo.placa]
        .filter((valor): valor is string => Boolean(valor))
        .join(" "),
    );

    return termos.every((termo) => textoPesquisavel.includes(termo));
  });
}
