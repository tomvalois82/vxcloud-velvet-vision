import { describe, expect, it } from 'bun:test';
import { calcularMargemVeiculo } from './margem';

describe('calcularMargemVeiculo', () => {
  it('prevê margem pelo valor do estoque quando não há venda', () => {
    expect(calcularMargemVeiculo({ valorVenda: null, valorAnunciado: 50000, valorAquisicao: 40000, custos: 2000 }))
      .toEqual({ valor: 8000, percentual: 16, prevista: true });
  });
  it('usa o valor da venda quando vendido', () => {
    expect(calcularMargemVeiculo({ valorVenda: 55000, valorAnunciado: 50000, valorAquisicao: 40000, custos: 4000 }))
      .toEqual({ valor: 11000, percentual: 20, prevista: false });
  });
  it('sem valor retorna nulo', () => {
    expect(calcularMargemVeiculo({ valorVenda: null, valorAnunciado: null, valorAquisicao: 40000, custos: 0 })).toBeNull();
  });
});
