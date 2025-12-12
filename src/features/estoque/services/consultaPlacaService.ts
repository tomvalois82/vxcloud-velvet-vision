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

export async function consultarPlaca(placa: string): Promise<VehicleDataFromPlaca> {
  // Remove caracteres especiais da placa
  const placaLimpa = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  if (placaLimpa.length < 7) {
    throw new Error('Placa inválida. Informe a placa completa.');
  }

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
