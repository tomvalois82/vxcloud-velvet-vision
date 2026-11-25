// Edge Function: renave — operações do RENAVE (veículos usados emplacados).
// POST JSON { acao, id_processo?, ... }. Erros de negócio voltam HTTP 200 { ok:false, erro }.
// REGRAS:
//  - O ambiente é SEMPRE o do processo (renave_estoque.ambiente), nunca o atual da empresa.
//  - Homologação: chamadas sem certificado ("Estabelecimento padrão de teste"). Produção: certificado A1 do Vault.
//  - Código de segurança do CRV nunca volta ao front nem vai para o log.
//  - O RENAVE é opcional e nunca trava compra/venda: esta função só é chamada sob demanda.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type AmbienteRenave,
  carregarCertificadoEmpresa,
  chamarRenave,
  type DadosCertificado,
  ErroRenave,
  mensagemStatusRenave,
  type RespostaRenave,
  soDocumento,
} from "../_shared/renave.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const falha = (erro: string, extra: Record<string, unknown> = {}) => json({ ok: false, erro, ...extra });

// deno-lint-ignore no-explicit-any
type Any = any;
const BUCKET = "renave-docs";
const TRAVA_MS = 3 * 60_000;
const TIMEOUT_POST = 110_000; // Edge Function tem 150 s no total
const ACOES_COM_TRAVA = new Set([
  "entrada", "assinatura", "verificar_assinatura", "nf_entrada", "sincronizar", "cancelar_entrada",
  "codigo_crv", "saida", "atpv", "nf_saida", "cancelar_saida", "termo",
]);
const ACOES_GERENTE = new Set(["cancelar_entrada", "cancelar_saida"]);

// ---------- utilidades ----------
const fmtSP = (d: Date, comHora: boolean) => {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    ...(comHora ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } : {}),
  }).format(d);
  return comHora ? s.replace(" ", "T") : s;
};
const hojeSP = () => fmtSP(new Date(), false);
/** RENAVE lê data-hora como horário de Brasília, sem fuso. */
const dataHoraSP = (d: Date) => fmtSP(d, true);

const placaNorm = (p: unknown) => String(p ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const EMAIL_RE = /^[-A-Za-z0-9_.]+@[-A-Za-z0-9_]+\.[-A-Za-z0-9_.]+$/;
const emailOk = (e: unknown) => (typeof e === "string" && EMAIL_RE.test(e.trim()) ? e.trim() : undefined);
/** Texto no padrão aceito pelo RENAVE (sem acentos estranhos, tamanho máximo). */
const txt = (v: unknown, max: number) => {
  const s = String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9=+\-/*_|()[\]{}<>#%&@'".:;,!?$ ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return s ? s.slice(0, max).trim() : undefined;
};

export function chaveNfeValida(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  let soma = 0, peso = 2;
  for (let i = 42; i >= 0; i--) { soma += Number(chave[i]) * peso; peso = peso === 9 ? 2 : peso + 1; }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(chave[43]);
}

function base64ParaBytes(b64: string): Uint8Array {
  const limpo = b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  const bin = atob(limpo);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Remove código de segurança e arquivos base64 antes de gravar no banco/log. */
function limpar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(limpar);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (/codigoSeguranca/i.test(k)) o[k] = x ? "***" : x;
      else if (/base64/i.test(k)) o[k] = typeof x === "string" ? `<${Math.round(x.length * 0.75)} bytes>` : x;
      else o[k] = limpar(x);
    }
    return o;
  }
  return v;
}

/** Mensagem de erro do RENAVE para o usuário. */
function erroDe(r: RespostaRenave): string {
  const j = r.json as Any;
  let m: unknown = j?.mensagemParaUsuarioFinal || j?.detalhe || j?.erro;
  if (typeof m === "string" && m.trim().startsWith("{")) {
    try { const k = JSON.parse(m); m = k.mensagemParaUsuarioFinal || k.detalhe || k.erro || m; } catch { /* mantém */ }
  }
  if (r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403 && typeof m === "string" && m.trim()) {
    return m.trim();
  }
  return mensagemStatusRenave(r);
}

// ---------- contexto ----------
interface Ctx {
  admin: Any;
  idEmpresa: string;
  idUsuario: string;
  empresa: Any;
  cpfOperador: string | null;
}

async function cert(ctx: Ctx, ambiente: AmbienteRenave): Promise<DadosCertificado | null> {
  if (ambiente === "homologacao") return null;
  const c = await carregarCertificadoEmpresa(ctx.admin, ctx.idEmpresa);
  if (!c) throw new ErroRenave("Envie o certificado A1 em Configurações → Empresa → RENAVE antes de operar em produção.");
  return c;
}

async function api(
  ctx: Ctx, proc: Any | null, ambiente: AmbienteRenave, operacao: string,
  metodo: "GET" | "POST", caminho: string, corpo?: unknown,
): Promise<RespostaRenave> {
  const r = await chamarRenave({
    ambiente, caminho, metodo, corpo, certificado: await cert(ctx, ambiente),
    timeoutMs: metodo === "POST" ? TIMEOUT_POST : 60_000,
  });
  await ctx.admin.from("renave_log").insert({
    id_empresa: ctx.idEmpresa,
    id_renave_estoque: proc?.id ?? null,
    operacao,
    metodo,
    endpoint: `${ambiente}:${caminho.replace(/\/\d{11}(?=\/|$)/, "/<renavam>")}`,
    request_json: corpo === undefined ? null : limpar(corpo),
    http_status: r.status,
    response_json: r.json !== null ? limpar(r.json) : (r.texto ? { texto: r.texto.slice(0, 500) } : null),
    log_id_rastreabilidade: r.logIdRastreabilidade,
    duracao_ms: r.duracaoMs,
    id_usuario: ctx.idUsuario,
  });
  return r;
}

const ok2xx = (r: RespostaRenave) => r.status >= 200 && r.status < 300;
function exigirCpf(ctx: Ctx): string {
  if (!ctx.cpfOperador) {
    throw new ErroRenave(
      "Falta o CPF do operador. Cadastre seu CPF no seu usuário ou o CPF do operador padrão em Configurações → Empresa → RENAVE.",
    );
  }
  return ctx.cpfOperador;
}

async function atualizar(ctx: Ctx, id: string, campos: Record<string, unknown>) {
  const { error } = await ctx.admin.from("renave_estoque").update(campos).eq("id", id);
  if (error) throw error;
}

/** Converte o EstoqueJson do RENAVE nos campos do processo. */
function camposDoEstoque(j: Any): Record<string, unknown> {
  const ent = j?.entradaEstoque ?? {};
  const sai = j?.saidaEstoque ?? null;
  const canc = j?.cancelamentoEstoque ?? null;
  const saidaValida = sai && sai.motivo !== "CANCELAMENTO_ENTRADA" && !sai.cancelamentoSaidaEstoque;
  const c: Record<string, unknown> = {
    renave_id_estoque: j.id,
    estado: canc ? "CANCELADO" : j.estado,
    numero_termo_entrada: ent.numeroTermoEntradaEstoque ?? null,
    renave_json: limpar(j),
    ultimo_sync_em: new Date().toISOString(),
    ultimo_erro: null,
  };
  if (ent.chaveNotaFiscalEntrada) {
    c.chave_nfe_entrada = ent.chaveNotaFiscalEntrada;
    c.nfe_entrada_enviada_em = ent.dataHoraEnvioNotaFiscalEntrada ? new Date(ent.dataHoraEnvioNotaFiscalEntrada + "-03:00").toISOString() : new Date().toISOString();
  }
  if (saidaValida) {
    c.numero_termo_saida = sai.numeroTermoSaidaEstoque ?? null;
    if (sai.chaveNotaFiscalSaida) {
      c.chave_nfe_saida = sai.chaveNotaFiscalSaida;
      c.nfe_saida_enviada_em = sai.dataHoraEnvioNotaFiscalSaida ? new Date(sai.dataHoraEnvioNotaFiscalSaida + "-03:00").toISOString() : new Date().toISOString();
    }
  }
  if (canc) {
    c.cancelada_em = canc.dataHora ? new Date(String(canc.dataHora) + "-03:00").toISOString() : new Date().toISOString();
  }
  return c;
}

async function salvarDocumento(
  ctx: Ctx, proc: Any, tipo: string, numero: string | null, base64: string, ext: "pdf" | "jpg" | "png" | "xml",
): Promise<string> {
  const contentType = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", xml: "application/xml" }[ext];
  const path = `${ctx.idEmpresa}/${proc.id}/${tipo.toLowerCase()}${numero ? "-" + numero : ""}-${Date.now()}.${ext}`;
  const { error } = await ctx.admin.storage.from(BUCKET).upload(path, base64ParaBytes(base64), { contentType, upsert: true });
  if (error) throw error;
  await ctx.admin.from("renave_documento").insert({ id_empresa: ctx.idEmpresa, id_renave_estoque: proc.id, tipo, numero, storage_path: path });
  const { data } = await ctx.admin.storage.from(BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? "";
}

async function veiculoDoProcesso(ctx: Ctx, proc: Any) {
  const { data: e, error } = await ctx.admin.from("estoque").select("placa, renavam, chassi").eq("id", proc.id_estoque).single();
  if (error) throw error;
  const placa = placaNorm(e?.placa);
  const renavam = soDigitos(e?.renavam).padStart(11, "0");
  if (placa.length !== 7) throw new ErroRenave("Placa do veículo inválida no cadastro do estoque.");
  if (!/^\d{11}$/.test(renavam) || /^0+$/.test(renavam)) throw new ErroRenave("Renavam do veículo ausente ou inválido no cadastro do estoque.");
  return { placa, renavam };
}

// ---------- servidor ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, erro: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, erro: "Sem autorização" }, 401);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ ok: false, erro: "Sessão inválida. Entre novamente." }, 401);

  const doUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Any = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  const acao = String(body?.acao ?? "");

  const [{ data: idEmpresaUsuario }, { data: superAdm }, { data: podeGerenciar }] = await Promise.all([
    doUsuario.rpc("fn_empresa_usuario"),
    doUsuario.rpc("is_super_admin"),
    doUsuario.rpc("fn_renave_pode_gerenciar_certificado"),
  ]);

  let proc: Any = null;
  let travou = false;
  try {
    // Processo (quando houver) define empresa e ambiente.
    let idEmpresa = idEmpresaUsuario as string | null;
    if (body?.id_processo) {
      const { data, error } = await admin.from("renave_estoque").select("*").eq("id", body.id_processo).maybeSingle();
      if (error) throw error;
      if (!data) return falha("Processo RENAVE não encontrado.");
      if (!(superAdm === true || data.id_empresa === idEmpresaUsuario)) return json({ ok: false, erro: "Sem permissão para este processo." }, 403);
      proc = data;
      idEmpresa = data.id_empresa;
    }
    if (!idEmpresa) return falha("Seu usuário não está vinculado a uma empresa.");
    if (ACOES_GERENTE.has(acao) && podeGerenciar !== true) return json({ ok: false, erro: "Apenas super admin ou Gerente pode cancelar no RENAVE." }, 403);

    const [{ data: empresa }, { data: usuario }] = await Promise.all([
      admin.from("empresa").select("id, cnpj, renave_habilitado, renave_ambiente, renave_email, renave_cpf_operador").eq("id", idEmpresa).single(),
      admin.from("usuario").select("nome, cpf").eq("auth_id", user.id).maybeSingle(),
    ]);
    if (!empresa?.renave_habilitado) return falha("O RENAVE está desligado para esta empresa (Configurações → Empresa → RENAVE).");
    const ctx: Ctx = {
      admin, idEmpresa, idUsuario: user.id, empresa,
      cpfOperador: soDigitos(usuario?.cpf).length === 11 ? soDigitos(usuario?.cpf)
        : soDigitos(empresa?.renave_cpf_operador).length === 11 ? soDigitos(empresa.renave_cpf_operador) : null,
    };

    if (acao === "municipio") return await acaoMunicipio(ctx, body);
    if (!proc) return falha("Informe id_processo.");

    if (ACOES_COM_TRAVA.has(acao)) {
      const limite = new Date(Date.now() - TRAVA_MS).toISOString();
      const { data: t, error } = await admin.from("renave_estoque")
        .update({ em_processamento_desde: new Date().toISOString() })
        .eq("id", proc.id)
        .or(`em_processamento_desde.is.null,em_processamento_desde.lt.${limite}`)
        .select("id");
      if (error) throw error;
      if (!t?.length) return falha("Já existe uma operação RENAVE em andamento para este veículo. Aguarde alguns segundos e atualize.");
      travou = true;
    }

    const amb: AmbienteRenave = proc.ambiente === "producao" ? "producao" : "homologacao";
    let resultado: Record<string, unknown>;
    switch (acao) {
      case "aptidao": resultado = await acaoAptidao(ctx, proc, amb); break;
      case "entrada": resultado = await acaoEntrada(ctx, proc, amb); break;
      case "assinatura": resultado = await acaoAssinatura(ctx, proc, amb, body); break;
      case "verificar_assinatura": resultado = await acaoVerificarAssinatura(ctx, proc, amb); break;
      case "nf_entrada": resultado = await acaoNf(ctx, proc, amb, body, "COMPRA"); break;
      case "sincronizar": resultado = await acaoSincronizar(ctx, proc, amb); break;
      case "cancelar_entrada": resultado = await acaoCancelarEntrada(ctx, proc, amb, body); break;
      case "codigo_crv": resultado = await acaoCodigoCrv(ctx, proc, amb); break;
      case "saida": resultado = await acaoSaida(ctx, proc, amb); break;
      case "atpv": resultado = await acaoAtpv(ctx, proc, amb); break;
      case "nf_saida": resultado = await acaoNf(ctx, proc, amb, body, "VENDA"); break;
      case "cancelar_saida": resultado = await acaoCancelarSaida(ctx, proc, amb); break;
      case "termo": resultado = await acaoTermo(ctx, proc, amb, body); break;
      default: return falha("Ação inválida.");
    }
    const { data: atual } = await admin.from("vw_renave_estoque").select("*").eq("id", proc.id).maybeSingle();
    return json({ ok: true, ...resultado, processo: atual });
  } catch (e) {
    const msg = e instanceof ErroRenave ? e.message : null;
    if (proc?.id && msg) await admin.from("renave_estoque").update({ ultimo_erro: { mensagemParaUsuarioFinal: msg.slice(0, 1000), acao, em: new Date().toISOString() } }).eq("id", proc.id);
    if (msg) return falha(msg);
    console.error("renave erro:", acao, e);
    return json({ ok: false, erro: "Erro interno ao processar a operação RENAVE." }, 500);
  } finally {
    if (travou && proc?.id) await admin.from("renave_estoque").update({ em_processamento_desde: null }).eq("id", proc.id);
  }
});

// ---------- ações ----------
async function acaoMunicipio(ctx: Ctx, body: Any) {
  const uf = String(body?.uf ?? "").toUpperCase().trim();
  const nome = txt(body?.nome, 60);
  if (!/^[A-Z]{2}$/.test(uf) || !nome) return falha("Informe UF e nome do município.");
  const { data: cache } = await ctx.admin.from("renave_municipio").select("id, nome, uf").eq("uf", uf).ilike("nome", nome);
  if (cache?.length) return json({ ok: true, municipios: cache });
  const amb: AmbienteRenave = ctx.empresa.renave_ambiente === "producao" ? "producao" : "homologacao";
  const r = await api(ctx, null, amb, "MUNICIPIO", "GET", `/api/municipios?uf=${uf}&nome=${encodeURIComponent(nome)}`);
  if (!ok2xx(r)) return falha(erroDe(r));
  const lista = (Array.isArray(r.json) ? r.json : []) as Any[];
  if (lista.length) await ctx.admin.from("renave_municipio").upsert(lista.map((m) => ({ id: String(m.id), nome: m.nome, uf: m.uf })), { onConflict: "id" });
  return json({ ok: true, municipios: lista });
}

/** Resolve o código de município RENAVE do comprador (cadastro, cache ou API) e grava na pessoa. */
async function municipioDaPessoa(ctx: Ctx, amb: AmbienteRenave, pessoa: Any): Promise<number> {
  if (pessoa.id_municipio_renave) return Number(pessoa.id_municipio_renave);
  const uf = String(pessoa.estado ?? "").toUpperCase().trim();
  const nome = txt(pessoa.municipio, 60);
  if (!/^[A-Z]{2}$/.test(uf) || !nome) throw new ErroRenave("Cadastre UF e município no endereço do comprador.");
  let id: string | null = null;
  const { data: cache } = await ctx.admin.from("renave_municipio").select("id").eq("uf", uf).ilike("nome", nome);
  if (cache?.length === 1) id = cache[0].id;
  else {
    const r = await api(ctx, null, amb, "MUNICIPIO", "GET", `/api/municipios?uf=${uf}&nome=${encodeURIComponent(nome)}`);
    if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
    const lista = (Array.isArray(r.json) ? r.json : []) as Any[];
    if (lista.length) await ctx.admin.from("renave_municipio").upsert(lista.map((m) => ({ id: String(m.id), nome: m.nome, uf: m.uf })), { onConflict: "id" });
    const exato = lista.filter((m) => txt(m.nome, 60) === nome);
    if (exato.length === 1) id = String(exato[0].id);
    else if (lista.length === 1) id = String(lista[0].id);
  }
  if (!id) throw new ErroRenave(`Não encontrei o município "${pessoa.municipio}/${uf}" no RENAVE. Corrija o nome da cidade no cadastro do comprador.`);
  await ctx.admin.from("vx_pessoa").update({ id_municipio_renave: id }).eq("id", pessoa.id);
  return Number(id);
}

async function acaoAptidao(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  if (!proc.tipo_crv) throw new ErroRenave("Informe o tipo do CRV.");
  if (!/^\d{12}$/.test(String(proc.numero_crv ?? ""))) throw new ErroRenave("Informe o número do CRV (12 dígitos).");
  const q = new URLSearchParams({ placa, renavam, tipoCrv: proc.tipo_crv, numeroCrv: proc.numero_crv });
  const r = await api(ctx, proc, amb, "APTIDAO", "GET", `/api/aptidao-veiculo-estoque?${q}`);
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const j = r.json as Any;
  if (j?.comunicacaoComDetranFalhou) throw new ErroRenave("O RENAVE não conseguiu falar com o Detran agora. Tente de novo em alguns minutos.");
  const apto = j?.diagnostico?.veiculoApto === true;
  await atualizar(ctx, proc.id, { aptidao_apto: apto, aptidao_em: new Date().toISOString(), aptidao_json: limpar(j), ultimo_erro: null });
  return { apto, motivos: j?.diagnostico?.motivosParaNaoAptidao ?? [], debitos: j?.informacoesDebitos ?? null };
}

async function acaoEntrada(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  if (proc.renave_id_estoque) throw new ErroRenave("A entrada deste veículo já foi comunicada.");
  if (proc.estado === "CANCELADO") throw new ErroRenave("Processo cancelado. Inicie um novo processo.");
  const cpf = exigirCpf(ctx);
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  const { data: dono } = proc.id_pessoa_proprietario_crv
    ? await ctx.admin.from("vx_pessoa").select("nome, cpf_cnpj").eq("id", proc.id_pessoa_proprietario_crv).maybeSingle()
    : { data: null };
  const doc = soDocumento(dono?.cpf_cnpj);
  const faltas: string[] = [];
  if (doc.length !== 11 && doc.length !== 14) faltas.push("CPF/CNPJ do proprietário no CRV");
  if (!proc.data_entrada) faltas.push("data da compra");
  if (!(Number(proc.valor_entrada) > 0)) faltas.push("valor da compra");
  if (proc.km_entrada === null || proc.km_entrada === undefined) faltas.push("quilometragem");
  if (!proc.tipo_crv) faltas.push("tipo do CRV");
  if (!/^\d{12}$/.test(String(proc.numero_crv ?? ""))) faltas.push("número do CRV (12 dígitos)");
  if (!/^\d{11}$/.test(String(proc.codigo_seguranca_crv ?? ""))) faltas.push("código de segurança do CRV (11 dígitos)");
  if (faltas.length) throw new ErroRenave(`Preencha antes de comunicar a entrada: ${faltas.join(", ")}.`);
  if (proc.aptidao_apto === false) throw new ErroRenave("A última consulta de aptidão disse que o veículo NÃO está apto. Consulte a aptidão de novo.");

  // Hodômetro: nunca no futuro (RENAVE compara com horário de Brasília).
  const medicao = proc.data_medicao_hodometro ? new Date(proc.data_medicao_hodometro) : new Date();
  const medicaoOk = new Date(Math.min(medicao.getTime(), Date.now() - 60_000));
  const corpo = {
    cpfOperadorResponsavel: cpf,
    dataCompra: String(proc.data_entrada).slice(0, 10),
    valorCompra: Number(proc.valor_entrada),
    emailVendedor: emailOk(proc.email_vendedor),
    emailEstabelecimento: emailOk(ctx.empresa.renave_email),
    veiculo: {
      placa, renavam,
      numeroCrv: proc.numero_crv,
      codigoSegurancaCrv: proc.codigo_seguranca_crv,
      tipoCrv: proc.tipo_crv,
      quilometragemHodometro: Number(proc.km_entrada),
      dataHoraMedicaoHodometro: dataHoraSP(medicaoOk),
      documentoProprietarioAtual: doc,
      tipoDocumentoProprietarioAtual: doc.length === 11 ? "CPF" : "CNPJ",
    },
  };
  const r = await api(ctx, proc, amb, "ENTRADA", "POST", "/api/solicitacoes-entrada-estoque", corpo);
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  await atualizar(ctx, proc.id, { ...camposDoEstoque(r.json), entrada_em: new Date().toISOString() });
  return { mensagem: `Entrada comunicada. Estoque RENAVE nº ${(r.json as Any)?.id}.` };
}

async function acaoAssinatura(ctx: Ctx, proc: Any, amb: AmbienteRenave, body: Any) {
  if (!proc.renave_id_estoque) throw new ErroRenave("Comunique a entrada antes de enviar a assinatura do vendedor.");
  const foto = typeof body?.foto_base64 === "string" ? body.foto_base64 : "";
  const m = foto.match(/^data:(image\/jpeg|image\/png);base64,/);
  if (!m) throw new ErroRenave("Envie a foto do ATPVe assinado em JPG ou PNG.");
  const b64 = foto.slice(m[0].length).replace(/\s/g, "");
  if (b64.length > 7_000_000) throw new ErroRenave("Foto grande demais (máx. ~5 MB). Reduza a resolução.");
  const r = await api(ctx, proc, amb, "ASSINATURA_VENDEDOR", "POST", "/api/atpv-assinatura-vendedor", {
    idEstoque: proc.renave_id_estoque,
    envioAssinaturaProprioPunhoAtpve: { fotoAtpveAssinadoDeProprioPunhoBase64: b64 },
  });
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  await salvarDocumento(ctx, proc, "ASSINATURA_VENDEDOR", null, b64, m[1] === "image/png" ? "png" : "jpg");
  await atualizar(ctx, proc.id, { assinatura_tipo: "PROPRIO_PUNHO_ATPVE", assinatura_em: new Date().toISOString(), ultimo_erro: null });
  return { mensagem: "Assinatura do vendedor enviada." };
}

/** Confere no RENAVE se há assinatura do vendedor (inclusive a avançada feita pelo app CDT). */
async function acaoVerificarAssinatura(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  if (!proc.renave_id_estoque) throw new ErroRenave("Comunique a entrada antes.");
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  const r = await api(ctx, proc, amb, "CONSULTA_ASSINATURA", "GET", `/api/atpv-assinaturas/${placa}/${renavam}/ultimo`);
  if (r.status === 404) return { assinado: false, mensagem: "Ainda não há assinatura do vendedor no RENAVE." };
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const j = r.json as Any;
  // O registro mais recente pode ser de um ciclo antigo: só vale se for do mesmo CRV desta entrada.
  const mesmoCrv = j?.codigoSegurancaCrv && j.codigoSegurancaCrv === proc.codigo_seguranca_crv;
  const assinado = !!(mesmoCrv && j?.tipoAssinaturaVendedor);
  if (assinado) {
    await atualizar(ctx, proc.id, {
      assinatura_tipo: j.tipoAssinaturaVendedor,
      assinatura_em: j.dataHoraRegistroAssinaturaVendedor ? new Date(j.dataHoraRegistroAssinaturaVendedor + "-03:00").toISOString() : new Date().toISOString(),
      ultimo_erro: null,
    });
  }
  return {
    assinado,
    tipo: assinado ? j.tipoAssinaturaVendedor : null,
    mensagem: assinado ? `Assinatura do vendedor encontrada (${j.tipoAssinaturaVendedor}).` : "Ainda não há assinatura do vendedor para este CRV.",
  };
}

async function acaoNf(ctx: Ctx, proc: Any, amb: AmbienteRenave, body: Any, evento: "COMPRA" | "VENDA") {
  if (!proc.renave_id_estoque) throw new ErroRenave("Comunique a entrada antes.");
  if (evento === "VENDA" && !proc.saida_em) throw new ErroRenave("Comunique a saída antes de enviar a NF de venda.");
  const chave = soDigitos(body?.chave);
  if (!chaveNfeValida(chave)) throw new ErroRenave("Chave da NF-e inválida: são 44 dígitos e o dígito verificador não confere.");
  const r = await api(ctx, proc, amb, evento === "COMPRA" ? "NF_ENTRADA" : "NF_SAIDA", "POST", "/api/notas-fiscais", {
    idEstoque: proc.renave_id_estoque, evento, chaveNotaFiscal: chave,
  });
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  await atualizar(ctx, proc.id, evento === "COMPRA"
    ? { chave_nfe_entrada: chave, nfe_entrada_enviada_em: new Date().toISOString(), ultimo_erro: null }
    : { chave_nfe_saida: chave, nfe_saida_enviada_em: new Date().toISOString(), ultimo_erro: null });
  return { mensagem: evento === "COMPRA" ? "NF de entrada enviada." : "NF de saída enviada." };
}

async function acaoSincronizar(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  let j: Any = null;
  if (proc.renave_id_estoque) {
    const r = await api(ctx, proc, amb, "CONSULTA_ESTOQUE", "GET", `/api/estoques/${proc.renave_id_estoque}`);
    if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
    j = r.json;
  } else {
    // Recupera uma entrada que deu certo no RENAVE mas não chegou a ser gravada (ex.: queda de conexão).
    const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
    const r = await api(ctx, proc, amb, "CONSULTA_ESTOQUE", "GET", `/api/estoques?placa=${placa}`);
    if (r.status === 404) return { mensagem: "Nenhuma entrada deste veículo no RENAVE." };
    if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
    const lista = (Array.isArray(r.json) ? r.json : []) as Any[];
    j = lista.filter((x) => x.renavam === renavam && !x.cancelamentoEstoque && x.estado !== "FINALIZADO")
      .sort((a, b) => b.id - a.id)[0] ?? null;
    if (!j) return { mensagem: "Nenhuma entrada em aberto deste veículo no RENAVE." };
    const { data: outro } = await ctx.admin.from("renave_estoque").select("id").eq("ambiente", amb).eq("renave_id_estoque", j.id).maybeSingle();
    if (outro) throw new ErroRenave("Esta entrada do RENAVE já está vinculada a outro processo.");
  }
  const campos = camposDoEstoque(j);
  if (!proc.entrada_em) campos.entrada_em = new Date().toISOString();
  await atualizar(ctx, proc.id, campos);
  return { mensagem: `Situação atualizada: ${campos.estado}.` };
}

async function acaoCancelarEntrada(ctx: Ctx, proc: Any, amb: AmbienteRenave, body: Any) {
  if (!proc.renave_id_estoque) throw new ErroRenave("A entrada ainda não foi comunicada; basta excluir o processo.");
  if (proc.saida_em) throw new ErroRenave("Cancele a saída antes de cancelar a entrada.");
  if (proc.estado === "CANCELADO") throw new ErroRenave("A entrada já está cancelada.");
  const cpf = exigirCpf(ctx);
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  const r = await api(ctx, proc, amb, "CANCELAR_ENTRADA", "POST", "/api/solicitacoes-cancelamento-estoque", {
    cpfOperadorResponsavel: cpf,
    dataCancelamentoEstoque: hojeSP(),
    veiculo: { placa, renavam, numeroCrv: proc.numero_crv, codigoSegurancaCrv: proc.codigo_seguranca_crv },
  });
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const campos = camposDoEstoque(r.json);
  campos.estado = "CANCELADO";
  campos.cancelada_em ??= new Date().toISOString();
  campos.motivo_cancelamento = txt(body?.motivo, 500) ?? "Cancelamento de entrada";
  await atualizar(ctx, proc.id, campos);
  return { mensagem: "Entrada cancelada no RENAVE." };
}

/** PDF com o código de segurança do CRV novo (emitido pelo Detran em nome da loja). Só funciona depois de CONFIRMADO. */
async function acaoCodigoCrv(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  const r = await api(ctx, proc, amb, "PDF_CODIGO_CRV", "GET", `/api/crlve/${placa}/${renavam}/pdf-codigo-seguranca-crv`);
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const j = r.json as Any;
  if (!j?.pdfCodigoSegurancaCrvBase64) throw new ErroRenave("O RENAVE não devolveu o PDF do código de segurança.");
  const link = await salvarDocumento(ctx, proc, "CODIGO_SEGURANCA_CRV", j.numeroCrv ?? null, j.pdfCodigoSegurancaCrvBase64, "pdf");
  if (/^\d{12}$/.test(String(j.numeroCrv ?? "")) && !proc.saida_em) await atualizar(ctx, proc.id, { numero_crv_saida: j.numeroCrv });
  return { url: link, numero_crv: j.numeroCrv ?? null, mensagem: "Abra o PDF e digite o código de segurança do CRV novo antes de comunicar a saída." };
}

async function acaoSaida(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  if (!proc.renave_id_estoque) throw new ErroRenave("Comunique a entrada antes.");
  if (proc.saida_em) throw new ErroRenave("A saída já foi comunicada.");
  if (proc.estado !== "CONFIRMADO") throw new ErroRenave("O Detran ainda não confirmou a entrada. Clique em Atualizar situação e tente de novo depois.");
  if (!proc.nfe_entrada_enviada_em) throw new ErroRenave("Envie a NF de entrada antes da saída.");
  if (!proc.assinatura_em) throw new ErroRenave("Envie ou confirme a assinatura do vendedor antes da saída.");
  const cpf = exigirCpf(ctx);
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  const codigo = proc.codigo_seguranca_crv_saida ?? proc.codigo_seguranca_crv;
  const numeroCrv = proc.numero_crv_saida ?? proc.numero_crv;
  if (!/^\d{11}$/.test(String(codigo ?? ""))) throw new ErroRenave("Informe o código de segurança do CRV novo (11 dígitos).");

  const { data: pc } = proc.id_pessoa_comprador
    ? await ctx.admin.from("vx_pessoa").select("*").eq("id", proc.id_pessoa_comprador).maybeSingle()
    : { data: null };
  const doc = soDocumento(pc?.cpf_cnpj);
  const faltas: string[] = [];
  if (!pc) faltas.push("comprador");
  else if (doc.length !== 11 && doc.length !== 14) faltas.push("CPF/CNPJ do comprador");
  if (!proc.data_saida) faltas.push("data da venda");
  if (!(Number(proc.valor_saida) > 0)) faltas.push("valor da venda");
  if (faltas.length) throw new ErroRenave(`Preencha antes de comunicar a saída: ${faltas.join(", ")}.`);
  const codMunicipio = await municipioDaPessoa(ctx, amb, pc);
  const cep = soDigitos(pc.cep);

  const corpo = {
    cpfOperadorResponsavel: cpf,
    dataVenda: String(proc.data_saida).slice(0, 10),
    valorVenda: Number(proc.valor_saida),
    emailEstabelecimento: emailOk(ctx.empresa.renave_email),
    comprador: {
      tipoDocumento: doc.length === 11 ? "CPF" : "CNPJ",
      numeroDocumento: doc,
      nome: txt(pc.nome, 40),
      email: emailOk(pc.email),
      endereco: {
        codigoMunicipio: codMunicipio,
        cep: cep.length === 8 ? cep : undefined,
        logradouro: txt(pc.logradouro, 30),
        numero: txt(pc.numero, 5),
        complemento: txt(pc.complemento, 20),
        bairro: txt(pc.bairro, 20),
      },
    },
    veiculo: { placa, renavam, numeroCrv: /^\d{12}$/.test(String(numeroCrv ?? "")) ? numeroCrv : undefined, codigoSegurancaCrv: codigo },
  };
  const r = await api(ctx, proc, amb, "SAIDA", "POST", "/api/solicitacoes-saida-estoque", corpo);
  if (!ok2xx(r)) {
    const m = erroDe(r);
    if (/c[óo]digo de seguran[çc]a/i.test(m)) {
      throw new ErroRenave(`${m.replace(/Mensagem do Detran:\s*$/, "").trim()} Depois da confirmação do Detran o CRV é reemitido em nome da loja: use "Buscar código do CRV novo" e digite o código novo.`);
    }
    throw new ErroRenave(m);
  }
  await atualizar(ctx, proc.id, { ...camposDoEstoque(r.json), saida_em: new Date().toISOString() });
  // ATPVe da saída (não bloqueia se falhar).
  let atpv: Record<string, unknown> = {};
  try { atpv = await acaoAtpv(ctx, { ...proc, saida_em: new Date().toISOString() }, amb); } catch (e) { console.warn("atpv pós-saída:", e); }
  return { mensagem: "Saída comunicada. Envie a NF de venda.", ...atpv };
}

async function acaoAtpv(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  const { placa, renavam } = await veiculoDoProcesso(ctx, proc);
  const r = await api(ctx, proc, amb, "PDF_ATPV", "GET", `/api/pdf-atpv/${placa}/${renavam}`);
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const j = r.json as Any;
  if (!j?.pdfAtpvBase64) throw new ErroRenave("O RENAVE não devolveu o PDF do ATPVe.");
  const tipo = proc.saida_em ? "ATPVE_SAIDA" : "ATPVE_ENTRADA";
  const link = await salvarDocumento(ctx, proc, tipo, j.numeroAtpv ?? null, j.pdfAtpvBase64, "pdf");
  if (j.xmlAtpvBase64) await salvarDocumento(ctx, proc, "XML_ATPVE", j.numeroAtpv ?? null, j.xmlAtpvBase64, "xml");
  await atualizar(ctx, proc.id, { numero_atpv: j.numeroAtpv ?? null });
  return { url: link, numero_atpv: j.numeroAtpv ?? null };
}

async function acaoCancelarSaida(ctx: Ctx, proc: Any, amb: AmbienteRenave) {
  if (!proc.saida_em) throw new ErroRenave("A saída não foi comunicada.");
  const cpf = exigirCpf(ctx);
  const r = await api(ctx, proc, amb, "CANCELAR_SAIDA", "POST", "/api/solicitacoes-cancelamento-saida-estoque", {
    idEstoque: proc.renave_id_estoque, cpfOperadorResponsavel: cpf, dataCancelamentoSaidaEstoque: hojeSP(),
  });
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const j = r.json as Any;
  // O cancelamento da saída gera um NOVO estoque no RENAVE; o processo passa a apontar para ele.
  const novoId = j?.saidaEstoque?.cancelamentoSaidaEstoque?.idEstoqueGeradoNoCancelamentoSaida
    ?? (j?.id && j.id !== proc.renave_id_estoque ? j.id : null);
  let novo: Any = j?.id === novoId ? j : null;
  if (novoId && !novo) {
    const g = await api(ctx, proc, amb, "CONSULTA_ESTOQUE", "GET", `/api/estoques/${novoId}`);
    if (ok2xx(g)) novo = g.json;
  }
  const base = {
    renave_id_estoque_anterior: proc.renave_id_estoque,
    saida_em: null, numero_termo_saida: null, chave_nfe_saida: null, nfe_saida_enviada_em: null, numero_atpv: null,
  };
  await atualizar(ctx, proc.id, novo ? { ...camposDoEstoque(novo), ...base } : { ...base, renave_id_estoque: novoId ?? proc.renave_id_estoque, estado: "CONFIRMADO", renave_json: limpar(j) });
  return { mensagem: `Saída cancelada. O veículo voltou ao estoque no RENAVE${novoId ? ` (novo nº ${novoId})` : ""}.` };
}

async function acaoTermo(ctx: Ctx, proc: Any, amb: AmbienteRenave, body: Any) {
  if (!proc.renave_id_estoque) throw new ErroRenave("Comunique a entrada antes.");
  const saida = body?.tipo === "saida";
  if (saida && !proc.saida_em) throw new ErroRenave("A saída não foi comunicada.");
  const r = await api(ctx, proc, amb, saida ? "TERMO_SAIDA" : "TERMO_ENTRADA", "GET",
    `/api/estoques/${proc.renave_id_estoque}/${saida ? "termo-saida-estoque" : "termo-entrada-estoque"}`);
  if (!ok2xx(r)) throw new ErroRenave(erroDe(r));
  const j = r.json as Any;
  if (!j?.pdfBase64) throw new ErroRenave("O RENAVE não devolveu o PDF do termo.");
  const numero = String((saida ? j.numeroTermoSaidaEstoque : j.numeroTermoEntradaEstoque) ?? "") || null;
  const link = await salvarDocumento(ctx, proc, saida ? "TERMO_SAIDA" : "TERMO_ENTRADA", numero, j.pdfBase64, "pdf");
  return { url: link, numero };
}
