import { z } from "zod";

const linhaSchema = z.object({
  uid: z.string(),
  tipo: z.enum(["Pagar", "Receber"]),
  data: z.string(),
  descricao: z.string(),
  nome: z.string(),
  id_pessoa: z.string().nullable(),
  valor: z.number().finite(),
  id_categoria: z.string().nullable(),
  id_forma_pagamento: z.string().nullable(),
  id_estoque: z.number().nullable(),
});

const rascunhoSchema = z.object({
  versao: z.literal(1),
  usuarioId: z.string(),
  contaId: z.string(),
  nomeArquivo: z.string(),
  atualizadoEm: z.string(),
  linhas: z.array(linhaSchema),
});

export type LinhaImportacao = z.infer<typeof linhaSchema>;
export type RascunhoOfx = z.infer<typeof rascunhoSchema>;
type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const chaveRascunho = (usuarioId: string, contaId: string) =>
  `vx:ofx:rascunho:v1:${usuarioId}:${contaId}`;

export function carregarRascunhoOfx(usuarioId: string, contaId: string, armazenamento: Armazenamento = localStorage): RascunhoOfx | null {
  const conteudo = armazenamento.getItem(chaveRascunho(usuarioId, contaId));
  if (!conteudo) return null;
  const resultado = rascunhoSchema.safeParse(JSON.parse(conteudo));
  if (!resultado.success || resultado.data.usuarioId !== usuarioId || resultado.data.contaId !== contaId) {
    throw new Error("O extrato temporário não pôde ser lido. Ele foi mantido para evitar perda de dados.");
  }
  return resultado.data;
}

export function apagarRascunhoOfx(usuarioId: string, contaId: string, armazenamento: Armazenamento = localStorage): void {
  armazenamento.removeItem(chaveRascunho(usuarioId, contaId));
}

export function salvarRascunhoOfx(rascunho: RascunhoOfx, armazenamento: Armazenamento = localStorage): void {
  if (rascunho.linhas.length === 0) {
    apagarRascunhoOfx(rascunho.usuarioId, rascunho.contaId, armazenamento);
    return;
  }
  armazenamento.setItem(chaveRascunho(rascunho.usuarioId, rascunho.contaId), JSON.stringify(rascunhoSchema.parse(rascunho)));
}