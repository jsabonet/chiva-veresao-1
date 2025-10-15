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
  FileText
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
    } catch (e) {
      // If apiClient throws, fall back to fetch implementation below
      console.warn('apiClient request failed, falling back to fetch', e);
    }

    const headers = Object.assign({}, opts.headers || {}, {
      'X-CSRFToken': getCSRFToken(),
      'Content-Type': opts.body ? 'application/json' : undefined,
    });

    return await fetch(url, Object.assign({ credentials: 'include', headers }, opts));
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
          <h1 className="text-2xl font-bold">Configurações de Envio</h1>
          <p className="text-muted-foreground">Gerencie os métodos de envio e configurações relacionadas</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Configurações de Envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="freeShippingMinimum">Frete Grátis Acima de (MZN)</Label>
                <Input
                  id="freeShippingMinimum"
                  type="number"
                  value={settings.freeShippingMinimum}
                  onChange={(e) => handleSettingChange('freeShippingMinimum', parseInt(e.target.value || '0'))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCost">Custo de Envio Padrão (MZN)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  value={settings.shippingCost}
                  onChange={(e) => handleSettingChange('shippingCost', parseInt(e.target.value || '0'))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Tempo de Entrega</Label>
              <Input
                id="deliveryTime"
                value={settings.deliveryTime}
                onChange={(e) => handleSettingChange('deliveryTime', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
