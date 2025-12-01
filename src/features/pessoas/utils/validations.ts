import { supabase } from "@/integrations/supabase/client";

export function validateCPF(cpf: string): { valid: boolean; message?: string } {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) {
    return { valid: false, message: "CPF deve conter 11 dígitos" };
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, message: "CPF inválido" };
  }
  
  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(digits.charAt(9))) {
    return { valid: false, message: "CPF inválido" };
  }
  
  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
  if (checkDigit !== parseInt(digits.charAt(10))) {
    return { valid: false, message: "CPF inválido" };
  }
  
  return { valid: true };
}

export function validateCNPJ(cnpj: string): { valid: boolean; message?: string } {
  const digits = cnpj.replace(/\D/g, '');
  
  if (digits.length !== 14) {
    return { valid: false, message: "CNPJ deve conter 14 dígitos" };
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(digits)) {
    return { valid: false, message: "CNPJ inválido" };
  }
  
  // Validar primeiro dígito verificador
  let length = digits.length - 2;
  let numbers = digits.substring(0, length);
  const digitsCheck = digits.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digitsCheck.charAt(0))) {
    return { valid: false, message: "CNPJ inválido" };
  }
  
  // Validar segundo dígito verificador
  length = length + 1;
  numbers = digits.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digitsCheck.charAt(1))) {
    return { valid: false, message: "CNPJ inválido" };
  }
  
  return { valid: true };
}

export async function validateCPFCNPJDuplicate(
  cpfCnpj: string,
  currentId?: string
): Promise<{ valid: boolean; message?: string }> {
  const digits = cpfCnpj.replace(/\D/g, '');
  
  if (!digits) {
    return { valid: true };
  }
  
  try {
    let query = supabase
      .from('vx_pessoa')
      .select('id')
      .eq('cpf_cnpj', digits);
    
    if (currentId) {
      query = query.neq('id', currentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao verificar duplicidade:', error);
      return { valid: false, message: "Erro ao verificar duplicidade" };
    }
    
    if (data && data.length > 0) {
      return { 
        valid: false, 
        message: "Já existe uma pessoa cadastrada com este CPF/CNPJ." 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Erro ao verificar duplicidade:', error);
    return { valid: false, message: "Erro ao verificar duplicidade" };
  }
}
