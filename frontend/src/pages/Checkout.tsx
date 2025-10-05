import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/hooks/usePayments';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, 
  CreditCard, 
  Truck, 
  ShoppingBag,
  User,
  Phone,
  Mail,
  Home,
  Clock,
  Package,
  TestTube
} from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { toast } from '@/hooks/use-toast';
import DemoPayment from '@/components/payments/DemoPayment';

interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  icon: React.ReactNode;
}

const shippingMethods: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Entrega Padrão',
    description: 'Entrega em 3-5 dias úteis',
    price: 500,
    estimatedDays: '3-5 dias úteis',
    icon: <Package className="h-5 w-5" />
  },
  {
    id: 'express',
    name: 'Entrega Expressa',
    description: 'Entrega em 1-2 dias úteis',
    price: 1500,
    estimatedDays: '1-2 dias úteis',
    icon: <Truck className="h-5 w-5" />
  },
  {
    id: 'pickup',
    name: 'Retirada na Loja',
    description: 'Retire na nossa loja em Maputo',
    price: 0,
    estimatedDays: 'Disponível hoje',
    icon: <Home className="h-5 w-5" />
  },
  {
    id: 'same_day',
    name: 'Entrega no Mesmo Dia',
    description: 'Entrega no mesmo dia (apenas Maputo)',
    price: 3000,
    estimatedDays: 'Hoje',
    icon: <Clock className="h-5 w-5" />
  }
];

const provinces = [
  'Maputo',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa'
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { currentUser } = useAuth();
  const { initiatePayment } = usePayments();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    postal_code: ''
  });

  // Order state
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [customerNotes, setCustomerNotes] = useState('');
  const [useAsShippingAddress, setUseAsShippingAddress] = useState(true);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  // Initialize user data
  useEffect(() => {
    if (currentUser) {
      setShippingAddress(prev => ({
        ...prev,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Cliente',
        email: currentUser.email || '',
      }));
    }
  }, [currentUser]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/carrinho');
    }
  }, [items, navigate]);

  const selectedShipping = shippingMethods.find(m => m.id === selectedShippingMethod);
  const shippingCost = selectedShipping?.price || 0;
  const total = subtotal + shippingCost;

  const handleDemoPayment = async (paymentData: any) => {
    try {
      setIsLoading(true);

      // Criar pedido real via API (modo demo)
      const token = await currentUser?.getIdToken();
      
      const paymentRequest = {
        method: 'demo',
        amount: total,
        currency: 'MZN',
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
        shipping_method: selectedShippingMethod,
        shipping_amount: shippingCost,
        customer_notes: '',
        demo_mode: true
      };

      const response = await fetch('/api/cart/payments/initiate/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento demo');
      }

      const result = await response.json();

      // Mostrar sucesso
      toast({
        title: "Pedido criado com sucesso!",
        description: `Pedido criado no modo demonstração`,
      });

      // Redirecionar para página de pedidos
      navigate('/account/orders');
    } catch (error: any) {
      console.error('Demo payment error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pedido demo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep1 = () => {
    const required = ['name', 'phone', 'email', 'address', 'city', 'province'];
    const missing = required.filter(field => !shippingAddress[field as keyof ShippingAddress]);
    
    if (missing.length > 0) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingAddress.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return false;
    }

    // Validate phone
    const phoneRegex = /^[+]?[\d\s-()]{9,}$/;
    if (!phoneRegex.test(shippingAddress.phone)) {
      toast({
        title: 'Telefone inválido',
        description: 'Por favor, insira um número de telefone válido.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !paymentPhone) {
      toast({
        title: 'Número de telefone obrigatório',
        description: `Por favor, insira o número de telefone para ${paymentMethod.toUpperCase()}.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 3 && !validateStep3()) return;
    
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handlePreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleCompleteOrder = async () => {
    if (!validateStep3()) return;

    setIsLoading(true);

    try {
      const orderData = {
        method: paymentMethod,
        phone: paymentPhone,
        amount: total,
        shipping_amount: shippingCost,
        currency: 'MZN',
        shipping_method: selectedShippingMethod,
        shipping_address: shippingAddress,
        billing_address: useAsShippingAddress ? shippingAddress : shippingAddress, // For now, same as shipping
        customer_notes: customerNotes,
        items: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          color_id: item.color_id || null
        }))
      };

      const { order_id, payment } = await initiatePayment(paymentMethod as "mpesa" | "emola" | "card" | "transfer", orderData);

      // Clear cart after successful order creation
      clearCart();

      // Navigate to confirmation page
      navigate(`/pedido/confirmacao/${order_id}`);

    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao processar pedido',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((stepNumber) => (
        <div key={stepNumber} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNumber
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {stepNumber}
          </div>
          {stepNumber < 4 && (
            <div
              className={`w-12 h-1 mx-2 ${
                step > stepNumber ? 'bg-primary' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  if (items.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>
          
          <StepIndicator />

          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Step 1: Shipping Address */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Endereço de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={shippingAddress.name}
                          onChange={(e) => handleAddressChange('name', e.target.value)}
                          placeholder="Seu nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input
                          id="phone"
                          value={shippingAddress.phone}
                          onChange={(e) => handleAddressChange('phone', e.target.value)}
                          placeholder="+258 84 123 4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingAddress.email}
                        onChange={(e) => handleAddressChange('email', e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço *</Label>
                      <Input
                        id="address"
                        value={shippingAddress.address}
                        onChange={(e) => handleAddressChange('address', e.target.value)}
                        placeholder="Rua, número, bairro"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) => handleAddressChange('city', e.target.value)}
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="province">Província *</Label>
                        <Select
                          value={shippingAddress.province}
                          onValueChange={(value) => handleAddressChange('province', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem key={province} value={province}>
                                {province}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Código Postal</Label>
                        <Input
                          id="postal_code"
                          value={shippingAddress.postal_code}
                          onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                          placeholder="1100"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Shipping Method */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Método de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={selectedShippingMethod}
                      onValueChange={setSelectedShippingMethod}
                      className="space-y-4"
                    >
                      {shippingMethods.map((method) => (
                        <div key={method.id} className="flex items-center space-x-3 border rounded-lg p-4">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {method.icon}
                              <Label htmlFor={method.id} className="font-medium">
                                {method.name}
                              </Label>
                              <Badge variant="outline">
                                {method.price === 0 ? 'Grátis' : formatPrice(method.price)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {method.description} • {method.estimatedDays}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment Method */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Método de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Demo Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <TestTube className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-900">Modo Demonstração</div>
                          <div className="text-sm text-blue-700">
                            Simular pagamento para testes (sem cobrança real)
                          </div>
                        </div>
                      </div>
                      <Checkbox
                        checked={demoMode}
                        onCheckedChange={(checked) => setDemoMode(checked === true)}
                      />
                    </div>

                    {demoMode ? (
                      <DemoPayment
                        amount={total}
                        onSuccess={handleDemoPayment}
                        onCancel={() => setDemoMode(false)}
                        disabled={isLoading}
                      />
                    ) : (
                      <>
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-3 border rounded-lg p-4">
                        <RadioGroupItem value="mpesa" id="mpesa" />
                        <div className="flex-1">
                          <Label htmlFor="mpesa" className="font-medium">
                            M-Pesa
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Pagamento via M-Pesa
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 border rounded-lg p-4">
                        <RadioGroupItem value="emola" id="emola" />
                        <div className="flex-1">
                          <Label htmlFor="emola" className="font-medium">
                            e-mola
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Pagamento via e-mola
                          </p>
                        </div>
                      </div>
                    </RadioGroup>

                    {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                      <div className="space-y-2">
                        <Label htmlFor="payment-phone">
                          Número de Telefone {paymentMethod.toUpperCase()} *
                        </Label>
                        <Input
                          id="payment-phone"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                          placeholder="+258 84 123 4567"
                        />
                        <p className="text-sm text-muted-foreground">
                          Número registrado no {paymentMethod.toUpperCase()}
                        </p>
                      </div>
                    )}

                        <div className="space-y-2">
                          <Label htmlFor="notes">Observações (opcional)</Label>
                          <Textarea
                            id="notes"
                            value={customerNotes}
                            onChange={(e) => setCustomerNotes(e.target.value)}
                            placeholder="Instruções especiais para entrega..."
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Review & Confirm */}
              {step === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Confirmação do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Address Summary */}
                    <div>
                      <h4 className="font-medium mb-2">Endereço de Entrega:</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{shippingAddress.name}</p>
                        <p>{shippingAddress.address}</p>
                        <p>{shippingAddress.city}, {shippingAddress.province}</p>
                        <p>{shippingAddress.phone}</p>
                      </div>
                    </div>

                    {/* Shipping Method Summary */}
                    <div>
                      <h4 className="font-medium mb-2">Método de Entrega:</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{selectedShipping?.name}</p>
                        <p>{selectedShipping?.description}</p>
                      </div>
                    </div>

                    {/* Payment Method Summary */}
                    <div>
                      <h4 className="font-medium mb-2">Método de Pagamento:</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{paymentMethod.toUpperCase()}</p>
                        {paymentPhone && <p>{paymentPhone}</p>}
                      </div>
                    </div>

                    {customerNotes && (
                      <div>
                        <h4 className="font-medium mb-2">Observações:</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p>{customerNotes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={isLoading}
                  >
                    Anterior
                  </Button>
                )}
                
                {step < 4 ? (
                  <Button onClick={handleNextStep} className="ml-auto">
                    Próximo
                  </Button>
                ) : (
                  <Button
                    onClick={handleCompleteOrder}
                    disabled={isLoading}
                    className="ml-auto"
                  >
                    {isLoading ? 'Processando...' : 'Finalizar Pedido'}
                  </Button>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Resumo do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={`${item.id}-${item.color_id || 'no-color'}`} className="flex items-center gap-3">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {item.color_name && `Cor: ${item.color_name}`} • Qtd: {item.quantity}
                          </p>
                        </div>
                        <div className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Entrega:</span>
                      <span>{shippingCost === 0 ? 'Grátis' : formatPrice(shippingCost)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total:</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}