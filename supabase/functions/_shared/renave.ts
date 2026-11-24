// Módulo compartilhado do RENAVE: abrir o certificado A1 (.pfx), montar o cliente mTLS e chamar a API.
// Usado por renave-certificado e, depois, pela função principal do RENAVE.
// IMPORTANTE: usar Deno.createHttpClient. node:https com certificado TRAVA no Supabase Edge Runtime (testado).

import forge from "npm:node-forge@1.3.1";
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export const RENAVE_BASE = {
  homologacao: "https://hom.renave.estaleiro.serpro.gov.br/renave-ws",
  producao: "https://renave.estaleiro.serpro.gov.br/renave-ws",
} as const;
export type AmbienteRenave = keyof typeof RENAVE_BASE;

/** Erro com mensagem pronta para o usuário final. */
export class ErroRenave extends Error {}

export const soDocumento = (v: unknown) => String(v ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();

export function base64ParaBinario(b64: string): string {
  return forge.util.decode64(String(b64).replace(/^data:[^,]*,/, "").replace(/\s/g, ""));
}
export const binarioParaBase64 = (bin: string) => forge.util.encode64(bin);

// ---------- Certificado ----------

// OIDs ICP-Brasil no subjectAltName (otherName):
// 2.16.76.1.3.3 = CNPJ da pessoa jurídica (e-CNPJ); 2.16.76.1.3.1 = dados do titular pessoa física (e-CPF).
const OID_CNPJ_DER = String.fromCharCode(0x06, 0x05, 0x60, 0x4c, 0x01, 0x03, 0x03);
const OID_ECPF_DER = String.fromCharCode(0x06, 0x05, 0x60, 0x4c, 0x01, 0x03, 0x01);

function valorOtherName(der: string, oidDer: string): string | null {
  let i = der.indexOf(oidDer);
  while (i >= 0) {
    let p = i + oidDer.length;
    if (der.charCodeAt(p) === 0xa0 && der.charCodeAt(p + 1) < 0x80) {
      p += 2;
      const tag = der.charCodeAt(p);
      const len = der.charCodeAt(p + 1);
      if ([0x04, 0x0c, 0x13, 0x16].includes(tag) && len < 0x80) return der.substr(p + 2, len);
    }
    i = der.indexOf(oidDer, i + 1);
  }
  return null;
}

export interface DadosCertificado {
  certPem: string; // folha + cadeia, em PEM
  keyPem: string; // chave privada PKCS#8 em PEM
  tipo: "e-CNPJ" | "e-CPF" | "desconhecido";
  cnpj: string | null;
  titular: string | null;
  emissor: string | null;
  numeroSerie: string;
  validoDe: Date;
  validoAte: Date;
}

export function abrirPfx(pfxBinario: string, senha: string): DadosCertificado {
  // deno-lint-ignore no-explicit-any
  let p12: any;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfxBinario), false, senha);
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    if (/MAC could not be verified|Invalid password/i.test(m)) throw new ErroRenave("Senha do certificado incorreta.");
    if (/unsupported|not supported/i.test(m)) {
      throw new ErroRenave(`O arquivo usa uma criptografia que o sistema ainda não abre (${m}). Fale com o suporte.`);
    }
    throw new ErroRenave(`Arquivo inválido: não foi possível ler como certificado .pfx/.p12 (${m}).`);
  }

  const oids = forge.pki.oids;
  const keyBag =
    (p12.getBags({ bagType: oids.pkcs8ShroudedKeyBag })[oids.pkcs8ShroudedKeyBag] ?? [])[0] ??
    (p12.getBags({ bagType: oids.keyBag })[oids.keyBag] ?? [])[0];
  if (!keyBag?.key) throw new ErroRenave("O arquivo não contém a chave privada. Exporte o certificado A1 com a chave privada (.pfx).");
  const key = keyBag.key as forge.pki.rsa.PrivateKey;

  // deno-lint-ignore no-explicit-any
  const certBags = (p12.getBags({ bagType: oids.certBag })[oids.certBag] ?? []).filter((b: any) => b.cert);
  if (certBags.length === 0) throw new ErroRenave("O arquivo não contém o certificado.");
  const folhaBag =
    // deno-lint-ignore no-explicit-any
    certBags.find((b: any) => (b.cert.publicKey as forge.pki.rsa.PublicKey).n?.equals(key.n)) ?? certBags[0];
  // deno-lint-ignore no-explicit-any
  const cadeia = [folhaBag, ...certBags.filter((b: any) => b !== folhaBag)];
  const folha = folhaBag.cert as forge.pki.Certificate;

  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(folha)).getBytes();
  const cnpjSan = valorOtherName(der, OID_CNPJ_DER);
  const ehCpf = valorOtherName(der, OID_ECPF_DER) !== null;
  const titular = (folha.subject.getField("CN")?.value as string) ?? null;
  let cnpj = cnpjSan ? soDocumento(cnpjSan) : null;
  if (!cnpj && titular) {
    const m = titular.match(/:\s*([0-9A-Z]{12}\d{2})\s*$/i);
    if (m && !ehCpf) cnpj = m[1].toUpperCase();
  }
  if (cnpj && cnpj.length !== 14) cnpj = null;

  return {
    // deno-lint-ignore no-explicit-any
    certPem: cadeia.map((b: any) => forge.pki.certificateToPem(b.cert)).join(""),
    keyPem: forge.pki.privateKeyInfoToPem(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(key))),
    tipo: cnpj ? "e-CNPJ" : ehCpf ? "e-CPF" : "desconhecido",
    cnpj,
    titular,
    emissor: (folha.issuer.getField("CN")?.value as string) ?? null,
    numeroSerie: folha.serialNumber,
    validoDe: folha.validity.notBefore,
    validoAte: folha.validity.notAfter,
  };
}

/** Lê do Vault o certificado ativo da empresa (requer cliente service_role). */
export async function carregarCertificadoEmpresa(admin: SupabaseClient, idEmpresa: string): Promise<DadosCertificado | null> {
  const { data, error } = await admin.rpc("fn_renave_certificado_obter", { p_id_empresa: idEmpresa });
  if (error) throw new Error(`Falha ao ler certificado: ${error.message}`);
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha?.pfx_base64) return null;
  return abrirPfx(base64ParaBinario(linha.pfx_base64), linha.senha);
}

// ---------- Chamada HTTP ----------

export interface RespostaRenave {
  status: number;
  json: unknown;
  texto: string;
  duracaoMs: number;
  logIdRastreabilidade: string | null;
}

export async function chamarRenave(opts: {
  ambiente: AmbienteRenave;
  caminho: string; // ex.: "/api/cliente-autenticado"
  metodo?: "GET" | "POST";
  corpo?: unknown;
  certificado?: Pick<DadosCertificado, "certPem" | "keyPem"> | null;
  timeoutMs?: number;
}): Promise<RespostaRenave> {
  const metodo = opts.metodo ?? "GET";
  // Manual: GET até 1 min, POST até 2 min. A Edge Function tem limite de 150 s no total.
  const timeoutMs = opts.timeoutMs ?? (metodo === "POST" ? 120_000 : 60_000);
  // deno-lint-ignore no-explicit-any
  const client = opts.certificado
    ? (Deno as any).createHttpClient({
      cert: opts.certificado.certPem,
      key: opts.certificado.keyPem,
      certChain: opts.certificado.certPem, // nomes antigos da API (compatibilidade)
      privateKey: opts.certificado.keyPem,
    })
    : undefined;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(RENAVE_BASE[opts.ambiente] + opts.caminho, {
      method: metodo,
      headers: { Accept: "application/json", ...(opts.corpo !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: opts.corpo !== undefined ? JSON.stringify(opts.corpo) : undefined,
      signal: ac.signal,
      // deno-lint-ignore no-explicit-any
      ...(client ? { client } as any : {}),
    });
    const texto = await res.text();
    let json: unknown = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { /* não é JSON */ }
    // deno-lint-ignore no-explicit-any
    const j = json as any;
    return {
      status: res.status,
      json,
      texto: texto.slice(0, 4000),
      duracaoMs: Math.round(performance.now() - t0),
      logIdRastreabilidade: j?.logIdRastreabilidade ?? null,
    };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new ErroRenave(`O RENAVE não respondeu em ${timeoutMs / 1000} s.`);
    throw e;
  } finally {
    clearTimeout(t);
    try { client?.close(); } catch { /* ignore */ }
  }
}

/** Texto amigável para o status HTTP devolvido pelo RENAVE. */
export function mensagemStatusRenave(r: RespostaRenave): string {
  // deno-lint-ignore no-explicit-any
  const j = r.json as any;
  if (r.status >= 200 && r.status < 300) return "OK";
  if (r.status === 401) return "O RENAVE recusou a conexão: nenhum certificado válido foi apresentado.";
  if (r.status === 495 || r.status === 496) {
    return "O RENAVE não aceitou o certificado. Confira se ele está cadastrado no Credencia (Senatran) para este estabelecimento.";
  }
  if (r.status === 403) return "O certificado foi aceito, mas o estabelecimento não tem permissão para esta operação no RENAVE.";
  if (r.status === 422 && j?.mensagemParaUsuarioFinal) return String(j.mensagemParaUsuarioFinal);
  if (r.status >= 500) return `Erro no RENAVE (HTTP ${r.status})${r.logIdRastreabilidade ? `, rastreio ${r.logIdRastreabilidade}` : ""}.`;
  return `Resposta inesperada do RENAVE (HTTP ${r.status}).`;
}
