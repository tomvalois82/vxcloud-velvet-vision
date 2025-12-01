export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function consultarCep(cep: string): Promise<ViaCepResponse | null> {
  const cepDigits = cep.replace(/\D/g, '');
  
  if (cepDigits.length !== 8) {
    return null;
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
    
    if (!response.ok) {
      return null;
    }
    
    const data: ViaCepResponse = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao consultar CEP:', error);
    return null;
  }
}
