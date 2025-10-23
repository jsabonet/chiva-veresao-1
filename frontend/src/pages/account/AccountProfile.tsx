import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';
import { customersApi, type CustomerProfile } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const AccountProfile = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await customersApi.me();
        if (!mounted) return;
        setProfile(data);
        // derive display name fallback
        const derivedName = data?.name || currentUser?.displayName || '';
        setDisplayName(derivedName);
        setPhone(data?.phone || '');
        setAddress(data?.address || '');
        setCity(data?.city || '');
        setProvince(data?.province || '');
      } catch (e) {
        // ignore if not logged in or endpoint unavailable
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      // Atualizar perfil no backend (nome/email/phone/address/city/province)
      const payload: Partial<CustomerProfile> = {
        name: displayName,
        email: profile?.email || currentUser?.email || '',
        phone,
        address,
        city,
        province,
      };
      const updated = await customersApi.updateMe(payload);
      setProfile(updated);
      setMessage('Alterações salvas.');
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
    } catch (err) {
      setMessage('Erro ao salvar.');
      toast({ title: 'Erro', description: 'Não foi possível salvar seu perfil.', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Informações do Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
          <form onSubmit={handleSave} className="space-y-4 max-w-full sm:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome</Label>
              <Input id="displayName" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Seu nome" />
            </div>
            {/* Email is managed in AccountAddresses. Omit here to avoid duplication. */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Seu telefone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Rua, número" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Província</Label>
                <Input id="province" value={province} onChange={(e)=>setProvince(e.target.value)} placeholder="Província" />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">Salvar</Button>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountProfile;
