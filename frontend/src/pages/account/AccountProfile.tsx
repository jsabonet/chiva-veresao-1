import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin, Save, Home } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface DefaultAddress {
  id: number;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  defaultAddress: DefaultAddress | null;
}

const AccountProfile = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    defaultAddress: null
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/customers/me/profile/') as any;
      setProfile({
        name: response.data?.name || '',
        email: response.data?.email || currentUser?.email || '',
        phone: response.data?.phone || '',
        defaultAddress: response.data?.defaultAddress || null
      });
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seu perfil',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      await apiClient.put('/customers/me/profile/', {
        displayName: profile.name,
        phone: profile.phone
      });
      
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso!'
      });
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
          <p className="text-gray-600">Carregando...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+258 84 123 4567"
              />
            </div>

            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Endereço Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço Padrão
            </span>
            <Link to="/account/addresses">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Gerenciar Endereços
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.defaultAddress ? (
            <div className="space-y-2">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{profile.defaultAddress.name}</p>
                    {profile.defaultAddress.label && (
                      <p className="text-sm text-gray-600">{profile.defaultAddress.label}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">{profile.defaultAddress.address}</p>
                    <p className="text-sm text-gray-600">
                      {profile.defaultAddress.city}, {profile.defaultAddress.province}
                    </p>
                    {profile.defaultAddress.postal_code && (
                      <p className="text-sm text-gray-600">CEP: {profile.defaultAddress.postal_code}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      Tel: {profile.defaultAddress.phone}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Este endereço será usado automaticamente no checkout
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Nenhum endereço cadastrado</p>
              <Link to="/account/addresses">
                <Button variant="outline">
                  Adicionar Endereço
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountProfile;
