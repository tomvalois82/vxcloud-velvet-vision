const DIA_MS = 86_400_000;

// Dias inteiros até o vencimento (negativo quando vencido)
export function diasParaVencer(validoAte: string, agora: Date = new Date()): number {
  const fim = new Date(validoAte).getTime();
  if (fim <= agora.getTime()) return -1;
  return Math.floor((fim - agora.getTime()) / DIA_MS);
}
