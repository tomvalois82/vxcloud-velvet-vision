// Edge Function: renave-certificado
// Ações (POST JSON):
//   { acao: "enviar", pfx_base64, senha }  -> valida o A1 e guarda no Vault (só super admin ou Gerente)
//   { acao: "remover" }                     -> apaga o certificado ativo do Vault (só super admin ou Gerente)
//   { acao: "testar" }                      -> GET /api/cliente-autenticado no ambiente configurado na empresa
// Erros de negócio voltam com HTTP 200 e { ok: false, erro } para o front exibir direto.
// O certificado e a senha NUNCA são devolvidos ao front.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  abrirPfx,
  type AmbienteRenave,
  base64ParaBinario,
  binarioParaBase64,
  carregarCertificadoEmpresa,
  chamarRenave,
  ErroRenave,
  mensagemStatusRenave,
  soDocumento,
} from "../_shared/renave.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const falha = (erro: string, extra: Record<string, unknown> = {}) => json({ ok: false, erro, ...extra });

const TAMANHO_MAX_BASE64 = 100_000; // ~75 KB de .pfx (um A1 típico tem 3 a 10 KB)
const DIA_MS = 86_400_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, erro: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, erro: "Sem autorização" }, 401);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ ok: false, erro: "Sessão inválida. Entre novamente." }, 401);

  // Cliente com o JWT do usuário: as funções abaixo usam auth.uid().
  const doUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [{ data: idEmpresa }, { data: pode }] = await Promise.all([
    doUsuario.rpc("fn_empresa_usuario"),
    doUsuario.rpc("fn_renave_pode_gerenciar_certificado"),
  ]);
  if (!idEmpresa) return falha("Seu usuário não está vinculado a uma empresa.");
  if (!pode) return json({ ok: false, erro: "Apenas super admin ou Gerente pode gerenciar o certificado do RENAVE." }, 403);

  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch { /* sem corpo */ }

  try {
    switch (body?.acao) {
      case "enviar":
        return await enviar(admin, idEmpresa as string, user.id, body);
      case "remover": {
        const { data, error } = await admin.rpc("fn_renave_certificado_remover", { p_id_empresa: idEmpresa, p_por: user.id });
        if (error) throw error;
        return json({ ok: true, removido: data === true });
      }
      case "testar":
        return await testar(admin, idEmpresa as string, user.id);
      default:
        return falha("Ação inválida. Use enviar, remover ou testar.");
    }
  } catch (e) {
    if (e instanceof ErroRenave) return falha(e.message);
    console.error("renave-certificado erro:", e);
    return json({ ok: false, erro: "Erro interno ao processar o certificado." }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function enviar(admin: any, idEmpresa: string, idUsuario: string, body: any) {
  const pfxBase64 = typeof body?.pfx_base64 === "string" ? body.pfx_base64 : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";
  if (!pfxBase64) return falha("Selecione o arquivo do certificado (.pfx ou .p12).");
  if (!senha) return falha("Informe a senha do certificado.");
  if (pfxBase64.length > TAMANHO_MAX_BASE64) return falha("Arquivo grande demais para um certificado A1.");
  if (senha.length > 200) return falha("Senha inválida.");

  let binario: string;
  try { binario = base64ParaBinario(pfxBase64); } catch { return falha("Arquivo corrompido."); }
  const cert = abrirPfx(binario, senha);

  if (cert.tipo === "e-CPF") return falha("Este certificado é um e-CPF (pessoa física). O RENAVE exige o e-CNPJ da loja.");
  if (!cert.cnpj) return falha("Não encontrei o CNPJ dentro do certificado. Confirme que é um e-CNPJ A1 ICP-Brasil.");

  const { data: empresa, error: errEmp } = await admin.from("empresa").select("cnpj, razao_social").eq("id", idEmpresa).single();
  if (errEmp) throw errEmp;
  const cnpjEmpresa = soDocumento(empresa?.cnpj);
  if (cnpjEmpresa.length !== 14) return falha("Cadastre o CNPJ da empresa em Configurações → Empresa antes de enviar o certificado.");
  if (cert.cnpj !== cnpjEmpresa) {
    const mesmaRaiz = cert.cnpj.slice(0, 8) === cnpjEmpresa.slice(0, 8);
    return falha(
      mesmaRaiz
        ? `O certificado é de outro estabelecimento da mesma empresa (CNPJ ${cert.cnpj}). A empresa cadastrada é ${cnpjEmpresa}. O RENAVE identifica a loja pelo CNPJ exato do certificado.`
        : `O CNPJ do certificado (${cert.cnpj}) é diferente do CNPJ da empresa (${cnpjEmpresa}).`,
    );
  }

  const agora = Date.now();
  if (cert.validoAte.getTime() <= agora) return falha(`Certificado vencido em ${cert.validoAte.toLocaleDateString("pt-BR")}.`);
  if (cert.validoDe.getTime() > agora) return falha(`Certificado só passa a valer em ${cert.validoDe.toLocaleDateString("pt-BR")}.`);

  const { data: usuario } = await admin.from("usuario").select("nome").eq("auth_id", idUsuario).maybeSingle();

  const { data: idCertificado, error } = await admin.rpc("fn_renave_certificado_salvar", {
    p_id_empresa: idEmpresa,
    p_pfx_base64: binarioParaBase64(binario),
    p_senha: senha,
    p_cnpj: cert.cnpj,
    p_titular: cert.titular,
    p_emissor: cert.emissor,
    p_numero_serie: cert.numeroSerie,
    p_valido_de: cert.validoDe.toISOString(),
    p_valido_ate: cert.validoAte.toISOString(),
    p_enviado_por: idUsuario,
    p_enviado_por_nome: usuario?.nome ?? null,
  });
  if (error) throw error;

  const diasParaVencer = Math.floor((cert.validoAte.getTime() - agora) / DIA_MS);
  const avisos: string[] = [];
  if (diasParaVencer <= 30) avisos.push(`O certificado vence em ${diasParaVencer} dia(s). Providencie a renovação.`);
  avisos.push("Lembre-se: o certificado precisa estar cadastrado no Credencia (Senatran) para funcionar em produção.");

  return json({
    ok: true,
    certificado: {
      id: idCertificado,
      cnpj: cert.cnpj,
      titular: cert.titular,
      emissor: cert.emissor,
      numero_serie: cert.numeroSerie,
      valido_ate: cert.validoAte.toISOString(),
      dias_para_vencer: diasParaVencer,
    },
    avisos,
  });
}

// deno-lint-ignore no-explicit-any
async function testar(admin: any, idEmpresa: string, idUsuario: string) {
  const { data: empresa, error } = await admin.from("empresa").select("cnpj, renave_ambiente").eq("id", idEmpresa).single();
  if (error) throw error;
  const ambiente: AmbienteRenave = empresa?.renave_ambiente === "producao" ? "producao" : "homologacao";
  const cnpjEmpresa = soDocumento(empresa?.cnpj);

  const cert = await carregarCertificadoEmpresa(admin, idEmpresa);
  if (ambiente === "producao" && !cert) return falha("Envie o certificado A1 antes de testar em produção.");

  // Em homologação o Serpro atende sem certificado (estabelecimento padrão de teste).
  // Se houver certificado, testamos também com ele, só para informação.
  const tentativas: Array<{ usouCertificado: boolean }> =
    ambiente === "producao" ? [{ usouCertificado: true }] : [{ usouCertificado: false }, ...(cert ? [{ usouCertificado: true }] : [])];

  const resultados = [];
  for (const t of tentativas) {
    const r = await chamarRenave({
      ambiente,
      caminho: "/api/cliente-autenticado",
      certificado: t.usouCertificado ? cert : null,
      timeoutMs: 30_000,
    });
    // deno-lint-ignore no-explicit-any
    const j = r.json as any;
    const cnpjRetornado = j?.cnpj ? soDocumento(j.cnpj) : null;
    await admin.from("renave_log").insert({
      id_empresa: idEmpresa,
      operacao: "TESTE_CONEXAO",
      metodo: "GET",
      endpoint: `${ambiente}:/api/cliente-autenticado${t.usouCertificado ? " (com certificado)" : ""}`,
      http_status: r.status,
      response_json: j ?? { texto: r.texto.slice(0, 500) },
      log_id_rastreabilidade: r.logIdRastreabilidade,
      duracao_ms: r.duracaoMs,
      id_usuario: idUsuario,
    });
    resultados.push({
      usou_certificado: t.usouCertificado,
      http_status: r.status,
      ok: r.status === 200,
      mensagem: r.status === 200 ? `Conectado como ${j?.nome ?? "?"} (CNPJ ${cnpjRetornado ?? "?"})` : mensagemStatusRenave(r),
      estabelecimento: r.status === 200 ? { cnpj: cnpjRetornado, nome: j?.nome ?? null } : null,
      cnpj_confere: r.status === 200 && t.usouCertificado ? cnpjRetornado === cnpjEmpresa : null,
      duracao_ms: r.duracaoMs,
    });
  }

  const principal = resultados[0];
  return json({
    ok: principal.ok,
    ambiente,
    tem_certificado: !!cert,
    resultados,
    observacao: ambiente === "homologacao"
      ? "Em homologação, sem certificado, o Serpro responde como \"Estabelecimento padrão de teste\". Com o certificado da loja ele pode recusar (HTTP 495) se o certificado não estiver cadastrado na homologação; isso não afeta a produção."
      : null,
  });
}
