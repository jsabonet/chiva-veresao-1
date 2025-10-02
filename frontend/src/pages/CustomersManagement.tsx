import React, { useEffect, useState, useRef, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Search,
  Filter,
  Eye,
  Download,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/formatPrice';
import { customersApi, type CustomerProfile } from '@/lib/api';

// Modal base ultra-estável
const Modal = ({ isOpen, onClose, children, className = '' }) => {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`relative bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-full max-w-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
};

// Input ultra-estável que não causa re-renders
const StableInput = ({ value, onChange, type = 'text', placeholder = '', className = '' }) => {
  const inputRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value || '');

  // Sincroniza valor interno com prop externa apenas quando necessário
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '');
    }
  }, [value]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleFocus = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleBlur = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <input
      ref={inputRef}
      type={type}
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
};

const CustomersManagement = () => {
  // Estados principais
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');

  // Estados de modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Estados de dados dos modals
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    status: 'active',
    notes: ''
  });

  const statusConfig = {
    active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
    inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-800' },
    blocked: { label: 'Bloqueado', color: 'bg-red-100 text-red-800' },
  };

  const provinces = [
    'Maputo', 'Maputo Cidade', 'Gaza', 'Inhambane', 'Sofala',
    'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'
  ];

  // Carregamento inicial
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await customersApi.listAdmin();
        const customersList = Array.isArray(response) ? response : (response?.results || []);
        setCustomers(customersList);
      } catch (err) {
        setError(err?.message || 'Erro ao carregar clientes');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  // Filtros
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesProvince = provinceFilter === 'all' || customer.province === provinceFilter;
    
    return matchesSearch && matchesStatus && matchesProvince;
  });

  // Estatísticas
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
    blocked: customers.filter(c => c.status === 'blocked').length,
    totalRevenue: customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0),
    avgOrderValue: customers.length > 0 
      ? customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0) / customers.length 
      : 0
  };

  // Handlers
  const handleCreateCustomer = useCallback(async (e) => {
    e.preventDefault();
    if (!newCustomer.email) return;

    try {
      setSaving(true);
      const created = await customersApi.createAdmin(newCustomer);
      setCustomers(prev => [created, ...prev]);
      setNewCustomer({
        name: '', email: '', phone: '', address: '', 
        city: '', province: '', status: 'active', notes: ''
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
    } finally {
      setSaving(false);
    }
  }, [newCustomer]);

  const handleEditCustomer = useCallback(async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setSaving(true);
      const updated = await customersApi.updateAdmin(editingCustomer.id, editingCustomer);
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingCustomer(null);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Erro ao editar cliente:', err);
    } finally {
      setSaving(false);
    }
  }, [editingCustomer]);

  const openCreateModal = useCallback(() => {
    setNewCustomer({
      name: '', email: '', phone: '', address: '', 
      city: '', province: '', status: 'active', notes: ''
    });
    setIsCreateModalOpen(true);
  }, []);

  const openEditModal = useCallback((customer) => {
    setEditingCustomer({ ...customer });
    setIsEditModalOpen(true);
  }, []);

  const openViewModal = useCallback((customer) => {
    setViewingCustomer(customer);
    setIsViewModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setNewCustomer({
      name: '', email: '', phone: '', address: '', 
      city: '', province: '', status: 'active', notes: ''
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingCustomer(null);
  }, []);

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setViewingCustomer(null);
  }, []);

  const updateNewCustomerField = useCallback((field, value) => {
    setNewCustomer(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateEditingCustomerField = useCallback((field, value) => {
    setEditingCustomer(prev => ({ ...prev, [field]: value }));
  }, []);

  const getInitials = (name) => {
    return name?.split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase() || '??';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };



  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Clientes</h1>
          <p className="text-muted-foreground">Gerencie todos os clientes da loja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              <p className="text-sm text-muted-foreground">Inativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
              <p className="text-sm text-muted-foreground">Bloqueados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-bold">{formatPrice(stats.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Receita Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-bold">{formatPrice(stats.avgOrderValue)}</p>
              <p className="text-sm text-muted-foreground">Valor Médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Província" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {provinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Mais Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md">
              Erro: {error}
            </div>
          )}
          
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Carregando clientes...
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Cliente</th>
                    <th className="text-left p-4 font-medium">Contato</th>
                    <th className="text-left p-4 font-medium">Localização</th>
                    <th className="text-left p-4 font-medium">Pedidos</th>
                    <th className="text-left p-4 font-medium">Total Gasto</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={customer.avatar} />
                            <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm">{customer.email}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm">{customer.city}</p>
                          <p className="text-sm text-muted-foreground">{customer.province}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{customer.totalOrders || 0}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{formatPrice(Number(customer.totalSpent || 0))}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={statusConfig[customer.status]?.color || statusConfig.active.color}>
                          {statusConfig[customer.status]?.label || 'Ativo'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openViewModal(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(customer)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredCustomers.length === 0 && !error && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar os filtros de busca.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 pr-8">Novo Cliente</h2>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <StableInput
                  value={newCustomer.name}
                  onChange={(value) => updateNewCustomerField('name', value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <StableInput
                  type="email"
                  value={newCustomer.email}
                  onChange={(value) => updateNewCustomerField('email', value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <StableInput
                  value={newCustomer.phone}
                  onChange={(value) => updateNewCustomerField('phone', value)}
                  placeholder="+258 84 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newCustomer.status}
                  onValueChange={(value) => updateNewCustomerField('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <StableInput
                value={newCustomer.address}
                onChange={(value) => updateNewCustomerField('address', value)}
                placeholder="Endereço completo"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <StableInput
                  value={newCustomer.city}
                  onChange={(value) => updateNewCustomerField('city', value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Província</Label>
                <Select
                  value={newCustomer.province}
                  onValueChange={(value) => updateNewCustomerField('province', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma província" />
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
              <Label>Observações</Label>
              <StableInput
                value={newCustomer.notes}
                onChange={(value) => updateNewCustomerField('notes', value)}
                placeholder="Observações sobre o cliente..."
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={closeCreateModal} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !newCustomer.email}>
                {saving ? 'Criando...' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal de Edição */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 pr-8">Editar Cliente</h2>
          {editingCustomer && (
            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <StableInput
                    value={editingCustomer.name}
                    onChange={(value) => updateEditingCustomerField('name', value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <StableInput
                    type="email"
                    value={editingCustomer.email}
                    onChange={(value) => updateEditingCustomerField('email', value)}
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <StableInput
                    value={editingCustomer.phone}
                    onChange={(value) => updateEditingCustomerField('phone', value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingCustomer.status}
                    onValueChange={(value) => updateEditingCustomerField('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <StableInput
                  value={editingCustomer.address}
                  onChange={(value) => updateEditingCustomerField('address', value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <StableInput
                    value={editingCustomer.city}
                    onChange={(value) => updateEditingCustomerField('city', value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Província</Label>
                  <Select
                    value={editingCustomer.province}
                    onValueChange={(value) => updateEditingCustomerField('province', value)}
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
                <Label>Observações</Label>
                <StableInput
                  value={editingCustomer.notes}
                  onChange={(value) => updateEditingCustomerField('notes', value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={closeEditModal} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal de Visualização */}
      <Modal isOpen={isViewModalOpen} onClose={closeViewModal} className="max-w-4xl">
        <div className="p-6">
          {viewingCustomer && (
            <>
              <div className="flex items-center gap-3 mb-6 pr-8">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={viewingCustomer.avatar} />
                  <AvatarFallback>{getInitials(viewingCustomer.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">{viewingCustomer.name}</h2>
                  <Badge className={statusConfig[viewingCustomer.status]?.color || statusConfig.active.color}>
                    {statusConfig[viewingCustomer.status]?.label || 'Ativo'}
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="orders">Pedidos</TabsTrigger>
                  <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contato</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{viewingCustomer.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{viewingCustomer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p>{viewingCustomer.address || 'N/A'}</p>
                            <p>{viewingCustomer.city}, {viewingCustomer.province}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Informações da Conta</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Registro</p>
                            <p>{formatDate(viewingCustomer.registrationDate)}</p>
                          </div>
                        </div>
                        {viewingCustomer.lastOrderDate && (
                          <div className="flex items-center gap-3">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Último Pedido</p>
                              <p>{formatDate(viewingCustomer.lastOrderDate)}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Gasto</p>
                            <p className="font-semibold">
                              {formatPrice(Number(viewingCustomer.totalSpent || 0))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {viewingCustomer.notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Observações</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{viewingCustomer.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="orders">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Histórico de pedidos será implementado em integração com o sistema de pedidos.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="stats">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{viewingCustomer.totalOrders || 0}</p>
                          <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {formatPrice(Number(viewingCustomer.totalSpent || 0))}
                          </p>
                          <p className="text-sm text-muted-foreground">Total Gasto</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {viewingCustomer.totalOrders > 0
                              ? formatPrice(
                                  Number(viewingCustomer.totalSpent || 0) /
                                  Number(viewingCustomer.totalOrders || 1)
                                )
                              : formatPrice(0)}
                          </p>
                          <p className="text-sm text-muted-foreground">Valor Médio por Pedido</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default CustomersManagement;
