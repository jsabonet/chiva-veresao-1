/**
 * Formata um valor numérico para a moeda moçambicana (MZN)
 * Força a exibição de "MZN" em vez de "MTn" que é a moeda antiga
 */
export const formatPrice = (value: number): string => {
  // Primeiro tenta formatar com locale de Moçambique
  let formatted;
  try {
    formatted = new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    // Fallback para locale genérico se pt-MZ não for suportado
    formatted = new Intl.NumberFormat('pt', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  // Force MZN display instead of MTn (old currency code)
  // Também substitui outras variações possíveis
  return formatted
    .replace(/MTn/g, 'MZN')
    .replace(/MT\s/g, 'MZN ')
    .replace(/MT$/g, 'MZN')
    .replace(/¤/g, 'MZN'); // Substitui símbolo genérico de moeda
};
