import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { customersApi, type CustomerProfile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const AccountAddresses = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await customersApi.me();
        if (!mounted) return;
        setProfile(data);
        setName(data?.name || currentUser?.displayName || '');
        setPhone(data?.phone || '');
        setEmail(data?.email || currentUser?.email || '');
        setAddress(data?.address || '');
        setCity(data?.city || '');
        setProvince(data?.province || '');
      } catch (e) {
        // ignore if unauthenticated
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<CustomerProfile> = { name, phone, email, address, city, province };
      const updated = await customersApi.updateMe(payload);
      setProfile(updated);
      toast({ title: 'Endereço salvo', description: 'Seu endereço padrão foi atualizado.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar seu endereço.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Endereços</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Meus Endereços</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 max-w-full sm:max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do destinatário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Província</Label>
                  <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Província" />
                </div>
              </div>
              <div className="flex">
                <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={saving}>{saving ? 'Salvando…' : 'Salvar Endereço'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountAddresses;
