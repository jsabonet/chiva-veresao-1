import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';

const AccountProfile = () => {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      // TODO: atualizar displayName via updateProfile + backend specifics se houver
      setTimeout(() => {
        setSaving(false);
        setMessage('Alterações salvas (mock).');
      }, 600);
    } catch (err) {
      setSaving(false);
      setMessage('Erro ao salvar.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Informações do Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome</Label>
              <Input id="displayName" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={currentUser?.email || ''} disabled />
            </div>
            <Button type="submit" disabled={saving}>Salvar</Button>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountProfile;
