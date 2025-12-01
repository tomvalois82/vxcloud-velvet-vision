export function maskPlaca(value: string): string {
  // Remove tudo que não é letra ou número
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Formato AAA-9X99 (Mercosul) ou AAA-9999 (antigo)
  if (clean.length <= 3) {
    return clean;
  } else if (clean.length <= 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
}

export function unmaskPlaca(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizePlaca(value: string): string {
  const clean = unmaskPlaca(value);
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return value;
}

export function maskCurrency(value: string | number): string {
  // Se for número, apenas formatar
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  
  // Remover tudo exceto dígitos
  const digits = value.replace(/\D/g, '');
  
  if (!digits || digits === '0') return 'R$ 0,00';
  
  // Converter para centavos (últimos 2 dígitos são os centavos)
  const numValue = parseInt(digits, 10) / 100;
  
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function unmaskCurrency(value: string): number {
  // Remover tudo exceto dígitos
  const digits = value.replace(/\D/g, '');
  
  if (!digits) return 0;
  
  // Converter de centavos para valor real
  return parseInt(digits, 10) / 100;
}

export function maskKm(value: string | number): string {
  const numValue = typeof value === 'string' ? value.replace(/\D/g, '') : String(value);
  return numValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function unmaskKm(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskRenavan(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.slice(0, 11);
}

export function maskChassi(value: string): string {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

export function maskYear(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function maskMotor(value: string): string {
  const clean = value.replace(/[^\d.]/g, '');
  const parts = clean.split('.');
  
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  
  return clean.slice(0, 3); // Limita a 9.9
}
