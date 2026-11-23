import { supabase } from '@/integrations/supabase/client';
import { normalizarPlacaBusca } from './ciclos';

export interface VeiculoVendido {
  id: number;
  modelo: string | null;
  ano: string | null;
  fabricante: string | null;
  ano_fabricacao: string | null;
  motor: string | null;
  cambio: string | null;
  cor: string | null;
  categoria: string | null;
  tipo_veiculo: string | null;
  placa: string | null;
  id_empresa: string;
  renavan: number | null;
  chassi: string | null;
  total_ciclos: number;
}

export async function validatePlacaDuplicada(
  placa: string,
  currentVehicleId?: number
): Promise<{ valid: boolean; message?: string }> {
  const placaNormalizada = normalizarPlacaBusca(placa || '');
  if (placaNormalizada.length < 7) {
    return { valid: true };
  }

  const consulta = supabase
    .from('vw_estoque_ciclos')
    .select('id_estoque')
    .eq('placa_normalizada', placaNormalizada)
    .eq('ativo', true);
  const { data, error } = await (currentVehicleId !== undefined
    ? consulta.neq('id_estoque', currentVehicleId)
    : consulta).limit(1);

  if (error) {
    console.error('Erro ao validar placa:', error);
    return { valid: true }; // Em caso de erro, deixa passar
  }

  // A view define quais status pertencem ao estoque ativo.
  const veiculoAtivo = data?.[0];
  
  if (veiculoAtivo) {
    return {
      valid: false,
      message: 'Já existe um veículo cadastrado com esta placa.',
    };
  }

  return { valid: true };
}

// Consulta somente ciclos encerrados e aproveita o cadastro mais recente.
export async function checkVeiculoVendidoParaCiclo(
  placa?: string,
  renavan?: string,
  chassi?: string
): Promise<VeiculoVendido | null> {
  if (!placa && !renavan && !chassi) {
    return null;
  }

  const placaNormalizada = normalizarPlacaBusca(placa || '');
  const renavamNumero = Number.parseInt((renavan || '').replace(/\D/g, ''), 10);
  const chassiNormalizado = (chassi || '').toUpperCase().trim();
  const campos = 'id, modelo, ano, fabricante, ano_fabricacao, motor, cambio, cor, categoria, tipo_veiculo, placa, id_empresa, renavan, chassi';
  const consultaEncerrados = () => supabase.from('estoque')
    .select(campos)
    .in('status', ['Vendido', 'Fora de Estoque']);
  const consultas = [];

  if (placaNormalizada.length >= 7) {
    const { data: ciclo, error: erroCiclo } = await supabase.from('vw_estoque_ciclos')
      .select('id_estoque')
      .eq('placa_normalizada', placaNormalizada)
      .in('status', ['Vendido', 'Fora de Estoque'])
      .order('id_estoque', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroCiclo) throw erroCiclo;
    if (ciclo?.id_estoque !== null && ciclo?.id_estoque !== undefined) {
      consultas.push(consultaEncerrados().eq('id', ciclo.id_estoque)
        .order('id', { ascending: false }).limit(1).maybeSingle());
    }
  }
  if (Number.isFinite(renavamNumero)) {
    consultas.push(consultaEncerrados().eq('renavan', renavamNumero)
      .order('id', { ascending: false }).limit(1).maybeSingle());
  }
  if (chassiNormalizado) {
    // Escapa curingas para que a busca não corresponda a outros chassis.
    const chassiLiteral = chassiNormalizado.replace(/[\\%_]/g, '\\$&');
    consultas.push(consultaEncerrados().ilike('chassi', chassiLiteral)
      .order('id', { ascending: false }).limit(1).maybeSingle());
  }
  const resultados = await Promise.all(consultas);
  const erro = resultados.find(resultado => resultado.error)?.error;
  if (erro) throw erro;
  const veiculo = resultados.map(resultado => resultado.data)
    .filter(candidato => candidato !== null)
    .sort((primeiro, segundo) => segundo.id - primeiro.id)[0];
  if (!veiculo) return null;

  const { data: ciclo, error: erroTotal } = await supabase.from('vw_estoque_ciclos')
    .select('total_ciclos')
    .eq('id_estoque', veiculo.id)
    .maybeSingle();
  if (erroTotal) throw erroTotal;
  return { ...veiculo, total_ciclos: ciclo?.total_ciclos ?? 1 };
}

export function validateAnoModelo(anoModelo: string, anoFabricacao: string): {
  valid: boolean;
  message?: string;
} {
  const modelo = parseInt(anoModelo);
  const fabricacao = parseInt(anoFabricacao);
  const anoAtual = new Date().getFullYear();

  if (isNaN(modelo) || isNaN(fabricacao)) {
    return { valid: false, message: 'Anos inválidos' };
  }

  if (modelo < fabricacao) {
    return {
      valid: false,
      message: 'Ano modelo não pode ser menor que ano de fabricação',
    };
  }

  if (modelo > anoAtual + 1) {
    return {
      valid: false,
      message: `Ano modelo não pode ser maior que ${anoAtual + 1}`,
    };
  }

  if (modelo - fabricacao > 1) {
    return {
      valid: false,
      message: 'Diferença entre ano modelo e fabricação não pode ser maior que 1 ano',
    };
  }

  return { valid: true };
}

export function validateKm(km: string): { valid: boolean; message?: string } {
  const numKm = parseInt(km.replace(/\D/g, ''));

  if (isNaN(numKm)) {
    return { valid: false, message: 'Quilometragem inválida' };
  }

  if (numKm < 0) {
    return { valid: false, message: 'Quilometragem não pode ser negativa' };
  }

  return { valid: true };
}

export function validateDataAquisicao(data: string): {
  valid: boolean;
  message?: string;
} {
  if (!data) return { valid: true };

  const dataAquisicao = new Date(data);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (dataAquisicao > hoje) {
    return {
      valid: false,
      message: 'Data de aquisição não pode ser futura',
    };
  }

  return { valid: true };
}

export function validateChassi(chassi: string): {
  valid: boolean;
  message?: string;
} {
  if (!chassi) return { valid: true };

  const chassiClean = chassi.trim().toUpperCase();
  
  // Se não tem 17 caracteres, aceitar como parcial
  if (chassiClean.length !== 17) {
    return { valid: true };
  }

  // Se tem 17 caracteres, validar formato completo
  const chassiRegex = /^[A-HJ-NPR-Z0-9]{17}$/; // Exclui I, O, Q
  
  if (!chassiRegex.test(chassiClean)) {
    return {
      valid: false,
      message: 'Chassi inválido. Deve conter apenas letras (exceto I, O, Q) e números',
    };
  }

  return { valid: true };
}

export async function validatePessoa(pessoaId: string): Promise<{
  valid: boolean;
  message?: string;
}> {
  if (!pessoaId) return { valid: true };

  const { data, error } = await supabase
    .from('vx_pessoa')
    .select('id')
    .eq('id', pessoaId)
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      message: 'Pessoa não encontrada no sistema',
    };
  }

  return { valid: true };
}
