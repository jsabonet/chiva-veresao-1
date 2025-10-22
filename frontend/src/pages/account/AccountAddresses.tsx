import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, Plus, Edit, Trash2, Check, Home, Briefcase, Building2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Address {
  id?: number;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

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

const labelOptions = [
  { value: 'Casa', icon: Home, label: 'Casa' },
  { value: 'Trabalho', icon: Briefcase, label: 'Trabalho' },
  { value: 'Outro', icon: Building2, label: 'Outro' },
];

const AccountAddresses = () => {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState<Address>({
    label: 'Casa',
    name: '',
    phone: '',
    address: '',
    city: '',
    province: 'Maputo',
    postal_code: '',
    is_default: false
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/customers/me/addresses/');
      setAddresses(response.data);
    } catch (error) {
      console.error('Erro ao carregar endereços:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus endereços',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData(address);
    } else {
      setEditingAddress(null);
      setFormData({
        label: 'Casa',
        name: '',
        phone: '',
        address: '',
        city: '',
        province: 'Maputo',
        postal_code: '',
        is_default: addresses.length === 0 // Primeiro endereço é padrão
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveAddress = async () => {
    // Validação básica
    if (!formData.name || !formData.phone || !formData.address || !formData.city) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      
      if (editingAddress) {
        // Atualizar endereço existente
        await apiClient.put(`/customers/me/addresses/${editingAddress.id}/`, formData);
        toast({
          title: 'Sucesso',
          description: 'Endereço atualizado com sucesso!'
        });
      } else {
        // Criar novo endereço
        await apiClient.post('/customers/me/addresses/', formData);
        toast({
          title: 'Sucesso',
          description: 'Endereço adicionado com sucesso!'
        });
      }

      setIsDialogOpen(false);
      loadAddresses();
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o endereço',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await apiClient.post(`/customers/me/addresses/${addressId}/set-default/`);
      toast({
        title: 'Sucesso',
        description: 'Endereço padrão atualizado!'
      });
      loadAddresses();
    } catch (error) {
      console.error('Erro ao definir endereço padrão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível definir o endereço padrão',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;

    try {
      await apiClient.delete(`/customers/me/addresses/${addressToDelete}/`);
      toast({
        title: 'Sucesso',
        description: 'Endereço removido com sucesso!'
      });
      setIsDeleteDialogOpen(false);
      setAddressToDelete(null);
      loadAddresses();
    } catch (error) {
      console.error('Erro ao deletar endereço:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o endereço',
        variant: 'destructive'
      });
    }
  };

  const getLabelIcon = (label: string) => {
    const option = labelOptions.find(opt => opt.value === label);
    return option ? option.icon : Building2;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Endereços</h1>
          <p className="text-gray-600">Carregando...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Endereços</h1>
          <p className="text-gray-600">Gerencie seus endereços de entrega</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Endereço
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">Nenhum endereço cadastrado</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Endereço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => {
            const LabelIcon = getLabelIcon(address.label);
            return (
              <Card key={address.id} className={address.is_default ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base">
                      <LabelIcon className="h-4 w-4" />
                      {address.label}
                    </span>
                    {address.is_default && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Padrão
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">{address.name}</p>
                    <p className="text-gray-600">{address.address}</p>
                    <p className="text-gray-600">
                      {address.city}, {address.province}
                    </p>
                    {address.postal_code && (
                      <p className="text-gray-600">CEP: {address.postal_code}</p>
                    )}
                    <p className="text-gray-600">Tel: {address.phone}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {!address.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id!)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Tornar Padrão
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(address)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddressToDelete(address.id!);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Adicionar/Editar Endereço */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Endereço' : 'Adicionar Endereço'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para {editingAddress ? 'atualizar' : 'adicionar'} um endereço
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Tipo de Endereço</Label>
              <Select
                value={formData.label}
                onValueChange={(value) => setFormData({ ...formData, label: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {labelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Destinatário *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+258 84 123 4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Província *</Label>
                <Select
                  value={formData.province}
                  onValueChange={(value) => setFormData({ ...formData, province: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal (opcional)</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="1100"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Definir como endereço padrão
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveAddress} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingAddress ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAddressToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddress}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountAddresses;
