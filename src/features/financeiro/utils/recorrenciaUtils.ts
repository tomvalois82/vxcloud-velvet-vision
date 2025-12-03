import { addDays, addMonths, setDate, lastDayOfMonth, format } from "date-fns";

export type TipoRecorrencia = 
  | "nao_recorrente"
  | "por_ocorrencias"
  | "intervalo_dias"
  | "dia_mes";

export interface RecorrenciaConfig {
  tipo: TipoRecorrencia;
  numeroOcorrencias: number;
  intervaloDias: number;
  diaFixoMes: number;
  dataInicial: Date;
}

/**
 * Gera as datas de vencimento para lançamentos recorrentes
 */
export function gerarDatasRecorrencia(config: RecorrenciaConfig): Date[] {
  const { tipo, numeroOcorrencias, intervaloDias, diaFixoMes, dataInicial } = config;

  if (tipo === "nao_recorrente") {
    return [dataInicial];
  }

  const datas: Date[] = [];

  if (tipo === "por_ocorrencias" || tipo === "intervalo_dias") {
    // Usar intervalo em dias
    const intervalo = tipo === "intervalo_dias" ? intervaloDias : intervaloDias;
    for (let i = 0; i < numeroOcorrencias; i++) {
      datas.push(addDays(dataInicial, i * intervalo));
    }
  } else if (tipo === "dia_mes") {
    // Repetir todo dia X do mês
    for (let i = 0; i < numeroOcorrencias; i++) {
      const mesBase = addMonths(dataInicial, i);
      const ultimoDiaMes = lastDayOfMonth(mesBase).getDate();
      const diaReal = Math.min(diaFixoMes, ultimoDiaMes);
      const dataOcorrencia = setDate(mesBase, diaReal);
      datas.push(dataOcorrencia);
    }
  }

  return datas;
}

/**
 * Gera um UUID v4 simples para recorrencia_id
 */
export function generateRecorrenciaId(): string {
  return crypto.randomUUID();
}

/**
 * Formata a descrição com indicador de parcela
 */
export function formatarDescricaoRecorrente(
  descricaoBase: string,
  ordemOcorrencia: number,
  totalOcorrencias: number
): string {
  return `${descricaoBase} (${ordemOcorrencia}/${totalOcorrencias})`;
}
