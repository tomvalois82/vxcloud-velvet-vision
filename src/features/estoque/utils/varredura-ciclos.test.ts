/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

function listarFontes(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap(entrada => {
    const caminho = join(diretorio, entrada.name);
    return entrada.isDirectory() ? listarFontes(caminho)
      : /\.tsx?$/.test(caminho) && !caminho.endsWith('.test.ts') ? [caminho] : [];
  });
}

function visitar(no: ts.Node, acao: (no: ts.Node) => void): void {
  acao(no);
  ts.forEachChild(no, filho => visitar(filho, acao));
}

function chamadasDaCadeia(no: ts.Node): ts.CallExpression[] {
  if (!ts.isCallExpression(no) || !ts.isPropertyAccessExpression(no.expression)) return [];
  return [...chamadasDaCadeia(no.expression.expression), no];
}

function nomeMetodo(chamada: ts.CallExpression): string {
  return ts.isPropertyAccessExpression(chamada.expression) ? chamada.expression.name.text : '';
}

function textoArgumento(chamada: ts.CallExpression, indice = 0): string | undefined {
  const argumento = chamada.arguments[indice];
  return argumento && ts.isStringLiteral(argumento) ? argumento.text : undefined;
}

const fontes = listarFontes('src').map(caminho => ({ caminho, fonte: ts.createSourceFile(
  caminho, readFileSync(caminho, 'utf8'), ts.ScriptTarget.Latest, true,
  caminho.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
) }));

test('compra e venda não escrevem status do estoque; somente o cadastro manual pode fazê-lo', () => {
  const violacoes: string[] = [];
  for (const { caminho, fonte } of fontes) {
    if (caminho.endsWith('/VehicleDialog.tsx')) continue;
    visitar(fonte, no => {
      if (!ts.isCallExpression(no) || nomeMetodo(no) !== 'update') return;
      const cadeia = chamadasDaCadeia(no);
      if (!cadeia.some(chamada => nomeMetodo(chamada) === 'from' && textoArgumento(chamada) === 'estoque')) return;
      const dados = no.arguments[0];
      // Payloads indiretos exigem revisão explícita para não esconder alteração de status.
      if (!dados || !ts.isObjectLiteralExpression(dados) || dados.properties.some(propriedade =>
        ts.isSpreadAssignment(propriedade) || propriedade.name?.getText(fonte).replace(/['"]/g, '') === 'status',
      )) violacoes.push(`${caminho}: ${no.getText(fonte)}`);
    });
  }
  expect(violacoes).toEqual([]);
});

test('busca de estoque por placa não presume um único ciclo sem selecionar o sugerido', () => {
  const violacoes: string[] = [];
  for (const { caminho, fonte } of fontes) {
    visitar(fonte, no => {
      if (!ts.isCallExpression(no) || !['single', 'maybeSingle'].includes(nomeMetodo(no))) return;
      const cadeia = chamadasDaCadeia(no);
      const estoque = cadeia.some(chamada => nomeMetodo(chamada) === 'from' && textoArgumento(chamada) === 'estoque');
      const porPlaca = cadeia.some(chamada => ['eq', 'like', 'ilike', 'in'].includes(nomeMetodo(chamada))
        && textoArgumento(chamada) === 'placa');
      const sugerido = cadeia.some(chamada => nomeMetodo(chamada) === 'eq'
        && textoArgumento(chamada) === 'sugerido' && chamada.arguments[1]?.kind === ts.SyntaxKind.TrueKeyword);
      if (estoque && porPlaca && !sugerido) violacoes.push(`${caminho}: ${no.getText(fonte)}`);
    });
  }
  expect(violacoes).toEqual([]);
});