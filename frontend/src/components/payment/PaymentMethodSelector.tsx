import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Smartphone, ArrowLeft, Check } from 'lucide-react';

interface PaymentMethod {
  id: 'mpesa' | 'emola' | 'card' | 'transfer';
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface PaymentData {
  method: 'mpesa' | 'emola' | 'card' | 'transfer';
  // Para M-Pesa/e-Mola
  phone?: string;
  // Para Cartão
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  // Para Transferência
  accountNumber?: string;
  bankName?: string;
}

interface PaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentData) => void;
  totalAmount: number;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: <Smartphone className="h-6 w-6" />,
    description: 'Pagamento via carteira móvel M-Pesa'
  },
  {
    id: 'emola',
    name: 'e-Mola',
    icon: <Smartphone className="h-6 w-6" />,
    description: 'Pagamento via carteira digital e-Mola'
  },
];

export default function PaymentMethodSelector({ isOpen, onClose, onSubmit, totalAmount }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'emola' | 'card' | 'transfer' | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentData>>({});
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    setLoading(true);
    try {
      // New flow: don't require phone or card here. Just inform parent of selected method
      // Parent (Cart) will redirect user to the checkout/details page where full info is collected.
      await onSubmit({ method: selectedMethod });
    } catch (error) {
      console.error('Payment submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  // We no longer collect payment details in this modal. The new flow:
  // user selects a method, confirms, and is redirected to a checkout details page
  // where all customer/shipping/order/payment info will be collected.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Escolha o Método de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-2xl border-2 border-primary/30">
            <p className="text-sm text-primary font-medium mb-1">Total a pagar</p>
            <p className="text-3xl font-bold text-primary-foreground">{formatPrice(totalAmount)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedMethod ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Selecione uma das opções abaixo:</p>
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  className="w-full p-5 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all duration-300 text-left group shadow-sm hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br bg-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border-2 border-green-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    {paymentMethods.find(m => m.id === selectedMethod)?.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg text-green-900">{paymentMethods.find(m => m.id === selectedMethod)?.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethod(null);
                        setFormData({});
                      }}
                      className="text-sm text-primary hover:text-primary-hover font-medium hover:underline flex items-center gap-1 mt-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Alterar método
                    </button>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-primary">
                <p className="text-sm text-gray-700">
                  Você selecionou <strong className="text-primary">{paymentMethods.find(m => m.id === selectedMethod)?.name}</strong>. Ao confirmar, será redirecionado para a página de finalização onde deverá preencher os dados do pedido e pagamento.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={loading}
                  className="w-full sm:flex-1 h-12 rounded-xl border-2 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full sm:flex-1 h-12 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Confirmar Pagamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}