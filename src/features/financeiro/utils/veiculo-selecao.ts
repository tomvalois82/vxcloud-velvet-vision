import { normalizarPlacaBusca } from '../../estoque/utils/ciclos';

export interface VeiculoResumo {
  id: number;
  fabricante: string | null;
  modelo: string | null;
  placa: string | null;
  ano: string | null;
  status: string | null;
  titulo: string | null;
  descricao_ciclo: string | null;
  placa_normalizada: string | null;
  ciclo: number | null;
  total_ciclos: number | null;
  sugerido: boolean | null;
  ordem_exibicao: number | null;
  ativo: boolean | null;
  id_venda: string | null;
  venda_fechada: boolean | null;
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
  const placaBusca = normalizarPlacaBusca(termoBusca);

  return veiculos.filter((veiculo) => {
    const textoPesquisavel = normalizarTexto(
      [veiculo.fabricante, veiculo.modelo, veiculo.placa, veiculo.titulo, veiculo.descricao_ciclo]
        .filter((valor): valor is string => Boolean(valor))
        .join(" "),
    );

    return termos.every((termo) => textoPesquisavel.includes(termo)) ||
      (placaBusca.length > 0 &&
        (veiculo.placa_normalizada || normalizarPlacaBusca(veiculo.placa || '')).includes(placaBusca));
  }).sort((primeiro, segundo) => {
    const placaPrimeiro = primeiro.placa_normalizada || normalizarPlacaBusca(primeiro.placa || '');
    const placaSegundo = segundo.placa_normalizada || normalizarPlacaBusca(segundo.placa || '');
    return placaPrimeiro.localeCompare(placaSegundo) ||
      Number(segundo.sugerido === true) - Number(primeiro.sugerido === true) ||
      (primeiro.ordem_exibicao ?? Number.MAX_SAFE_INTEGER) -
        (segundo.ordem_exibicao ?? Number.MAX_SAFE_INTEGER) || primeiro.id - segundo.id;
  });
}

export function formatarCicloParaSelecao(veiculo: VeiculoResumo): { titulo: string; descricao: string } {
  return {
    titulo: veiculo.titulo?.trim() || formatarVeiculoParaSelecao(veiculo),
    descricao: veiculo.descricao_ciclo?.trim() || `Ciclo ${veiculo.ciclo ?? 1} de ${veiculo.total_ciclos ?? 1}`,
  };
}
