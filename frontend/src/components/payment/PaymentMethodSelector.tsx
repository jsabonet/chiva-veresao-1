import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Smartphone, Building2 } from 'lucide-react';

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
  {
    id: 'card',
    name: 'Cartão de Crédito/Débito',
    icon: <CreditCard className="h-6 w-6" />,
    description: 'Pagamento com cartão Visa/Mastercard'
  },
  {
    id: 'transfer',
    name: 'Transferência Bancária',
    icon: <Building2 className="h-6 w-6" />,
    description: 'Transferência direta entre contas'
  }
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
      const paymentData: PaymentData = {
        method: selectedMethod,
        ...formData
      };
      
      await onSubmit(paymentData);
    } catch (error) {
      console.error('Payment submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMethodForm = () => {
    if (!selectedMethod) return null;

    switch (selectedMethod) {
      case 'mpesa':
      case 'emola':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Número de Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="84/85XXXXXXX"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Digite o número associado à sua conta {selectedMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'}
              </p>
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardholderName">Nome no Cartão</Label>
              <Input
                id="cardholderName"
                type="text"
                placeholder="João Silva"
                value={formData.cardholderName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input
                id="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate">Validade</Label>
                <Input
                  id="expiryDate"
                  type="text"
                  placeholder="MM/AA"
                  value={formData.expiryDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  placeholder="123"
                  value={formData.cvv || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                type="text"
                placeholder="Nome do banco"
                value={formData.bankName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Número da Conta</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="Número da conta"
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha o Método de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="bg-accent/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Total a pagar</p>
            <p className="text-2xl font-bold">{formatPrice(totalAmount)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedMethod ? (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  className="w-full p-4 border rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    {method.icon}
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {paymentMethods.find(m => m.id === selectedMethod)?.icon}
                <div>
                  <p className="font-medium">{paymentMethods.find(m => m.id === selectedMethod)?.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod(null);
                      setFormData({});
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Alterar método
                  </button>
                </div>
              </div>

              <Separator />

              {renderMethodForm()}

              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Processando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}