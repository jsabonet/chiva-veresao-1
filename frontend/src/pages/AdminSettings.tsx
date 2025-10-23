import Loading from '@/components/ui/Loading';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { 
  Save, 
  Upload, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  Lock,
  Bell,
  Palette,
  Database,
  Shield,
  CreditCard,
  Truck,
  Users,
  FileText,
  Tag,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Percent,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminSettings = () => {
  const [settings, setSettings] = useState<any>({
    // minimal/store and shipping settings used by this page
    freeShippingMinimum: 50000,
    shippingCost: 500,
    deliveryTime: '2-5 dias úteis',
    shippingMethods: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Small helper: read CSRF token from cookies (Django default name)
  const getCSRFToken = () => {
    const m = document.cookie.match(/(^|;)\s*csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[2]) : '';
  };

  // safeFetch: prefer apiClient when available, else fall back to fetch with credentials
  const safeFetch = async (url: string, opts: any = {}) => {
    // If apiClient is available, use its convenience methods so Authorization and CSRF headers
    // are handled consistently (it will wait for Firebase auth and include cookies).
    try {
      if (apiClient && typeof (apiClient as any).get === 'function') {
        const method = (opts && opts.method) ? String(opts.method).toUpperCase() : 'GET';
        if (method === 'GET') return await (apiClient as any).get(url);
        if (method === 'POST') return await (apiClient as any).post(url, opts.body ? JSON.parse(opts.body) : {});
        if (method === 'PUT') return await (apiClient as any).put(url, opts.body ? JSON.parse(opts.body) : {});
        if (method === 'PATCH') return await (apiClient as any).patch(url, opts.body ? JSON.parse(opts.body) : {});
        if (method === 'DELETE') return await (apiClient as any).delete(url);
      }
    } catch (e: any) {
      // If it's a validation error (400), re-throw it instead of falling back
      if (e?.message?.includes('400') || e?.message?.includes('already exists')) {
        throw e;
      }
      // For other errors, fall back to fetch implementation below
      console.warn('apiClient request failed, falling back to fetch', e);
    }

    // Build absolute URL for fallback fetch
    const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const headers = Object.assign({}, opts.headers || {}, {
      'X-CSRFToken': getCSRFToken(),
      'Content-Type': opts.body ? 'application/json' : undefined,
    });

    return await fetch(fullUrl, Object.assign({ credentials: 'include', headers }, opts));
  };

  // Load server shipping methods
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const res = await safeFetch('/cart/admin/shipping-methods/');
        if (!res) return;
        // res may be a fetch Response or apiClient result
        const data = typeof res.json === 'function' ? await res.json() : res;
        if (!mounted) return;
        if (Array.isArray(data)) {
          setSettings((s: any) => ({ ...s, shippingMethods: data.map((m: any) => ({ ...m, isEditing: false })) }));
        }
      } catch (err) {
        console.warn('Failed to load shipping methods', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  // Load coupons
  const loadCoupons = async () => {
    setIsCouponsLoading(true);
    try {
      const res = await safeFetch('/cart/admin/coupons/');
      const data = typeof res.json === 'function' ? await res.json() : res;
      if (Array.isArray(data)) {
        setCoupons(data);
      }
    } catch (err) {
      console.error('Failed to load coupons', err);
      toast({ title: 'Erro', description: 'Não foi possível carregar os cupons.', variant: 'destructive' });
    } finally {
      setIsCouponsLoading(false);
    }
  };
  
  useEffect(() => {
    loadCoupons();
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((s: any) => ({ ...s, [key]: value }));
  };

  const handleUpdateShippingMethod = (id: string, key: string, value: any) => {
    setSettings((s: any) => ({
      ...s,
      shippingMethods: (s.shippingMethods || []).map((m: any) => m.id === id ? { ...m, [key]: value } : m),
    }));
  };

  const handleStartEdit = (id: string) => {
    setSettings((s: any) => ({
      ...s,
      shippingMethods: (s.shippingMethods || []).map((m: any) => m.id === id ? { ...m, isEditing: true, _backup: { ...m } } : m),
    }));
  };

  const handleCancelEdit = (id: string) => {
    setSettings((s: any) => ({
      ...s,
      shippingMethods: (s.shippingMethods || []).map((m: any) => {
        if (m.id === id) {
          // if this was a temp local entry (id starts with m_), remove it
          if (String(id).startsWith('m_')) return null;
          return { ...(m._backup || {}), isEditing: false };
        }
        return m;
      }).filter(Boolean),
    }));
  };

  const handleAddShippingMethod = () => {
    const id = `m_${Date.now()}`;
    const newMethod = {
      id,
      name: 'Novo Método',
      price: 0,
      minOrder: 0,
      deliveryTime: '',
      regions: '',
      enabled: true,
      isEditing: true,
    };
    setIsCreating(true);
    setSettings((s: any) => ({ ...s, shippingMethods: [newMethod, ...(s.shippingMethods || [])] }));
    // autofocus will be handled by DOM - simple setTimeout to lift creation flag
    setTimeout(() => setIsCreating(false), 200);
  };

  const handleSaveSingleMethod = async (id: string) => {
    setIsSaving(true);
    try {
      const method = (settings.shippingMethods || []).find((m: any) => m.id === id);
      if (!method) return;
      const payload = {
        name: method.name,
        price: Number(method.price) || 0,
        min_order: Number(method.minOrder) || 0,
        delivery_time: method.deliveryTime || '',
        regions: method.regions || '',
        enabled: !!method.enabled,
      };

      if (String(id).startsWith('m_')) {
  const res = await safeFetch('/cart/admin/shipping-methods/', { method: 'POST', body: JSON.stringify(payload) });
        const data = typeof res.json === 'function' ? await res.json() : res;
        // replace temp id with server id
        setSettings((s: any) => ({
          ...s,
          shippingMethods: (s.shippingMethods || []).map((m: any) => m.id === id ? { ...data, isEditing: false } : m),
        }));
      } else {
  const res = await safeFetch(`/cart/admin/shipping-methods/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
        const data = typeof res.json === 'function' ? await res.json() : res;
        setSettings((s: any) => ({
          ...s,
          shippingMethods: (s.shippingMethods || []).map((m: any) => m.id === id ? { ...data, isEditing: false } : m),
        }));
      }
    } catch (err) {
      console.error('Save shipping method failed', err);
      toast({ title: 'Erro', description: 'Não foi possível salvar o método de envio.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShippingMethod = async (id: string) => {
    if (String(id).startsWith('m_')) {
      // just remove from local array
      setSettings((s: any) => ({ ...s, shippingMethods: (s.shippingMethods || []).filter((m: any) => m.id !== id) }));
      return;
    }
    try {
      // safeFetch/apiClient will throw on error; if it completes, treat as success
      await safeFetch(`/cart/admin/shipping-methods/${id}/`, { method: 'DELETE' });
      setSettings((s: any) => ({ ...s, shippingMethods: (s.shippingMethods || []).filter((m: any) => m.id !== id) }));
    } catch (err) {
      console.error('Delete shipping method failed', err);
      toast({ title: 'Erro', description: 'Não foi possível remover o método de envio.' });
    }
  };
  
  // Coupon management functions
  const handleCreateCoupon = () => {
    setEditingCoupon({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      minimum_amount: null,
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      max_uses: null,
      max_uses_per_user: null,
      is_active: true,
    });
    setIsCreatingCoupon(true);
  };
  
  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon({
      ...coupon,
      valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '',
      valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '',
    });
    setIsCreatingCoupon(false);
  };
  
  const handleSaveCoupon = async () => {
    if (!editingCoupon) return;
    
    try {
      // Prepare payload - remove read-only fields
      const payload = {
        code: editingCoupon.code,
        name: editingCoupon.name,
        description: editingCoupon.description || '',
        discount_type: editingCoupon.discount_type,
        discount_value: Number(editingCoupon.discount_value),
        minimum_amount: editingCoupon.minimum_amount ? Number(editingCoupon.minimum_amount) : null,
        valid_from: new Date(editingCoupon.valid_from).toISOString(),
        valid_until: new Date(editingCoupon.valid_until).toISOString(),
        max_uses: editingCoupon.max_uses ? Number(editingCoupon.max_uses) : null,
        max_uses_per_user: editingCoupon.max_uses_per_user ? Number(editingCoupon.max_uses_per_user) : null,
        is_active: Boolean(editingCoupon.is_active),
      };
      
      if (isCreatingCoupon) {
        const res = await safeFetch('/cart/admin/coupons/', { 
          method: 'POST', 
          body: JSON.stringify(payload) 
        });
        const data = typeof res.json === 'function' ? await res.json() : res;
        setCoupons([data, ...coupons]);
        toast({ title: 'Sucesso', description: 'Cupom criado com sucesso!' });
      } else {
        const res = await safeFetch(`/cart/admin/coupons/${editingCoupon.id}/`, { 
          method: 'PUT', 
          body: JSON.stringify(payload) 
        });
        const data = typeof res.json === 'function' ? await res.json() : res;
        setCoupons(coupons.map(c => c.id === data.id ? data : c));
        toast({ title: 'Sucesso', description: 'Cupom atualizado com sucesso!' });
      }
      
      setEditingCoupon(null);
      setIsCreatingCoupon(false);
    } catch (err: any) {
      console.error('Save coupon failed', err);
      
      // Try to extract error message from response
      let errorMessage = 'Não foi possível salvar o cupom.';
      if (err?.message && err.message.includes('already exists')) {
        errorMessage = 'Este código de cupom já existe. Use outro código.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      toast({ title: 'Erro', description: errorMessage, variant: 'destructive' });
    }
  };
  
  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
    
    try {
      await safeFetch(`/cart/admin/coupons/${id}/`, { method: 'DELETE' });
      setCoupons(coupons.filter(c => c.id !== id));
      toast({ title: 'Sucesso', description: 'Cupom excluído com sucesso!' });
    } catch (err) {
      console.error('Delete coupon failed', err);
      toast({ title: 'Erro', description: 'Não foi possível excluir o cupom.', variant: 'destructive' });
    }
  };
  
  const handleCancelEditCoupon = () => {
    setEditingCoupon(null);
    setIsCreatingCoupon(false);
  };

  const handleSave = async () => {
    // For now, persist only shipping-level settings (freeShippingMinimum, shippingCost, deliveryTime)
    setIsSaving(true);
    try {
      // This project doesn't have a dedicated endpoint for store settings in this file,
      // so we just inform the user that method-level saves are separate.
      toast({ title: 'Salvo', description: 'Configurações salvas localmente. Métodos de envio devem ser salvos individualmente.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Configurações da Loja</h1>
          <p className="text-muted-foreground">Gerencie envios, cupons e configurações relacionadas</p>
        </div>
      </div>

      <Tabs defaultValue="shipping" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Métodos de Envio
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Cupons de Desconto
          </TabsTrigger>
        </TabsList>
        
        {/* Shipping Tab */}
        <TabsContent value="shipping" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Métodos de Envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {(settings.shippingMethods || []).map((method: any) => (
                <div key={method.id} className="border rounded p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        id={`method-name-${method.id}`}
                        value={method.name}
                        onChange={(e) => handleUpdateShippingMethod(method.id, 'name', e.target.value)}
                        disabled={!method.isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço (MZN)</Label>
                      <Input
                        type="number"
                        value={method.price}
                        onChange={(e) => handleUpdateShippingMethod(method.id, 'price', Number(e.target.value || 0))}
                        disabled={!method.isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frete Grátis Acima de (MZN)</Label>
                      <Input
                        type="number"
                        value={method.minOrder}
                        onChange={(e) => handleUpdateShippingMethod(method.id, 'minOrder', Number(e.target.value || 0))}
                        disabled={!method.isEditing}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Tempo de Entrega</Label>
                      <Input value={method.deliveryTime} onChange={(e) => handleUpdateShippingMethod(method.id, 'deliveryTime', e.target.value)} disabled={!method.isEditing} />
                    </div>
                    <div className="space-y-2">
                      <Label>Regiões</Label>
                      <Input value={method.regions} onChange={(e) => handleUpdateShippingMethod(method.id, 'regions', e.target.value)} disabled={!method.isEditing} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">Ativo</p>
                      </div>
                      <Switch
                        checked={method.enabled}
                        onCheckedChange={(checked) => handleUpdateShippingMethod(method.id, 'enabled', checked)}
                        disabled={!method.isEditing}
                      />
                    </div>
                    <div className="flex gap-2">
                      {!method.isEditing ? (
                        <>
                          <Button onClick={() => handleStartEdit(method.id)}>Editar</Button>
                          <Button variant="destructive" onClick={() => handleDeleteShippingMethod(method.id)}>Remover</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => handleSaveSingleMethod(method.id)} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
                          <Button variant="outline" onClick={() => handleCancelEdit(method.id)}>Cancelar</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex">
                <Button onClick={handleAddShippingMethod} disabled={isCreating}>{isCreating ? 'Criando...' : 'Adicionar Método de Envio'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
        
        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Cupons de Desconto
              </CardTitle>
              <Button onClick={handleCreateCoupon} disabled={!!editingCoupon}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cupom
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCouponsLoading ? (
                <Loading label="Carregando cupons..." />
              ) : editingCoupon ? (
                <div className="border rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold">
                    {isCreatingCoupon ? 'Criar Novo Cupom' : 'Editar Cupom'}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="coupon-code">Código *</Label>
                      <Input
                        id="coupon-code"
                        value={editingCoupon.code}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                        placeholder="EX: DESCONTO10"
                        className="uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coupon-name">Nome *</Label>
                      <Input
                        id="coupon-name"
                        value={editingCoupon.name}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, name: e.target.value })}
                        placeholder="Nome do cupom"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="coupon-description">Descrição</Label>
                    <Textarea
                      id="coupon-description"
                      value={editingCoupon.description}
                      onChange={(e) => setEditingCoupon({ ...editingCoupon, description: e.target.value })}
                      placeholder="Descrição do cupom"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount-type">Tipo de Desconto *</Label>
                      <Select
                        value={editingCoupon.discount_type}
                        onValueChange={(value) => setEditingCoupon({ ...editingCoupon, discount_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (MZN)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount-value">Valor do Desconto *</Label>
                      <Input
                        id="discount-value"
                        type="number"
                        value={editingCoupon.discount_value}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_value: Number(e.target.value) })}
                        placeholder={editingCoupon.discount_type === 'percentage' ? '10' : '100'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimum-amount">Valor Mínimo (MZN)</Label>
                      <Input
                        id="minimum-amount"
                        type="number"
                        value={editingCoupon.minimum_amount || ''}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, minimum_amount: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valid-from">Válido De *</Label>
                      <Input
                        id="valid-from"
                        type="datetime-local"
                        value={editingCoupon.valid_from}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, valid_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valid-until">Válido Até *</Label>
                      <Input
                        id="valid-until"
                        type="datetime-local"
                        value={editingCoupon.valid_until}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, valid_until: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-uses">Máximo de Usos</Label>
                      <Input
                        id="max-uses"
                        type="number"
                        value={editingCoupon.max_uses || ''}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, max_uses: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Ilimitado"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-uses-per-user">Máximo por Usuário</Label>
                      <Input
                        id="max-uses-per-user"
                        type="number"
                        value={editingCoupon.max_uses_per_user || ''}
                        onChange={(e) => setEditingCoupon({ ...editingCoupon, max_uses_per_user: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Label htmlFor="coupon-active">Cupom Ativo</Label>
                    <Switch
                      id="coupon-active"
                      checked={editingCoupon.is_active}
                      onCheckedChange={(checked) => setEditingCoupon({ ...editingCoupon, is_active: checked })}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveCoupon}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Cupom
                    </Button>
                    <Button variant="outline" onClick={handleCancelEditCoupon}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum cupom criado</h3>
                  <p className="text-muted-foreground mb-4">Crie seu primeiro cupom de desconto</p>
                  <Button onClick={handleCreateCoupon}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Cupom
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-bold text-lg">{coupon.code}</span>
                            {coupon.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Ativo</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inativo</span>
                            )}
                            {coupon.is_currently_valid && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Válido</span>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium mb-1">{coupon.name}</p>
                          {coupon.description && (
                            <p className="text-sm text-muted-foreground mb-2">{coupon.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {coupon.discount_type === 'percentage' ? (
                                <Percent className="h-4 w-4" />
                              ) : (
                                <DollarSign className="h-4 w-4" />
                              )}
                              <span>
                                {coupon.discount_type === 'percentage' 
                                  ? `${coupon.discount_value}%` 
                                  : `${coupon.discount_value} MZN`}
                              </span>
                            </div>
                            
                            {coupon.minimum_amount && (
                              <span>Mín: {coupon.minimum_amount} MZN</span>
                            )}
                            
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(coupon.valid_from).toLocaleDateString()} - {new Date(coupon.valid_until).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {coupon.max_uses && (
                              <span>
                                Usos: {coupon.used_count}/{coupon.max_uses}
                                {coupon.usage_percentage && ` (${coupon.usage_percentage}%)`}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCoupon(coupon)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminSettings;
