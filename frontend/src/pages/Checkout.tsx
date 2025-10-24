import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/hooks/usePayments';
import { apiClient, customersApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Check,
  ChevronRight,
  ArrowLeft
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
  
  // Anonymous users fallback storage for contact data
  const STORAGE_KEY = 'chiva:checkout:user';
  const readStoredContact = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const writeStoredContact = (data: { name: string; phone: string; email: string; address: string; city: string; province: string; postal_code?: string; }) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  };
  
  // Coupon state from Cart navigation
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

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

  // Prefill from profile (authenticated) or app storage (anonymous)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (currentUser) {
          const me = await customersApi.me();
          if (!mounted || !me) return;
          setShippingAddress(prev => ({
            ...prev,
            name: prev.name || me.name || prev.name,
            phone: prev.phone || me.phone || prev.phone,
            email: prev.email || me.email || prev.email,
            address: prev.address || me.address || prev.address,
            city: prev.city || me.city || prev.city,
            province: prev.province || me.province || prev.province,
            postal_code: prev.postal_code || (me as any).postal_code || prev.postal_code,
          }));
        } else {
          const stored = readStoredContact();
          if (!stored) return;
          setShippingAddress(prev => ({
            ...prev,
            name: prev.name || stored.name || prev.name,
            phone: prev.phone || stored.phone || prev.phone,
            email: prev.email || stored.email || prev.email,
            address: prev.address || stored.address || prev.address,
            city: prev.city || stored.city || prev.city,
            province: prev.province || stored.province || prev.province,
            postal_code: prev.postal_code || stored.postal_code || prev.postal_code,
          }));
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  // If user navigated from Cart with a selected method, prefill
  useEffect(() => {
    const state: any = location.state;
    if (state?.method) {
      setPaymentMethod(state.method);
    }
    // Load coupon information if passed from Cart
    if (state?.coupon_code && state?.discount_amount) {
      setAppliedCoupon({
        code: state.coupon_code,
        discount: state.discount_amount
      });
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
  const discountAmount = appliedCoupon?.discount || 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

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
        currency: 'MZN',
        shipping_method: selectedShippingMethod,
        shipping_address: shippingAddress,
        billing_address: useAsShippingAddress ? shippingAddress : shippingAddress, // For now, same as shipping
        customer_notes: customerNotes,
        // Include coupon information if applied
        coupon_code: appliedCoupon?.code,
        items: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          color_id: item.color_id || null
        }))
      };
      // For anonymous users, persist contact locally for next checkout
      if (!currentUser) {
        writeStoredContact({
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          email: shippingAddress.email,
          address: shippingAddress.address,
          city: shippingAddress.city,
          province: shippingAddress.province,
          postal_code: shippingAddress.postal_code,
        });
      }

      const { order_id, payment_id, payment } = await initiatePayment(paymentMethod as "mpesa" | "emola" | "card" | "transfer", orderData);

      // If authenticated, persist shipping info to profile for future use and admin visibility
      try {
        if (currentUser) {
          await customersApi.updateMe({
            name: shippingAddress.name,
            email: shippingAddress.email,
            phone: shippingAddress.phone,
            address: shippingAddress.address,
            city: shippingAddress.city,
            province: shippingAddress.province,
            postal_code: shippingAddress.postal_code,
          } as any);
          // Notify other tabs/views to refresh data
          try { window.localStorage.setItem('chiva:profileUpdated', String(Date.now())); } catch {}
        }
      } catch (e) {
        // Do not block checkout on profile save failure
        console.warn('Failed to persist profile during checkout', e);
      }

  // NOTE: do NOT clear the cart here — cart should only be cleared after the payment
  // is actually approved by the payment gateway (webhook). The backend will clear
  // server-side cart snapshot when payment is confirmed; frontend will clear local
  // cart once confirmation is observed.

      // Navigate to confirmation page using payment_id (order_id only if already created)
      const confirmationId = payment_id || order_id;
      if (confirmationId == null || Number.isNaN(Number(confirmationId))) {
        toast({ title: 'Erro', description: 'ID do pagamento inválido recebido do servidor. Contate o suporte.', variant: 'destructive' });
      } else {
        navigate(`/pedido/confirmacao/${confirmationId}`);
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

  const StepIndicator = () => {
    const steps = [
      { number: 1, label: 'Endereço', icon: MapPin },
      { number: 2, label: 'Entrega', icon: Truck },
      { number: 3, label: 'Confirmar', icon: Package }
    ];

    return (
      <div className="flex items-center justify-between mb-8 px-4 sm:px-0">
        {steps.map((s, idx) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                  step >= s.number
                    ? 'bg-primary text-white scale-110'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step > s.number ? (
                  <Check className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <s.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                )}
              </div>
              <p className={`text-xs sm:text-sm mt-2 font-medium ${step >= s.number ? 'text-primary' : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 transition-all duration-300 ${
                  step > s.number ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (items.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Finalizar Compra</h1>
            <p className="text-muted-foreground">Complete os dados para concluir seu pedido</p>
          </div>
          
          <StepIndicator />

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
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

                    {/* Visual Cards */}
                    <div className="grid grid-cols-1 gap-4">
                      {availableMethods.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhum método de envio disponível</p>
                        </div>
                      ) : availableMethods.map((m: any) => {
                        const isSelected = selectedShippingMethod === m.id;
                        const free = methodHasFreeShipping(m);
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              if (!m.enabled) return toast({ title: 'Método inativo', description: 'Este método está desativado.' });
                              setSelectedShippingMethod(m.id);
                              setStep(3);
                            }}
                            disabled={!m.enabled}
                            className={`w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 ${
                              isSelected 
                                ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary shadow-lg transform scale-105' 
                                : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                            } ${!m.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className={`w-14 h-14 flex items-center justify-center rounded-xl flex-shrink-0 ${
                              isSelected 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                                : 'bg-white text-gray-600'
                            }`}>
                              {iconForMethod(m)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">{m.name}</h3>
                                <span className={`text-base sm:text-lg font-bold whitespace-nowrap ${
                                  free || m.price === '0.00' || Number(m.price) === 0 
                                    ? 'text-green-600' 
                                    : 'text-gray-900'
                                }`}>
                                  {m.enabled ? (free || m.price === '0.00' || Number(m.price) === 0 ? 'Grátis' : formatPrice(Number(m.price))) : 'Inativo'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-1">{m.delivery_time || m.estimatedDays || 'Entrega estimada'}</p>
                              {free && <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">🎉 Frete grátis</div>}
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <Check className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    </div>
                  </CardContent>
                </Card>
              )}

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
                      <h4 className="font-medium mb-2">Método de Entrega</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{selectedShipping?.name}</p>
                        <p>{selectedShipping?.description}</p>
                      </div>
                    </div>

                    {customerNotes && (
                      <div>
                        <h4 className="font-medium mb-2">Observações</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p>{customerNotes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {step > 1 && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePreviousStep}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                )}
                
                {step < 3 ? (
                  <Button 
                    size="lg"
                    onClick={handleNextStep} 
                    className="w-full sm:ml-auto"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleCompleteOrder}
                    disabled={isLoading}
                    className="w-full sm:ml-auto"
                  >
                    {isLoading ? (
                      <>Processando...</>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Finalizar Pedido
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:sticky lg:top-4 h-fit">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r bg-primary p-6">
                  <div className="flex items-center gap-3 text-white">
                    <ShoppingBag className="h-6 w-6" />
                    <h2 className="text-xl font-bold">Resumo do Pedido</h2>
                  </div>
                </div>
                
                <div className="p-6 space-y-5">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={`${item.id}-${item.color_id || 'no-color'}`} className="flex items-center gap-3 pb-4 border-b border-gray-100 last:border-0">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover shadow-md"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{item.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {item.color_name && `${item.color_name} • `}Qtd: {item.quantity}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 pt-4 border-t-2 border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-base font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                    </div>
                    
                    {/* Show discount if coupon applied */}
                    {appliedCoupon && discountAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600">
                          Desconto ({appliedCoupon.code}):
                        </span>
                        <span className="text-base font-semibold text-green-600">
                          -{formatPrice(discountAmount)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Entrega:</span>
                      <span className={`text-base font-semibold ${shippingCost === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {shippingCost === 0 ? 'Grátis' : formatPrice(shippingCost)}
                      </span>
                    </div>
                    <div className="pt-3 border-t-2 border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}