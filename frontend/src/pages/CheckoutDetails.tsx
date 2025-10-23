import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/formatPrice';
import { usePayments } from '@/hooks/usePayments';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { customersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface NavState {
  method?: string;
  items?: Array<{ id: number; quantity: number; color_id?: number | null }>;
  amount?: number;
  shipping_amount?: number;
  currency?: string;
}

export default function CheckoutDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, items: cartItems } = useCart();
  const { initiatePayment } = usePayments();
  const { currentUser } = useAuth();

  const state = (location.state || {}) as NavState;

  const [method, setMethod] = useState<string>(state.method || 'mpesa');
  const [amount, setAmount] = useState<number>(state.amount || 0);
  const [shippingAmount, setShippingAmount] = useState<number>(state.shipping_amount || 0);
  const [currency, setCurrency] = useState<string>(state.currency || 'MZN');
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [notes, setNotes] = useState('');
  const [saveToProfile, setSaveToProfile] = useState<boolean>(true);

  // App-managed fallback storage for anonymous users (not browser autofill)
  const STORAGE_KEY = 'chiva:checkout:user';
  const readStoredContact = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const writeStoredContact = (data: { name: string; phone: string; email: string; address: string; city: string; province: string; }) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const [step, setStep] = useState<number>(1);
  // microStep for the dedicated shipping selection page (micropaginas)
  const [shippingMicroStep, setShippingMicroStep] = useState<'list' | 'confirm'>('list');
  const [shippingPreviewMethod, setShippingPreviewMethod] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // load shipping methods from backend
    (async () => {
      try {
        const res = await fetch('/api/cart/shipping-methods/', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setShippingMethods(data || []);
          const firstEnabled = (data || []).find((m: any) => m.enabled) || null;
          if (firstEnabled) {
            setSelectedShippingMethodId(firstEnabled.id);
            setShippingAmount(Number(firstEnabled.price) || 0);
            // Update amount accordingly if initial amount was subtotal
            if (!state.amount && cartItems) {
              const subtotal = cartItems.reduce((s, it) => s + (it.price || 0) * it.quantity, 0 as number);
              setAmount(subtotal + (Number(firstEnabled.price) || 0));
            }
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    // If route didn't pass items/amount, try to infer from cart
    if (!state.items && cartItems && cartItems.length > 0) {
      // calculate subtotal locally if amount not provided
      if (!state.amount) {
        const subtotal = cartItems.reduce((s, it) => s + (it.price || 0) * it.quantity, 0 as number);
        setAmount(subtotal + (state.shipping_amount || 0));
      }
    } else {
      if (state.amount) setAmount(state.amount);
    }
  }, [state, cartItems]);

  // Prefill from profile when authenticated
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (currentUser) {
          const me = await customersApi.me();
          if (!mounted || !me) return;
          // Only set fields if they are empty to not override existing state
          if (!name && me.name) setName(me.name);
          if (!phone && me.phone) setPhone(me.phone);
          if (!email && me.email) setEmail(me.email);
          if (!address && me.address) setAddress(me.address);
          if (!city && me.city) setCity(me.city);
          if (!province && me.province) setProvince(me.province);
        } else {
          // Anonymous: prefill from app-managed storage instead of browser autofill
          const stored = readStoredContact();
          if (!stored) return;
          if (!name && stored.name) setName(stored.name);
          if (!phone && stored.phone) setPhone(stored.phone);
          if (!email && stored.email) setEmail(stored.email);
          if (!address && stored.address) setAddress(stored.address);
          if (!city && stored.city) setCity(stored.city);
          if (!province && stored.province) setProvince(stored.province);
        }
      } catch (e) {
        // ignore if unauthenticated or endpoint unavailable
      }
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  // Build previewItems: if route provided only ids/quantities, merge with cart details
  const previewItems = (state.items && state.items.length > 0)
    ? state.items.map(si => ({
      ...si,
      ...(cartItems.find(ci => ci.id === si.id) || {})
    }))
    : cartItems;

  const validate = () => {
    if (!name || !phone || !email || !address || !city || !province) {
      toast({ title: 'Dados incompletos', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return false;
    }

    // Email basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: 'Email inválido', description: 'Insira um email válido', variant: 'destructive' });
      return false;
    }

    // Phone validation: require at least 9 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      toast({ title: 'Telefone inválido', description: 'Insira um número de telefone válido', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '');
    // Try to format Mozambican numbers: +258 XX XXX XXXX or fallback grouping
    if (d.startsWith('258') && d.length <= 12) {
      // remove leading 258 for formatting
      const rest = d.slice(3);
      if (rest.length <= 2) return `+258 ${rest}`;
      if (rest.length <= 5) return `+258 ${rest.slice(0,2)} ${rest.slice(2)}`;
      if (rest.length <= 8) return `+258 ${rest.slice(0,2)} ${rest.slice(2,5)} ${rest.slice(5)}`;
      return `+258 ${rest.slice(0,2)} ${rest.slice(2,5)} ${rest.slice(5,9)}`;
    }
    // Generic grouping: +X XXX XXX XXXX
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
    if (d.length <= 10) return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
    return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,10)} ${d.slice(10)}`;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Optionally save back to profile before initiating payment
      if (currentUser && saveToProfile) {
        try {
          await customersApi.updateMe({ name, email, phone, address, city, province });
        } catch (e) {
          // Non-blocking: continue checkout even if saving profile fails
        }
      } else {
        // Store contact details for anonymous users or when not saving to profile
        writeStoredContact({ name, phone, email, address, city, province });
      }

      const payload: any = {
        method: method,
        // Do NOT send amount/shipping_amount to avoid mismatch; let server compute from cart and shipping_method
        shipping_method: selectedShippingMethodId,
        currency: currency,
        shipping_address: { name, phone, email, address, city, province },
        billing_address: { name, phone, email, address, city, province },
        customer_notes: notes,
        // Keep items only to trigger cart sync on the client hook
        items: state.items || cartItems.map(it => ({ id: it.id, quantity: it.quantity, color_id: it.color_id || null }))
      };

      const { order_id, payment_id, payment } = await initiatePayment(method as 'mpesa' | 'emola' | 'card' | 'transfer', payload);

      // If gateway provided a checkout URL, redirect the user
      const redirectUrl = payment?.checkout_url || payment?.redirect_url || payment?.payment_url;
      if (redirectUrl) {
        // Optionally clear cart if order is created server-side
        try { clearCart(); } catch (e) {}
        window.location.href = redirectUrl;
        return;
      }

      // Navigate to order confirmation using payment_id (order_id only if already created)
      clearCart();
      const confirmationId = payment_id || order_id;
      if (confirmationId == null || Number.isNaN(Number(confirmationId))) {
        toast({ title: 'Erro', description: 'ID do pagamento inválido recebido do servidor. Contate o suporte.', variant: 'destructive' });
      } else {
        navigate(`/pedido/confirmacao/${confirmationId}`);
      }
    } catch (e: any) {
      // Handle structured backend errors thrown by usePayments
      if (e?.code === 'amount_exceeds_method_limit') {
        // e may contain method, limit, total, suggestions
        let detail = e.message || 'O valor total excede o limite para o método selecionado.';
        if (e.limit) detail += ` Limite: ${e.limit}.`;
        if (e.total) detail += ` Total: ${e.total}.`;
        // If suggestions provided, offer them to the user
        if (Array.isArray(e.suggestions) && e.suggestions.length > 0) {
          detail += ` Tente métodos alternativos: ${e.suggestions.join(', ')}.`;
        }
        toast({ title: 'Valor acima do limite', description: detail, variant: 'destructive' });
        // If suggestions exist, pre-select the first suggested method to help the user
        if (Array.isArray(e.suggestions) && e.suggestions.length > 0) {
          setMethod(e.suggestions[0]);
        }
      } else if (e?.code === 'amount_mismatch') {
        // Backend indicates cart or shipping changed
        const detail = e.message || 'O total no servidor mudou. Recarregue a página para atualizar.';
        toast({ title: 'Carrinho atualizado', description: detail, variant: 'destructive' });
      } else if (e?.code === 'cart_empty_or_invalid') {
        // Map warnings to short messages for the user
        const warnings = Array.isArray(e?.warnings) ? e.warnings : [];
        const messages = warnings.slice(0, 3).map((w: any) => {
          if (w?.type === 'product_not_found') return `Produto #${w.product_id} indisponível`;
          if (w?.type === 'color_not_found') return `Cor inválida para produto #${w.product_id}`;
          if (w?.type === 'quantity_adjusted') return `Quantidade ajustada para produto #${w.product_id}`;
          return null;
        }).filter(Boolean);
        const extra = messages.length ? ` — ${messages.join(' • ')}` : '';
        toast({ title: 'Itens indisponíveis', description: (e.message || 'Seu carrinho está vazio ou contém itens indisponíveis.') + extra, variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: e?.message || 'Falha ao criar pedido', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Finalizar Compra</h1>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {/* Minimal stepper */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 text-sm`}> 
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>1</div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
                </div>
                <div className="text-sm text-muted-foreground">{step === 1 ? 'Preencha os dados' : step === 2 ? 'Escolha de envio' : 'Revisão'}</div>
              </div>

              {step === 1 && (
                <>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Dados do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {currentUser && (
                        <div className="flex items-center justify-between rounded border p-2 bg-muted/40">
                          <label className="text-sm flex items-center gap-2">
                            <input type="checkbox" className="accent-primary" checked={saveToProfile} onChange={(e)=>setSaveToProfile(e.target.checked)} />
                            <span>Salvar estes dados no meu perfil</span>
                          </label>
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nome *</Label>
                          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefone *</Label>
                          <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="address">Endereço *</Label>
                        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">Cidade *</Label>
                          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="province">Província *</Label>
                          <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="notes">Observações</Label>
                          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
                    <Button onClick={() => { if (validate()) { setShippingMicroStep('list'); setStep(2); } }}>
                      Próximo
                    </Button>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  {/* Shipping selection page implemented as micropáginas for mobile */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Método de Envio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {shippingMicroStep === 'list' && (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">Selecione o método de envio que mais se adequa ao seu pedido</p>
                          <div className="space-y-2">
                            {shippingMethods.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhum método disponível</p>
                            ) : (
                              shippingMethods.map((sm: any) => (
                                <div key={sm.id} className={`rounded p-3 flex items-center justify-between border ${!sm.enabled ? 'opacity-60' : ''}`}>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{sm.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{sm.delivery_time || '—'}</div>
                                  </div>
                                  <div className="text-right ml-4 flex-shrink-0">
                                    <div className="text-sm font-medium">{sm.enabled ? (sm.price === '0.00' || Number(sm.price) === 0 ? 'Grátis' : formatPrice(Number(sm.price))) : 'Inativo'}</div>
                                    <div className="mt-2 flex gap-2 justify-end">
                                      <Button size="sm" variant="ghost" onClick={() => { setShippingPreviewMethod(sm); setShippingMicroStep('confirm'); }}>Ver</Button>
                                      <Button size="sm" onClick={() => {
                                        if (!sm.enabled) return;
                                        setSelectedShippingMethodId(sm.id);
                                        const price = Number(sm.price) || 0;
                                        setShippingAmount(price);
                                        const subtotal = cartItems.reduce((s, it) => s + (it.price || 0) * it.quantity, 0 as number);
                                        setAmount(subtotal + price);
                                        // advance to review step after selection
                                        setStep(3);
                                      }}>{sm.enabled ? 'Selecionar' : '—'}</Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {shippingMicroStep === 'confirm' && shippingPreviewMethod && (
                        <div>
                          <div className="font-medium text-lg">{shippingPreviewMethod.name}</div>
                          <div className="text-sm text-muted-foreground">Tempo: {shippingPreviewMethod.delivery_time || '—'}</div>
                          <div className="mt-2">Regiões: {shippingPreviewMethod.regions || 'Todas'}</div>
                          <div className="mt-4 flex gap-2">
                            <Button variant="outline" onClick={() => setShippingMicroStep('list')}>Voltar</Button>
                            <Button onClick={() => {
                              const sm = shippingPreviewMethod;
                              if (!sm.enabled) return toast({ title: 'Método inativo', description: 'Este método está desativado.' });
                              setSelectedShippingMethodId(sm.id);
                              const price = Number(sm.price) || 0;
                              setShippingAmount(price);
                              const subtotal = cartItems.reduce((s, it) => s + (it.price || 0) * it.quantity, 0 as number);
                              setAmount(subtotal + price);
                              setStep(3);
                            }}>Confirmar este Método</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-between mt-3">
                    <Button variant="ghost" onClick={() => setStep(1)}>Anterior</Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => { setShippingMicroStep('list'); }}>Listar</Button>
                      <Button onClick={() => { setStep(3); }}>Próximo</Button>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Revisão</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{name}</p>
                        <p>{address}</p>
                        <p>{city}, {province}</p>
                        <p>{phone}</p>
                        <p>{email}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>Anterior</Button>
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Processando...' : 'Confirmar e Pagar'}</Button>
                  </div>
                </>
              )}

            </div>

            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product preview */}
                  <div className="max-h-56 overflow-y-auto border rounded-md bg-muted/5 p-2">
                    {previewItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum item no resumo</p>
                    ) : (
                      previewItems.map((it: any) => (
                        <div key={`${it.id}-${it.color_id || 'no-color'}`} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                          <div className="w-12 h-12 bg-accent/30 rounded overflow-hidden flex-shrink-0">
                            <img src={it.image || '/placeholder.svg'} alt={it.name || `Produto ${it.id}`} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{it.name || `Produto #${it.id}`}</div>
                            <div className="text-xs text-muted-foreground truncate">{it.color_name || (it.color_id ? `Cor ${it.color_id}` : '')}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">x{it.quantity}</div>
                            <div className="text-sm font-medium">{formatPrice((it.price || 0) * (it.quantity || 1))}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-accent/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Método</p>
                    <div className="space-y-2">
                      <p className="text-lg font-bold">{method?.toUpperCase()}</p>
                      <div>
                        <select className="w-full p-2 border rounded" value={selectedShippingMethodId || ''} onChange={(e) => {
                          const id = e.target.value || null;
                          setSelectedShippingMethodId(id);
                          const m = shippingMethods.find(sm => sm.id === id);
                          const price = m ? Number(m.price) : 0;
                          setShippingAmount(price);
                          // recalc amount based on subtotal
                          const subtotal = cartItems.reduce((s, it) => s + (it.price || 0) * it.quantity, 0 as number);
                          setAmount(subtotal + price);
                        }}>
                          <option value="">Selecione método de envio</option>
                          {shippingMethods.map(sm => (
                            <option key={sm.id} value={sm.id}>{sm.name} — {sm.enabled ? formatPrice(Number(sm.price)) : 'Inativo'}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Itens</span>
                      <span>{previewItems.length} peças</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Frete</span>
                      <span>{shippingAmount === 0 ? 'Grátis' : formatPrice(shippingAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>{formatPrice(amount)}</span>
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
