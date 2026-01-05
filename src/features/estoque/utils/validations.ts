import { supabase } from '@/integrations/supabase/client';
import { normalizePlaca } from './masks';

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
}

export async function validatePlacaDuplicada(
  placa: string,
  currentVehicleId?: number
): Promise<{ valid: boolean; message?: string }> {
  if (!placa || placa.length < 7) {
    return { valid: true };
  }

  const normalizedPlaca = normalizePlaca(placa);

  const { data, error } = await supabase
    .from('estoque')
    .select('id, placa, status')
    .eq('placa', normalizedPlaca)
    .neq('status', 'Vendido');

  if (error) {
    console.error('Erro ao validar placa:', error);
    return { valid: true }; // Em caso de erro, deixa passar
  }

  // Verifica se existe algum veículo (não vendido) com essa placa
  const veiculoAtivo = data?.find(v => !currentVehicleId || v.id !== currentVehicleId);
  
  if (veiculoAtivo) {
    return {
      valid: false,
      message: 'Já existe um veículo cadastrado com esta placa.',
    };
  }

  return { valid: true };
}

// Verifica se existe veículo VENDIDO com placa, renavan ou chassi
export async function checkVeiculoVendidoParaCiclo(
  placa?: string,
  renavan?: string,
  chassi?: string
): Promise<VeiculoVendido | null> {
  if (!placa && !renavan && !chassi) {
    return null;
  }

  const normalizedPlaca = placa ? normalizePlaca(placa) : null;
  const renavamNum = renavan ? parseInt(renavan.replace(/\D/g, '')) : null;
  const chassiNorm = chassi ? chassi.toUpperCase().trim() : null;

  // Buscar veículos vendidos que correspondam a qualquer um dos identificadores
  let query = supabase
    .from('estoque')
    .select('id, modelo, ano, fabricante, ano_fabricacao, motor, cambio, cor, categoria, tipo_veiculo, placa, id_empresa, renavan, chassi')
    .eq('status', 'Vendido');

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao verificar veículo vendido:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Procurar match por placa, renavan ou chassi
  const veiculoEncontrado = data.find(v => {
    if (normalizedPlaca && v.placa && normalizePlaca(v.placa) === normalizedPlaca) {
      return true;
    }
    if (renavamNum && v.renavan && v.renavan === renavamNum) {
      return true;
    }
    if (chassiNorm && v.chassi && v.chassi.toUpperCase().trim() === chassiNorm) {
      return true;
    }
    return false;
  });

  return veiculoEncontrado || null;
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
