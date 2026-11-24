// Edge Function TEMPORÁRIA: renave-teste-mtls
// Objetivo: descobrir se o runtime de Edge Functions do Supabase consegue fazer
// chamadas HTTPS com certificado de cliente (mTLS), como o RENAVE exige.
// Não usa o certificado da loja: gera um certificado de teste descartável a cada execução.
// Só chama endereços fixos (nenhuma URL vem do usuário). Não grava nada no banco.
// Acesso: apenas usuário com usuario.superadm = true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";
import https from "node:https";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Site público que exige certificado de cliente e devolve os dados do certificado recebido
// (sem certificado responde 403; com certificado responde 200 e um JSON com o CN).
const ALVOS_ECO_MTLS = ["https://certauth.cryptomix.com/json/"];
const RENAVE_HOM = "https://hom.renave.estaleiro.serpro.gov.br/renave-ws/api/cliente-autenticado";
const RENAVE_PROD = "https://renave.estaleiro.serpro.gov.br/renave-ws/api/cliente-autenticado";

const CN_TESTE = "VX Cloud teste mTLS";
const SENHA_PFX_TESTE = "teste-descartavel";
const TIMEOUT_MS = 15000;

type Etapa = Record<string, unknown> & { nome: string; ok: boolean; ms: number };

async function etapa(nome: string, fn: () => Promise<Record<string, unknown>>): Promise<Etapa> {
  const t0 = performance.now();
  try {
    const r = await fn();
    return { nome, ok: true, ms: Math.round(performance.now() - t0), ...r };
  } catch (e) {
    const err = e as Error & { code?: string; cause?: unknown };
    return {
      nome,
      ok: false,
      ms: Math.round(performance.now() - t0),
      erro: String(err?.message ?? e),
      tipo: err?.name,
      codigo: err?.code,
      causa: err?.cause ? String((err.cause as Error)?.message ?? err.cause) : undefined,
    };
  }
}

// ---------- Certificado de teste ----------

async function gerarCertificadoTeste() {
  const kp = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  const privateKey = forge.pki.privateKeyFromAsn1(
    forge.asn1.fromDer(forge.util.binary.raw.encode(pkcs8)),
  ) as forge.pki.rsa.PrivateKey;
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = "01" + forge.util.bytesToHex(forge.random.getBytesSync(8));
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + 24 * 3600_000);
  const attrs = [
    { name: "commonName", value: CN_TESTE },
    { name: "organizationName", value: "VX Cloud" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
    { name: "extKeyUsage", clientAuth: true },
  ]);
  cert.sign(privateKey, forge.md.sha256.create());

  // Empacota em .pfx (PKCS#12) e abre de novo: é o mesmo caminho que o .pfx real vai percorrer.
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], SENHA_PFX_TESTE, { algorithm: "3des" });
  const pfxBinario = forge.asn1.toDer(p12Asn1).getBytes();
  return pfxBinario;
}

// Mesma função que será usada com o certificado A1 real.
function pfxParaPem(pfxBinario: string, senha: string) {
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfxBinario), false, senha);
  const oids = forge.pki.oids;
  const keyBag =
    (p12.getBags({ bagType: oids.pkcs8ShroudedKeyBag })[oids.pkcs8ShroudedKeyBag] ?? [])[0] ??
    (p12.getBags({ bagType: oids.keyBag })[oids.keyBag] ?? [])[0];
  if (!keyBag?.key) throw new Error("Chave privada não encontrada no .pfx");
  const key = keyBag.key as forge.pki.rsa.PrivateKey;

  const certBags = (p12.getBags({ bagType: oids.certBag })[oids.certBag] ?? []).filter((b) => b.cert);
  if (certBags.length === 0) throw new Error("Certificado não encontrado no .pfx");
  const folha =
    certBags.find((b) => (b.cert!.publicKey as forge.pki.rsa.PublicKey).n?.equals(key.n)) ?? certBags[0];
  const cadeia = [folha, ...certBags.filter((b) => b !== folha)];

  const certPem = cadeia.map((b) => forge.pki.certificateToPem(b.cert!)).join("");
  const keyPem = forge.pki.privateKeyInfoToPem(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(key)));
  return {
    certPem,
    keyPem,
    titular: folha.cert!.subject.getField("CN")?.value as string | undefined,
    validade: folha.cert!.validity.notAfter.toISOString(),
    certificadosNoPfx: certBags.length,
  };
}

// ---------- Clientes HTTP ----------

async function lerCorpo(res: Response) {
  const texto = await res.text();
  return texto.slice(0, 1500);
}

async function fetchComTimeout(url: string, init: RequestInit & { client?: unknown } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error(`timeout ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
  try {
    // deno-lint-ignore no-explicit-any
    const res = await fetch(url, { ...(init as any), signal: ac.signal, headers: { Accept: "application/json" } });
    return { status: res.status, corpo: await lerCorpo(res) };
  } finally {
    clearTimeout(t);
  }
}

function nodeGet(url: string, opcoes: Record<string, unknown>): Promise<{ status: number; corpo: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: "GET", headers: { Accept: "application/json" }, agent: false, ...opcoes },
      (res) => {
        let corpo = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => {
          if (corpo.length < 1500) corpo += c;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, corpo: corpo.slice(0, 1500) }));
      },
    );
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`timeout ${TIMEOUT_MS}ms`)));
    req.on("error", reject);
    req.end();
  });
}

const certificadoChegou = (corpo: unknown) => typeof corpo === "string" && corpo.includes(CN_TESTE);

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Autorização: só super admin.
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "Sem autorização" }, 401);
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) return json({ error: "Não autenticado" }, 401);
  const { data: usuario } = await supabaseAdmin.from("usuario").select("superadm").eq("auth_id", user.id).maybeSingle();
  if (!usuario?.superadm) return json({ error: "Apenas super usuários podem executar este teste." }, 403);

  const etapas: Etapa[] = [];
  const denoTemCreateHttpClient = typeof (Deno as unknown as { createHttpClient?: unknown }).createHttpClient === "function";

  // 1. Gerar certificado de teste e converter .pfx -> PEM
  let pem: ReturnType<typeof pfxParaPem> | null = null;
  etapas.push(await etapa("1_gerar_pfx_e_converter_para_pem", async () => {
    const pfx = await gerarCertificadoTeste();
    pem = pfxParaPem(pfx, SENHA_PFX_TESTE);
    return { titular: pem.titular, validade: pem.validade, certificadosNoPfx: pem.certificadosNoPfx };
  }));

  if (pem) {
    const { certPem, keyPem } = pem;

    for (const alvo of ALVOS_ECO_MTLS) {
      // 2. Sem certificado (controle)
      etapas.push(await etapa(`2_fetch_sem_certificado ${alvo}`, async () => {
        const r = await fetchComTimeout(alvo);
        return { ...r, certificadoChegou: certificadoChegou(r.corpo) };
      }));

      // 3. Deno.createHttpClient com certificado
      etapas.push(await etapa(`3_deno_createHttpClient_com_certificado ${alvo}`, async () => {
        if (!denoTemCreateHttpClient) throw new Error("Deno.createHttpClient não existe neste runtime");
        // deno-lint-ignore no-explicit-any
        const client = (Deno as any).createHttpClient({
          cert: certPem,
          key: keyPem,
          certChain: certPem, // nomes antigos da API, por compatibilidade
          privateKey: keyPem,
        });
        try {
          const r = await fetchComTimeout(alvo, { client });
          return { ...r, certificadoChegou: certificadoChegou(r.corpo) };
        } finally {
          try { client.close(); } catch { /* ignore */ }
        }
      }));

      // 4. node:https com certificado
      etapas.push(await etapa(`4_node_https_com_certificado ${alvo}`, async () => {
        const r = await nodeGet(alvo, { cert: certPem, key: keyPem });
        return { ...r, certificadoChegou: certificadoChegou(r.corpo) };
      }));
    }

    // 6. Homologação com certificado NÃO cadastrado no Credencia: esperado 495 (certificado inválido).
    etapas.push(await etapa("6_renave_hom_certificado_nao_cadastrado_esperado_495", async () =>
      await nodeGet(RENAVE_HOM, { cert: certPem, key: keyPem })
    ));
  }

  // 5. Homologação sem certificado: esperado 200 com o "Estabelecimento padrão de teste" (mock do Serpro).
  etapas.push(await etapa("5_renave_hom_sem_certificado_esperado_200", async () => await fetchComTimeout(RENAVE_HOM)));

  // 7. Produção sem certificado: esperado 401.
  etapas.push(await etapa("7_renave_prod_fetch_sem_certificado", async () => await fetchComTimeout(RENAVE_PROD)));

  const passou = (prefixo: string) =>
    etapas.some((e) => e.nome.startsWith(prefixo) && e.ok && e.certificadoChegou === true);
  const algumEcoRespondeu = etapas.some((e) => e.nome.startsWith("2_") && e.ok);

  const resumo = {
    deno_createHttpClient_existe: denoTemCreateHttpClient,
    mtls_via_deno_createHttpClient: passou("3_"),
    mtls_via_node_https: passou("4_"),
    sites_de_teste_responderam: algumEcoRespondeu,
    renave_hom_acessivel: etapas.some((e) => e.nome.startsWith("5_") && e.ok && e.status === 200),
    conclusao: passou("3_") || passou("4_")
      ? "OK: a Edge Function consegue enviar certificado de cliente. Dá para seguir sem proxy."
      : algumEcoRespondeu
        ? "FALHOU: os sites de teste responderam, mas o certificado não chegou. Provável necessidade de proxy (Node) fora do Supabase."
        : "INCONCLUSIVO: os sites de teste não responderam. Repetir mais tarde.",
  };

  const relatorio = {
    executado_em: new Date().toISOString(),
    runtime: { deno: Deno.version, build: Deno.build },
    resumo,
    etapas,
  };
  console.log("RENAVE_TESTE_MTLS " + JSON.stringify(relatorio));
  return json(relatorio);
});
