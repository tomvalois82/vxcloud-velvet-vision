import { supabase } from '@/integrations/supabase/client';

const CONSULTA_PLACA_TOKEN = '39c77c95cc1cd3da76e33a6d1fb6a872';

export interface ConsultaPlacaResponse {
  MARCA: string;
  MODELO: string;
  SUBMODELO: string;
  VERSAO: string;
  ano: string;
  anoModelo: string;
  chassi: string;
  cor: string;
  municipio: string;
  uf: string;
  placa: string;
  mensagemRetorno: string;
  situacao?: string;
  extra?: {
    ano_fabricacao: string;
    ano_modelo: string;
    combustivel: string;
    tipo_veiculo: string;
    motor?: string;
    cilindradas?: string;
    carroceria?: string;
  };
  fipe?: {
    dados: Array<{
      texto_marca: string;
      texto_modelo: string;
      texto_valor: string;
      ano_modelo: string;
      codigo_fipe: string;
      score: number;
    }>;
  };
}

export interface VehicleDataFromPlaca {
  fabricante: string;
  modelo: string;
  ano: string;
  ano_fabricacao: string;
  cor: string;
  chassi: string;
  valorFipe?: string;
  motor?: string;
}

// Verifica se a placa já foi consultada no banco de dados
async function buscarConsultaExistente(placa: string): Promise<VehicleDataFromPlaca | null> {
  const { data, error } = await supabase
    .from('vx_veiculos_consultados')
    .select('*')
    .eq('placa', placa.toUpperCase())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Converter dados do banco para o formato VehicleDataFromPlaca
  const jsonCompleto = data.json_completo as unknown as ConsultaPlacaResponse | null;
  
  return {
    fabricante: data.fabricante || '',
    modelo: data.modelo || '',
    ano: data.ano_modelo?.toString() || '',
    ano_fabricacao: data.ano_fabricacao?.toString() || '',
    cor: data.cor || '',
    chassi: data.chassi || '',
    valorFipe: data.valor_fipe ? `R$ ${data.valor_fipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined,
    motor: jsonCompleto?.extra?.cilindradas ? `${jsonCompleto.extra.cilindradas}cc` : undefined,
  };
}

// Salva a consulta no banco de dados
async function salvarConsulta(placa: string, data: ConsultaPlacaResponse): Promise<void> {
  // Extrair valor FIPE numérico
  let valorFipeNumerico: number | null = null;
  let codigoFipe: string | null = null;
  
  if (data.fipe?.dados && data.fipe.dados.length > 0) {
    const melhorFipe = data.fipe.dados.reduce((prev, current) => 
      (current.score > prev.score) ? current : prev
    );
    codigoFipe = melhorFipe.codigo_fipe;
    // Extrair valor numérico do texto "R$ 28.799,00"
    const valorTexto = melhorFipe.texto_valor.replace(/[^\d,]/g, '').replace(',', '.');
    valorFipeNumerico = parseFloat(valorTexto) || null;
  }

  const { error } = await supabase
    .from('vx_veiculos_consultados')
    .insert([{
      placa: placa.toUpperCase(),
      chassi: data.chassi || 'N/A',
      fabricante: data.MARCA || null,
      modelo: data.MODELO || null,
      versao: data.VERSAO || null,
      ano_fabricacao: data.extra?.ano_fabricacao ? parseInt(data.extra.ano_fabricacao) : null,
      ano_modelo: data.anoModelo ? parseInt(data.anoModelo) : null,
      cor: data.cor || null,
      combustivel: data.extra?.combustivel || null,
      uf: data.uf || null,
      municipio: data.municipio || null,
      situacao_veiculo: data.extra?.tipo_veiculo || null,
      situacao_restricao: data.situacao || null,
      codigo_fipe: codigoFipe,
      valor_fipe: valorFipeNumerico,
      json_completo: JSON.parse(JSON.stringify(data)),
      data_consulta: new Date().toISOString(),
    }]);

  if (error) {
    console.error('Erro ao salvar consulta:', error);
  }
}

export async function consultarPlaca(placa: string): Promise<VehicleDataFromPlaca> {
  // Remove caracteres especiais da placa
  const placaLimpa = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  if (placaLimpa.length < 7) {
    throw new Error('Placa inválida. Informe a placa completa.');
  }

  // Primeiro, verifica se já existe no banco de dados
  const consultaExistente = await buscarConsultaExistente(placaLimpa);
  if (consultaExistente) {
    console.log('Consulta encontrada no banco de dados:', placaLimpa);
    return consultaExistente;
  }

  // Se não existe, faz a chamada à API
  console.log('Consultando API externa para placa:', placaLimpa);
  const url = `https://wdapi2.com.br/consulta/${placaLimpa}/${CONSULTA_PLACA_TOKEN}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar placa. Tente novamente.');
    }
    
    const data: ConsultaPlacaResponse = await response.json();
    
    if (data.mensagemRetorno && data.mensagemRetorno !== 'Sem erros.') {
      throw new Error(data.mensagemRetorno || 'Erro na consulta da placa.');
    }

    // Salvar consulta no banco de dados
    await salvarConsulta(placaLimpa, data);

    // Extrair valor FIPE com maior score
    let valorFipe: string | undefined;
    if (data.fipe?.dados && data.fipe.dados.length > 0) {
      const melhorFipe = data.fipe.dados.reduce((prev, current) => 
        (current.score > prev.score) ? current : prev
      );
      valorFipe = melhorFipe.texto_valor;
    }

    // Mapear fabricante (usar texto_marca do FIPE se disponível, ou MARCA)
    let fabricante = data.MARCA || '';
    if (data.fipe?.dados && data.fipe.dados.length > 0) {
      fabricante = data.fipe.dados[0].texto_marca || fabricante;
    }

    return {
      fabricante,
      modelo: data.MODELO || data.SUBMODELO || '',
      ano: data.anoModelo || data.ano || '',
      ano_fabricacao: data.extra?.ano_fabricacao || data.ano || '',
      cor: data.cor || '',
      chassi: data.chassi || '',
      valorFipe,
      motor: data.extra?.cilindradas ? `${data.extra.cilindradas}cc` : undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao consultar placa. Verifique sua conexão.');
  }
}
