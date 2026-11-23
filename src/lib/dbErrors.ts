// Mensagens amigáveis para violações de unicidade (Postgres 23505)
const MENSAGENS_INDICES: Record<string, string> = {
  ux_compras_veiculo_ativa:
    'Este veículo já tem uma compra lançada. Se você está comprando o carro novamente, cadastre-o pelo botão Cadastrar novo veículo para iniciar um novo ciclo.',
  ux_vendas_veiculo:
    'Este veículo já possui uma venda registrada. Edite a venda existente em vez de criar outra.',
  ux_estoque_placa_ativa: 'Já existe um veículo com esta placa no estoque atual.',
};

export function mensagemErroBanco(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback;
  const erro = error as { code?: unknown; message?: unknown };
  if (erro.code !== '23505') return fallback;
  const mensagem = typeof erro.message === 'string' ? erro.message : '';
  const indice = Object.keys(MENSAGENS_INDICES).find((nome) => mensagem.includes(nome));
  return indice ? MENSAGENS_INDICES[indice] : fallback;
}
