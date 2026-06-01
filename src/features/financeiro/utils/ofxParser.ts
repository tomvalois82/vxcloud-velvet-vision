// Parser simples para arquivos OFX (SGML) - extrai transações STMTTRN
export interface OfxTransaction {
  trnType: string; // PAYMENT | CREDIT | DEBIT | etc.
  dtPosted: string; // YYYY-MM-DD
  trnAmt: number;
  fitId: string;
  memo: string;
  name: string;
}

const getTag = (block: string, tag: string): string => {
  const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
};

const parseOfxDate = (raw: string): string => {
  // formatos comuns: YYYYMMDD ou YYYYMMDDHHMMSS[...]
  const clean = raw.replace(/\[.*\]/, "").trim();
  if (clean.length < 8) return "";
  const y = clean.slice(0, 4);
  const m = clean.slice(4, 6);
  const d = clean.slice(6, 8);
  return `${y}-${m}-${d}`;
};

export const parseOfx = (content: string): OfxTransaction[] => {
  const transactions: OfxTransaction[] = [];
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const block = match[1];
    const trnType = getTag(block, "TRNTYPE").toUpperCase();
    const dtPosted = parseOfxDate(getTag(block, "DTPOSTED"));
    const trnAmt = parseFloat(getTag(block, "TRNAMT")) || 0;
    const fitId = getTag(block, "FITID");
    const memo = getTag(block, "MEMO");
    const name = getTag(block, "NAME");
    transactions.push({ trnType, dtPosted, trnAmt, fitId, memo, name });
  }
  return transactions;
};

// Normaliza string para comparação (sem acentos, lowercase)
const normalize = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Similaridade simples por sobreposição de tokens
export const findBestPessoaMatch = <T extends { id: string; nome: string }>(
  nameOfx: string,
  pessoas: T[],
): T | null => {
  if (!nameOfx || pessoas.length === 0) return null;
  const target = normalize(nameOfx);
  const targetTokens = new Set(target.split(/\s+/).filter((t) => t.length > 2));
  if (targetTokens.size === 0) return null;

  let best: T | null = null;
  let bestScore = 0;
  for (const p of pessoas) {
    const candidate = normalize(p.nome);
    if (candidate === target) return p;
    const candidateTokens = candidate.split(/\s+/).filter((t) => t.length > 2);
    let hits = 0;
    for (const t of candidateTokens) {
      if (targetTokens.has(t)) hits += 1;
    }
    const score = hits / Math.max(targetTokens.size, candidateTokens.length);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  // exige no mínimo 60% de sobreposição
  return bestScore >= 0.6 ? best : null;
};
