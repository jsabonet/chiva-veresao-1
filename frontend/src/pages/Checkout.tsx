import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/hooks/usePayments';
import { apiClient } from '@/lib/api';
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
// RadioGroup removed: payment selection moved into review
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
  Package
} from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { toast } from '@/hooks/use-toast';

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

  // Shipping methods loaded from backend (fallback to local static list if empty)
  const [shippingMethodsState, setShippingMethodsState] = useState<any[]>([]);
  const [shippingMicroStep, setShippingMicroStep] = useState<'list' | 'confirm'>('list');
  const [shippingPreviewMethod, setShippingPreviewMethod] = useState<any | null>(null);

  // Order state
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('standard');
  const location = useLocation();
  const initialMethod = (location && (location as any).state && (location as any).state.method) ? (location as any).state.method : 'mpesa';
  const [paymentMethod, setPaymentMethod] = useState<string>(initialMethod);
  const [customerNotes, setCustomerNotes] = useState('');
  const [useAsShippingAddress, setUseAsShippingAddress] = useState(true);
  const [paymentPhone, setPaymentPhone] = useState('');

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

  // If user navigated from Cart with a selected method, prefill
  useEffect(() => {
    const state: any = location.state;
    if (state?.method) {
      setPaymentMethod(state.method);
    }
    // If items/amount provided we could prefill other fields or adjust step
  }, [location]);

  // Load shipping methods from backend and prefer enabled first
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.get<any[]>('/cart/shipping-methods/');
        if (!mounted) return;
        if (Array.isArray(data)) {
          // Normalize numeric fields from strings and keep expected shape
          const normalized = data.map((m: any) => ({
            ...m,
            price: m.price !== undefined ? Number(m.price) : (m.price === 0 ? 0 : 0),
            min_order: m.min_order !== undefined ? Number(m.min_order) : 0,
          }));
          setShippingMethodsState(normalized);
          const firstEnabled = normalized.find((m: any) => m.enabled) || null;
          if (firstEnabled) setSelectedShippingMethod(firstEnabled.id);
        }
      } catch (e) {
        // ignore failures and keep static defaults
        console.warn('Failed to load shipping methods', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/carrinho');
    }
  }, [items, navigate]);

  const methods = (shippingMethodsState && shippingMethodsState.length > 0) ? shippingMethodsState : shippingMethods;

  // Only show enabled methods (admin-created)
  const availableMethods = methods.filter((m: any) => m.enabled !== false);

  // Map backend method identifiers / names to nice icons for the tile UI
  const iconForMethod = (m: any) => {
    // prefer an explicit icon property returned by backend
    if (m.icon) return m.icon;
    const id = String(m.id || m.name || '').toLowerCase();
    if (id.includes('express') || id.includes('same')) return <Truck className="h-5 w-5" />;
    if (id.includes('pickup') || id.includes('store') || id.includes('retirada')) return <Home className="h-5 w-5" />;
    if (id.includes('standard') || id.includes('padrao') || id.includes('padrão')) return <Package className="h-5 w-5" />;
    if (id.includes('same_day') || id.includes('mesmo')) return <Clock className="h-5 w-5" />;
    // default
    return <Truck className="h-5 w-5" />;
  };

  const selectedShipping = availableMethods.find((m: any) => m.id === selectedShippingMethod) || methods.find((m: any) => m.id === selectedShippingMethod);
  const shippingCost = selectedShipping ? (Number((selectedShipping as any).price) || 0) : 0;
  const total = subtotal + shippingCost;

  // Helper: returns true when method's min_order gives free shipping for current subtotal
  const methodHasFreeShipping = (m: any) => {
    try {
      const minOrder = Number(m.min_order || 0);
      return minOrder > 0 && subtotal >= minOrder;
    } catch (e) {
      return false;
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
    // Only three steps now (1: address, 2: shipping, 3: review)
    // If we're leaving the address step, copy phone into paymentPhone so review doesn't ask again
    if (step === 1 && shippingAddress.phone) {
      setPaymentPhone((p) => p || shippingAddress.phone);
    }
    setStep(prev => Math.min(prev + 1, 3));
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
        phone: paymentPhone || shippingAddress.phone,
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

  // NOTE: do NOT clear the cart here — cart should only be cleared after the payment
  // is actually approved by the payment gateway (webhook). The backend will clear
  // server-side cart snapshot when payment is confirmed; frontend will clear local
  // cart once confirmation is observed.

      // Navigate to confirmation page (guard against invalid order_id)
      if (order_id == null || Number.isNaN(Number(order_id))) {
        toast({ title: 'Erro', description: 'ID do pedido inválido recebido do servidor. Contate o suporte.', variant: 'destructive' });
      } else {
        navigate(`/pedido/confirmacao/${order_id}`);
      }

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
      {[1, 2, 3].map((stepNumber) => (
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
          {stepNumber < 3 && (
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

              {/* Step 2: Shipping Method (micropages: list / confirm) */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Método de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Escolha o envio</p>

                      {/* Select fallback / accessibility */}
                      <div className="mb-2">
                        <Select value={selectedShippingMethod} onValueChange={(val) => {
                          if (!val) return;
                          setSelectedShippingMethod(val);
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione método de envio" />
                          </SelectTrigger>
                          <SelectContent>
                            {methods.map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>{m.name} {m.enabled ? `— ${m.price === '0.00' || Number(m.price) === 0 ? 'Grátis' : formatPrice(Number(m.price))}` : '— Inativo'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Button-like tiles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableMethods.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhum método disponível</div>
                        ) : availableMethods.map((m: any) => {
                          const isSelected = selectedShippingMethod === m.id;
                          const free = methodHasFreeShipping(m);
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                if (!m.enabled) return toast({ title: 'Método inativo', description: 'Este método está desativado.' });
                                setSelectedShippingMethod(m.id);
                                // advance directly to review for faster checkout on mobile
                                setStep(3);
                              }}
                              aria-pressed={isSelected}
                              className={
                                `w-full text-left rounded-lg p-3 flex items-center gap-3 transition-shadow hover:shadow-sm focus:outline-none ` +
                                (isSelected ? 'ring-2 ring-primary bg-primary/5' : 'bg-card') +
                                (m.enabled ? '' : ' opacity-60 cursor-not-allowed')
                              }
                            >
                              <div className="w-10 h-10 flex items-center justify-center rounded-md bg-muted/20 flex-shrink-0">
                                <div className="text-primary-foreground">
                                  {iconForMethod(m)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium truncate">{m.name}</div>
                                  <div className="text-sm font-semibold truncate">{m.enabled ? (free ? 'Grátis' : formatPrice(Number(m.price))) : 'Inativo'}</div>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{m.delivery_time || m.estimatedDays || ''}</div>
                                {free && <div className="mt-1 text-xs text-green-600 font-medium">Frete grátis</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment step removed — payment inputs are included in Review (step 3) */}

              {/* Step 3: Review & Confirm */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Confirmação do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Payment information (display only) - selected earlier in the flow */}
                    <div>
                      <h4 className="font-medium mb-2">Pagamento</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{paymentMethod.toUpperCase()}</p>
                        {paymentPhone && <p>{paymentPhone}</p>}
                      </div>
                    </div>
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
                
                {step < 3 ? (
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