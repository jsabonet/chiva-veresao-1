import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DemoPaymentProps {
  amount: number;
  onSuccess: (paymentData: any) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const DEMO_PAYMENT_METHODS = [
  {
    id: 'emola',
    name: 'E-Mola',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Pagamento via E-Mola (DEMO)',
    processingTime: 2000,
  },
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Pagamento via M-Pesa (DEMO)',
    processingTime: 2500,
  },
  {
    id: 'card',
    name: 'Cartão de Crédito',
    icon: <CreditCard className="h-5 w-5" />,
    description: 'Pagamento com cartão (DEMO)',
    processingTime: 1500,
  },
  {
    id: 'wallet',
    name: 'Carteira Digital',
    icon: <Wallet className="h-5 w-5" />,
    description: 'Carteira digital (DEMO)',
    processingTime: 1800,
  },
];

export default function DemoPayment({ amount, onSuccess, onCancel, disabled }: DemoPaymentProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const simulatePayment = async (method: string) => {
    setProcessing(true);
    setPaymentStatus('processing');

    const selectedPaymentMethod = DEMO_PAYMENT_METHODS.find(m => m.id === method);
    const processingTime = selectedPaymentMethod?.processingTime || 2000;

    try {
      // Simular processo de pagamento
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Simular 90% de sucesso (para realismo)
      const success = Math.random() > 0.1;

      if (success) {
        const paymentData = {
          id: `DEMO_${Date.now()}`,
          reference: `REF_${Math.random().toString(36).substring(7).toUpperCase()}`,
          method: method,
          amount: amount,
          status: 'completed',
          demo: true,
          timestamp: new Date().toISOString(),
        };

        setPaymentStatus('success');
        
        // Aguardar um pouco para mostrar o sucesso
        setTimeout(() => {
          onSuccess(paymentData);
        }, 1500);
      } else {
        setPaymentStatus('failed');
        setTimeout(() => {
          setPaymentStatus('idle');
          setProcessing(false);
        }, 3000);
      }
    } catch (error) {
      setPaymentStatus('failed');
      setTimeout(() => {
        setPaymentStatus('idle');
        setProcessing(false);
      }, 3000);
    }
  };

  const renderPaymentStatus = () => {
    switch (paymentStatus) {
      case 'processing':
        return (
          <Alert className="mb-4">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Processando pagamento... Por favor aguarde.
            </AlertDescription>
          </Alert>
        );
      case 'success':
        return (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Pagamento processado com sucesso! Redirecionando...
            </AlertDescription>
          </Alert>
        );
      case 'failed':
        return (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Falha no processamento. Tente novamente.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Pagamento Aprovado!</CardTitle>
          <CardDescription>
            Seu pedido foi processado com sucesso
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagamento Demo
        </CardTitle>
        <CardDescription>
          Simulação de pagamento para testes
        </CardDescription>
        <Badge variant="outline" className="w-fit">
          MODO DEMONSTRAÇÃO
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {renderPaymentStatus()}
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Total a pagar:</span>
            <span className="text-lg font-bold">{amount.toFixed(2)} MZN</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selecione o método de pagamento:</h4>
          
          {DEMO_PAYMENT_METHODS.map((method) => (
            <div
              key={method.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${processing ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => !processing && setSelectedMethod(method.id)}
            >
              <div className="flex items-center gap-3">
                {method.icon}
                <div className="flex-1">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-gray-500">{method.description}</div>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>MODO DEMO:</strong> Nenhum pagamento real será processado. 
            Este é um ambiente de testes seguro.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={processing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => simulatePayment(selectedMethod)}
            disabled={!selectedMethod || processing || disabled}
            className="flex-1"
          >
            {processing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Pagar (Demo)'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}