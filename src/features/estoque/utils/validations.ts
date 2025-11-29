import { supabase } from '@/integrations/supabase/client';
import { normalizePlaca } from './masks';

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
    .select('id, placa')
    .eq('placa', normalizedPlaca)
    .maybeSingle();

  if (error) {
    console.error('Erro ao validar placa:', error);
    return { valid: true }; // Em caso de erro, deixa passar
  }

  if (data && (!currentVehicleId || data.id !== currentVehicleId)) {
    return {
      valid: false,
      message: 'Já existe um veículo cadastrado com esta placa.',
    };
  }

  return { valid: true };
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
