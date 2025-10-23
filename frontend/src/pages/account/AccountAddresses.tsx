import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { customersApi, type CustomerProfile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const AccountAddresses = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [email, setEmail] = useState('');
  // In this design, AccountAddresses only manages email. Address fields live in checkout.

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await customersApi.me();
        if (!mounted) return;
        setProfile(data);
        setEmail(data?.email || currentUser?.email || '');
        
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
      // Update only the primary email
      const updated = await customersApi.updateMe({ email });
      setProfile(updated);
      toast({ title: 'Email atualizado', description: 'Seu email foi atualizado com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar seu email.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Emails</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> Gerenciar Email</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 max-w-full sm:max-w-md">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                <p className="text-xs text-muted-foreground">Esse email será usado para recibos e notificações do pedido.</p>
              </div>
              <div className="flex">
                <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={saving}>{saving ? 'Salvando…' : 'Salvar Email'}
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
