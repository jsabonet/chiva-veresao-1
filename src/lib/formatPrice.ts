/**
 * Formata um valor numérico para a moeda moçambicana (MZN)
 * Força a exibição de "MZN" em vez de "MTn" que é a moeda antiga
 */
export const formatPrice = (value: number): string => {
  const formatted = new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN'
  }).format(value);
  
  // Force MZN display instead of MTn (old currency)
  return formatted.replace('MTn', 'MZN').replace('MT', 'MZN');
};
