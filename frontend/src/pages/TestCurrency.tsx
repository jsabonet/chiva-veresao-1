import React from 'react';
import { formatPrice } from '@/lib/formatPrice';
import { formatPrice as formatPriceApi } from '@/lib/api';

const TestCurrency = () => {
  const testValues = [100, 1000, 12500, 125000, 1250000];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Teste de Formatação de Moeda MZN</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Usando formatPrice (formatPrice.ts):</h2>
        {testValues.map(value => (
          <div key={value} className="flex justify-between items-center p-2 border rounded">
            <span>Valor: {value}</span>
            <span className="font-mono font-bold">{formatPrice(value)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-semibold">Usando formatPrice (api.ts):</h2>
        {testValues.map(value => (
          <div key={value} className="flex justify-between items-center p-2 border rounded">
            <span>Valor: {value}</span>
            <span className="font-mono font-bold">{formatPriceApi(value)}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">Teste de Formatação Locale:</h3>
        <p>Locale pt-MZ: {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(12500)}</p>
        <p>Locale pt: {new Intl.NumberFormat('pt', { style: 'currency', currency: 'MZN' }).format(12500)}</p>
        <p>Locale en: {new Intl.NumberFormat('en', { style: 'currency', currency: 'MZN' }).format(12500)}</p>
      </div>
    </div>
  );
};

export default TestCurrency;
