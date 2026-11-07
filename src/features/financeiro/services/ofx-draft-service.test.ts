/// <reference types="node" />
import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { apagarRascunhoOfx, carregarRascunhoOfx, salvarRascunhoOfx, type RascunhoOfx } from "./ofx-draft-service";

const criarArmazenamento = () => {
  const dados = new Map<string, string>();
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => { dados.set(chave, valor); },
    removeItem: (chave: string) => { dados.delete(chave); },
  };
};
const rascunho: RascunhoOfx = {
  versao: 1, usuarioId: "usuario-1", contaId: "conta-1", nomeArquivo: "setembro.ofx", atualizadoEm: "2026-11-07T13:41:00Z",
  linhas: [{ uid: "1", tipo: "Pagar", data: "2026-09-01", descricao: "Pagamento ajustado", nome: "Recife Retífica", id_pessoa: "pessoa-1", valor: 450, id_categoria: "categoria-1", id_forma_pagamento: "forma-1", id_estoque: 12 }],
};

describe("Recuperação do extrato OFX", () => {
  it("Sim recupera o nome do arquivo e todos os campos preenchidos", () => {
    const armazenamento = criarArmazenamento();
    salvarRascunhoOfx(rascunho, armazenamento);
    deepStrictEqual(carregarRascunhoOfx("usuario-1", "conta-1", armazenamento), rascunho);
  });
  it("Não apaga o temporário para iniciar nova importação", () => {
    const armazenamento = criarArmazenamento();
    salvarRascunhoOfx(rascunho, armazenamento);
    apagarRascunhoOfx("usuario-1", "conta-1", armazenamento);
    strictEqual(carregarRascunhoOfx("usuario-1", "conta-1", armazenamento), null);
  });
  it("Separa os extratos por usuário e conta", () => {
    const armazenamento = criarArmazenamento();
    salvarRascunhoOfx(rascunho, armazenamento);
    strictEqual(carregarRascunhoOfx("usuario-2", "conta-1", armazenamento), null);
    strictEqual(carregarRascunhoOfx("usuario-1", "conta-2", armazenamento), null);
  });
  it("Salva novas edições e não recupera linhas já importadas", () => {
    const armazenamento = criarArmazenamento();
    salvarRascunhoOfx(rascunho, armazenamento);
    const atualizado = { ...rascunho, linhas: [{ ...rascunho.linhas[0], valor: 470, descricao: "Conferido" }] };
    salvarRascunhoOfx(atualizado, armazenamento);
    deepStrictEqual(carregarRascunhoOfx("usuario-1", "conta-1", armazenamento)?.linhas, atualizado.linhas);
    salvarRascunhoOfx({ ...rascunho, linhas: [] }, armazenamento);
    strictEqual(carregarRascunhoOfx("usuario-1", "conta-1", armazenamento), null);
  });
  it("Não oculta falhas de salvamento", () => {
    const armazenamento = { ...criarArmazenamento(), setItem: () => { throw new Error("Sem espaço"); } };
    throws(() => salvarRascunhoOfx(rascunho, armazenamento), /Sem espaço/);
  });
  it("Preserva somente as linhas pendentes após uma importação parcial", () => {
    const armazenamento = criarArmazenamento();
    const segundaLinha = { ...rascunho.linhas[0], uid: "2", valor: 600 };
    salvarRascunhoOfx({ ...rascunho, linhas: [...rascunho.linhas, segundaLinha] }, armazenamento);
    salvarRascunhoOfx({ ...rascunho, linhas: [segundaLinha] }, armazenamento);
    deepStrictEqual(carregarRascunhoOfx("usuario-1", "conta-1", armazenamento)?.linhas, [segundaLinha]);
  });
  it("Mantém um temporário ilegível em vez de apagá-lo silenciosamente", () => {
    const armazenamento = criarArmazenamento();
    armazenamento.setItem("vx:ofx:rascunho:v1:usuario-1:conta-1", "arquivo danificado");
    throws(() => carregarRascunhoOfx("usuario-1", "conta-1", armazenamento));
    strictEqual(armazenamento.getItem("vx:ofx:rascunho:v1:usuario-1:conta-1"), "arquivo danificado");
  });
});