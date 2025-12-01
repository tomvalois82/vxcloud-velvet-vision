const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';

export type TipoVeiculo = 'carros' | 'motos' | 'caminhoes';

interface FipeMarca {
  codigo: string;
  nome: string;
}

interface FipeModelo {
  codigo: number;
  nome: string;
}

interface FipeAno {
  codigo: string;
  nome: string;
}

interface FipeValor {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  TipoVeiculo: number;
  SiglaCombustivel: string;
}

// Cache simples em memória
const cache = new Map<string, { data: any; timestamp: number }>();

const CACHE_DURATION = {
  MARCAS: 24 * 60 * 60 * 1000, // 24 horas
  MODELOS: 12 * 60 * 60 * 1000, // 12 horas
  ANOS: 12 * 60 * 60 * 1000, // 12 horas
  VALOR: 1 * 60 * 60 * 1000, // 1 hora
};

function getCached<T>(key: string, maxAge: number): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function getFipeMarcas(tipoVeiculo: TipoVeiculo = 'carros'): Promise<FipeMarca[]> {
  const cacheKey = `marcas-${tipoVeiculo}`;
  const cached = getCached<FipeMarca[]>(cacheKey, CACHE_DURATION.MARCAS);
  if (cached) return cached;

  const response = await fetch(`${FIPE_BASE_URL}/${tipoVeiculo}/marcas`);
  if (!response.ok) throw new Error('Erro ao buscar marcas FIPE');
  
  const data = await response.json();
  setCache(cacheKey, data);
  return data;
}

export async function getFipeModelos(marcaCodigo: string, tipoVeiculo: TipoVeiculo = 'carros'): Promise<{ modelos: FipeModelo[] }> {
  const cacheKey = `modelos-${tipoVeiculo}-${marcaCodigo}`;
  const cached = getCached<{ modelos: FipeModelo[] }>(cacheKey, CACHE_DURATION.MODELOS);
  if (cached) return cached;

  const response = await fetch(`${FIPE_BASE_URL}/${tipoVeiculo}/marcas/${marcaCodigo}/modelos`);
  if (!response.ok) throw new Error('Erro ao buscar modelos FIPE');
  
  const data = await response.json();
  setCache(cacheKey, data);
  return data;
}

export async function getFipeAnos(marcaCodigo: string, modeloCodigo: string, tipoVeiculo: TipoVeiculo = 'carros'): Promise<FipeAno[]> {
  const cacheKey = `anos-${tipoVeiculo}-${marcaCodigo}-${modeloCodigo}`;
  const cached = getCached<FipeAno[]>(cacheKey, CACHE_DURATION.ANOS);
  if (cached) return cached;

  const response = await fetch(`${FIPE_BASE_URL}/${tipoVeiculo}/marcas/${marcaCodigo}/modelos/${modeloCodigo}/anos`);
  if (!response.ok) throw new Error('Erro ao buscar anos FIPE');
  
  const data = await response.json();
  setCache(cacheKey, data);
  return data;
}

export async function getFipeValor(
  marcaCodigo: string,
  modeloCodigo: string,
  anoCodigo: string,
  tipoVeiculo: TipoVeiculo = 'carros'
): Promise<FipeValor> {
  const cacheKey = `valor-${tipoVeiculo}-${marcaCodigo}-${modeloCodigo}-${anoCodigo}`;
  const cached = getCached<FipeValor>(cacheKey, CACHE_DURATION.VALOR);
  if (cached) return cached;

  const response = await fetch(
    `${FIPE_BASE_URL}/${tipoVeiculo}/marcas/${marcaCodigo}/modelos/${modeloCodigo}/anos/${anoCodigo}`
  );
  if (!response.ok) throw new Error('Erro ao buscar valor FIPE');
  
  const data = await response.json();
  setCache(cacheKey, data);
  return data;
}

export function parseFipeValor(valorString: string): number {
  // "R$ 45.000,00" -> 45000
  return parseFloat(
    valorString
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  );
}
