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

// Palavras de operação bancária comuns que não fazem parte do nome
const PALAVRAS_OPERACAO = new Set([
  "pix", "ted", "doc", "tef", "enviado", "enviada", "recebido", "recebida", "pagamento", "pagamentos",
  "pagto", "pgto", "transferencia", "transf", "deposito", "dep", "credito", "debito", "cred", "deb",
  "boleto", "tarifa", "compra", "saque", "estorno", "devolucao", "qrcode", "qr", "code", "agendado",
  "agendada", "entre", "contas", "conta", "para", "de", "via", "app", "internet", "banking", "ib",
  "liquidacao", "titulo", "cobranca", "convenio", "debito", "automatico", "remetente", "favorecido",
]);

const somenteDigitos = (s: string | null | undefined): string => (s || "").replace(/\D/g, "");

// Extrai CPF/CNPJ (formatado ou só dígitos) e o nome da pessoa contidos no MEMO
export const extrairPessoaDoMemo = (memo: string): { nome: string; documento: string } => {
  if (!memo) return { nome: "", documento: "" };
  const reDoc = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;
  const m = memo.match(reDoc);
  let documento = "";
  let texto = memo;
  if (m) {
    const dig = somenteDigitos(m[0]);
    if (dig.length === 11 || dig.length === 14) {
      documento = dig;
      texto = memo.slice(0, m.index);
    }
  }
  // Remove códigos com dígitos (ex.: 104.3880.JOSE -> JOSE) e palavras de operação
  const tokens = texto
    .replace(/[\d./\\\-_:*]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let inicio = 0;
  while (inicio < tokens.length && PALAVRAS_OPERACAO.has(normalize(tokens[inicio]))) inicio += 1;
  let nomeTokens = tokens.slice(inicio);
  // Se o primeiro nome se repete (ex.: "JOSE C F D JOSE CLEITON"), usa a última ocorrência
  if (nomeTokens.length > 2) {
    const primeiro = normalize(nomeTokens[0]);
    const ultimaPos = nomeTokens.map((t) => normalize(t)).lastIndexOf(primeiro);
    if (ultimaPos > 0 && nomeTokens.length - ultimaPos >= 2) nomeTokens = nomeTokens.slice(ultimaPos);
  }
  return { nome: nomeTokens.join(" ").trim(), documento };
};

// Busca a pessoa pelo CPF/CNPJ do MEMO; se não achar, pelo nome
export const findPessoaPorMemo = <T extends { id: string; nome: string; cpf_cnpj?: string | null }>(
  memo: string,
  nameOfx: string,
  pessoas: T[],
): { pessoa: T | null; nomeExtraido: string } => {
  const { nome, documento } = extrairPessoaDoMemo(memo);
  if (documento) {
    const porDoc = pessoas.find((p) => somenteDigitos(p.cpf_cnpj) === documento);
    if (porDoc) return { pessoa: porDoc, nomeExtraido: nome || porDoc.nome };
  }
  const porNome =
    (nome && findBestPessoaMatch(nome, pessoas)) ||
    (nameOfx && findBestPessoaMatch(nameOfx, pessoas)) ||
    null;
  return { pessoa: porNome, nomeExtraido: nome || nameOfx };
};
