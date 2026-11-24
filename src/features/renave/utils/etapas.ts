// Mapeamento das etapas do processo RENAVE (coluna etapa / renave_etapa).
export interface EtapaRenaveInfo {
  rotulo: string;
  classe: string;
}

export const ETAPAS_RENAVE: Record<string, EtapaRenaveInfo> = {
  AGUARDANDO_ENTRADA: { rotulo: 'RENAVE: preencher/comunicar entrada', classe: 'border-amber-500/40 bg-amber-500/20 text-amber-500' },
  AGUARDANDO_ASSINATURA: { rotulo: 'RENAVE: aguardando assinatura do vendedor', classe: 'border-amber-500/40 bg-amber-500/20 text-amber-500' },
  AGUARDANDO_NF_ENTRADA: { rotulo: 'RENAVE: aguardando NF-e de entrada', classe: 'border-amber-500/40 bg-amber-500/20 text-amber-500' },
  AGUARDANDO_DETRAN: { rotulo: 'RENAVE: aguardando Detran', classe: 'border-blue-500/40 bg-blue-500/20 text-blue-400' },
  PRONTO_PARA_SAIDA: { rotulo: 'RENAVE: pronto para saída', classe: 'border-green-500/40 bg-green-500/20 text-green-500' },
  AGUARDANDO_NF_SAIDA: { rotulo: 'RENAVE: aguardando NF-e de saída', classe: 'border-amber-500/40 bg-amber-500/20 text-amber-500' },
  CONCLUIDO: { rotulo: 'RENAVE: concluído', classe: 'border-green-800/60 bg-green-800/40 text-green-300' },
  CANCELADO: { rotulo: 'RENAVE: cancelado', classe: 'border-red-500/40 bg-red-500/20 text-red-500' },
};

export const ETAPA_FORA: EtapaRenaveInfo = {
  rotulo: 'Fora do RENAVE',
  classe: 'border-border bg-muted text-muted-foreground',
};

export function infoEtapa(etapa: string | null | undefined): EtapaRenaveInfo {
  if (!etapa) return ETAPA_FORA;
  return ETAPAS_RENAVE[etapa] ?? { rotulo: `RENAVE: ${etapa}`, classe: ETAPA_FORA.classe };
}

export const PASSOS_RENAVE = [
  'Entrada',
  'Assinatura do vendedor',
  'NF-e de entrada',
  'Confirmação do Detran',
  'Saída',
  'ATPV-e da venda',
  'NF-e de saída',
] as const;

// Índice do passo atual no stepper (7 = todos concluídos, -1 = cancelado/desconhecido).
const PASSO_POR_ETAPA: Record<string, number> = {
  AGUARDANDO_ENTRADA: 0,
  AGUARDANDO_ASSINATURA: 1,
  AGUARDANDO_NF_ENTRADA: 2,
  AGUARDANDO_DETRAN: 3,
  PRONTO_PARA_SAIDA: 4,
  AGUARDANDO_NF_SAIDA: 6,
  CONCLUIDO: 7,
};

export function passoAtual(etapa: string | null | undefined): number {
  if (!etapa) return -1;
  return PASSO_POR_ETAPA[etapa] ?? -1;
}
