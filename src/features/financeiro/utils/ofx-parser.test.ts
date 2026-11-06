/// <reference types="node" />
import { describe, it as test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { prepararCadastroPessoaDoMemo } from "./ofxParser";

describe("Cadastro de pessoa pelo MEMO", () => {
  test("CPF seleciona Pessoa Física e mantém zeros iniciais", () => {
    deepStrictEqual(prepararCadastroPessoaDoMemo(
      "PIX ENVIADO RENATO CABRAL DA SILVA OLIVEIRA 073.274.594-21", "",
    ), {
      nome: "RENATO CABRAL DA SILVA OLIVEIRA",
      cpf_cnpj: "07327459421",
      tipo_cadastro: "Pessoa Física",
    });
  });

  test("CNPJ seleciona Pessoa Jurídica", () => {
    deepStrictEqual(prepararCadastroPessoaDoMemo(
      "PAGAMENTOS RECIFE RETIFICA DE RODAS LTDA 68.308.215/0001-08", "",
    ), {
      nome: "RECIFE RETIFICA DE RODAS LTDA",
      cpf_cnpj: "68308215000108",
      tipo_cadastro: "Pessoa Jurídica",
    });
  });

  test("TED identifica o CPF apesar dos códigos bancários", () => {
    deepStrictEqual(prepararCadastroPessoaDoMemo(
      "TED RECEBIDA 104.3880.JOSE C F D JOSE CLEITON FARIAS DOS SANTOS 921.714.274-34", "",
    ), {
      nome: "JOSE CLEITON FARIAS DOS SANTOS",
      cpf_cnpj: "92171427434",
      tipo_cadastro: "Pessoa Física",
    });
  });

  test("Documento sem máscara também determina o tipo", () => {
    deepStrictEqual(prepararCadastroPessoaDoMemo("PIX ENVIADO EMPRESA 68308215000108", "Nome informado"),
      { nome: "Nome informado", cpf_cnpj: "68308215000108", tipo_cadastro: "Pessoa Jurídica" });
    strictEqual(prepararCadastroPessoaDoMemo("PIX ENVIADO RENATO 07327459421", "Renato").tipo_cadastro,
      "Pessoa Física");
  });

  test("Sem documento mantém campo vazio e nome já preenchido", () => {
    deepStrictEqual(prepararCadastroPessoaDoMemo("PAGAMENTO RENATO", "Nome informado"),
      { nome: "Nome informado", cpf_cnpj: "", tipo_cadastro: "Pessoa Física" });
  });
});