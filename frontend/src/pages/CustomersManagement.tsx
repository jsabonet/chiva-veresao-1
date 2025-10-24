import Loading from '@/components/ui/Loading';
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
  Shield,
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
import { customersApi } from '@/lib/api/customers';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { CustomerProfile, PermissionChangeLog } from '@/lib/api/types';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useExport, generateFilename } from '@/hooks/useExport';
import { toast } from '@/hooks/use-toast';

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
        className={`relative bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-full max-w-[95vw] sm:max-w-2xl ${className}`}
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
  // Hook de status de admin
  const { isAdmin, isProtectedAdmin, canManageAdmins, loading: adminStatusLoading } = useAdminStatus();
  const { exportData, isExporting } = useExport();
  
  // Estados principais
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [permissionHistory, setPermissionHistory] = useState<PermissionChangeLog[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

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

  // Loader (stable) - supports pagination and filters
  const loadCustomers = useCallback(async (pageToLoad = page) => {
    try {
      console.debug('[CustomersManagement] adminStatus at loadCustomers:', { isAdmin, isProtectedAdmin, canManageAdmins, adminStatusLoading });
      setLoading(true);
      setError(null);
      const params: Record<string, string> = { page: String(pageToLoad), page_size: String(pageSize) };
      // Add filters if set
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (provinceFilter && provinceFilter !== 'all') params.province = provinceFilter;
      if (searchTerm) params.search = searchTerm;
  const response = await customersApi.listAdmin(params);
  console.debug('[CustomersManagement] customersApi.listAdmin returned:', response);
      // Handle both paginated responses and direct arrays
      if (Array.isArray(response)) {
        setCustomers(response);
        setTotalCustomers(response.length);
      } else {
        // Paginated response from DRF
        setCustomers(response.results);
        setTotalCustomers(response.count);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, provinceFilter, searchTerm]);

  // Initialize filters from URL query on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const status = params.get('status');
    const prov = params.get('province');
    const p = params.get('page');
    if (q) setSearchTerm(q);
    if (status) setStatusFilter(status);
    if (prov) setProvinceFilter(prov);
    if (p) setPage(Math.max(1, parseInt(p, 10) || 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL query string in sync with filters and pagination
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (provinceFilter && provinceFilter !== 'all') params.set('province', provinceFilter);
    if (page && page !== 1) params.set('page', String(page));
    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [searchTerm, statusFilter, provinceFilter, page]);

  // Estados para ações de admin
  const [isAdminConfirmOpen, setIsAdminConfirmOpen] = useState(false);
  const [adminActionTarget, setAdminActionTarget] = useState<CustomerProfile | null>(null);
  const [adminActionNotes, setAdminActionNotes] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Delete state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Initial load once auth state resolves (so apiClient can attach token), then
  // reload whenever page / filters / search change
  useEffect(() => {
    let unsub: () => void | null = null;
    try {
      unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Force refresh token to ensure we have latest claims
          await user.getIdToken(true);
          console.debug('[Auth] Logged in as:', user.email);
          loadCustomers(page);
        } else {
          console.debug('[Auth] No user logged in');
          setError('Você precisa estar logado como admin para acessar esta página');
        }
        if (unsub) unsub();
      });
    } catch (e) {
      console.error('[Auth] Error:', e);
      setError('Erro ao verificar autenticação');
    }

    return () => {
      if (unsub) unsub();
    };

    return () => {
      if (unsub) unsub();
    };
  }, [loadCustomers, page]);

  // Reload when filters or search change
  useEffect(() => {
    loadCustomers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, provinceFilter, searchTerm]);

  // Auto-refresh when user profile is updated in other views (AccountProfile/Checkout)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chiva:profileUpdated') {
        // Refresh current page to reflect updated customer info
        loadCustomers(page);
      }
    };
    const onFocus = () => loadCustomers(page);
    try {
      window.addEventListener('storage', onStorage);
      window.addEventListener('focus', onFocus);
    } catch {}
    return () => {
      try {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('focus', onFocus);
      } catch {}
    };
  }, [loadCustomers, page]);

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
    total: totalCustomers,
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
    blocked: customers.filter(c => c.status === 'blocked').length,
    totalRevenue: customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0),
    avgOrderValue: customers.length > 0 
      ? customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0) / customers.length 
      : 0
  };

  // Handlers
  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    await exportData({
      endpoint: '/cart/admin/export/customers',
      format,
      filename: generateFilename('clientes'),
      filters: {}
    });
  };

  const handleCreateCustomer = useCallback(async (e) => {
    e.preventDefault();
    if (!newCustomer.email) return;

    try {
      setSaving(true);
      const payload = {
        ...newCustomer,
        status: newCustomer.status as CustomerProfile['status']
      };
      const created = await customersApi.createAdmin(payload);
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

              {/* Pagination controls */}
              <div className="flex items-center justify-between p-4">
                {(() => {
                  const totalPages = Math.max(1, Math.ceil((totalCustomers || 0) / pageSize));
                  const isFirstPage = page <= 1;
                  const isLastPage = page >= totalPages;
                  return (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Página {page} de {totalPages} · Total: {totalCustomers}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (isFirstPage) return;
                            const prevPage = page - 1;
                            setPage(prevPage);
                            await loadCustomers(prevPage);
                          }}
                          disabled={isFirstPage}
                        >
                          Anterior
                        </Button>
                        <Button
                          onClick={async () => {
                            if (isLastPage) return;
                            const nextPage = page + 1;
                            setPage(nextPage);
                            await loadCustomers(nextPage);
                          }}
                          variant="outline"
                          disabled={isLastPage}
                        >
                          Próxima
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
  const handleEditCustomer = useCallback(async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setSaving(true);
      const payload = {
        ...editingCustomer,
        status: editingCustomer.status as CustomerProfile['status']
      };
      const updated = await customersApi.updateAdmin(editingCustomer.id, payload);
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

  const loadPermissionHistory = useCallback(async (customerId: string) => {
    try {
      const history = await customersApi.getPermissionHistory(customerId);
      setPermissionHistory(history);
    } catch (err) {
      console.error('Erro ao carregar histórico de permissões:', err);
      setPermissionHistory([]);
    }
  }, []);

  const openViewModal = useCallback((customer: CustomerProfile) => {
    console.log('Abrindo modal para cliente:', customer);
    setViewingCustomer(customer);
    setIsViewModalOpen(true);
    if (customer.isFirebaseUser) {
      loadPermissionHistory(customer.id);
    }
  }, [loadPermissionHistory]);

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

  // Perform grant/revoke admin action
  const performAdminAction = useCallback(async () => {
    if (!adminActionTarget) return;
    
    // Verificar se é um admin protegido
    if (adminActionTarget.isProtectedAdmin) {
      alert('Este usuário é um administrador protegido e não pode ter suas permissões alteradas.');
      setIsAdminConfirmOpen(false);
      setAdminActionTarget(null);
      setAdminActionNotes('');
      return;
    }

    try {
      setAdminActionLoading(true);
      const id = adminActionTarget.id;
      const updated = adminActionTarget.isAdmin
        ? await customersApi.revokeAdmin(id, adminActionNotes)
        : await customersApi.grantAdmin(id, adminActionNotes);

      // Update lists and viewing/edited states
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (viewingCustomer && viewingCustomer.id === updated.id) {
        setViewingCustomer(updated);
      }
      setIsAdminConfirmOpen(false);
      setAdminActionTarget(null);
      setAdminActionNotes('');
      // Toast success
      toast({
        title: 'Permissões atualizadas',
        description: updated.isAdmin ? 'Usuário promovido a administrador.' : 'Acesso de administrador removido.',
      });
    } catch (err: any) {
      console.error('Erro ao alterar permissões de admin:', err);
      toast({ title: 'Erro', description: err.response?.data?.detail || 'Erro ao alterar permissões do usuário', variant: 'destructive' });
    } finally {
      setAdminActionLoading(false);
    }
  }, [adminActionTarget, adminActionNotes, viewingCustomer]);



  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Clientes</h1>
          <p className="text-muted-foreground">Gerencie todos os clientes da loja</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Exportar Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <div className="flex items-center w-full sm:w-auto gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
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
              {/* Quick admin filter shortcuts */}
              <div className="hidden sm:flex items-center gap-1">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                >
                  Ativos
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                >
                  Inativos
                </Button>
              </div>
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
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
                {/* <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                Mais Filtros
              </Button> */}
            </div>
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
            <Loading label="Carregando clientes..." />
          ) : (
            <div className="rounded-md border">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
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
                        <div className="min-w-0">
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
                                  {canManageAdmins && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        // If the target is protected, do nothing (frontend guard)
                                        if (customer.isProtectedAdmin) {
                                          alert('Este usuário é um administrador protegido e não pode ser alterado.');
                                          return;
                                        }
                                        // Open confirm modal for grant/revoke
                                        setAdminActionTarget(customer);
                                        setAdminActionNotes('');
                                        setIsAdminConfirmOpen(true);
                                      }}
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      {customer.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                                    </DropdownMenuItem>
                                  )}
                            <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteTarget(customer); setIsDeleteConfirmOpen(true); }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden p-2 space-y-3">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={customer.avatar} />
                              <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium truncate">{customer.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                            </div>
                          </div>

                          <p className="text-sm mt-2">{customer.city} · <span className="text-muted-foreground">{customer.province}</span></p>
                          <p className="text-sm mt-1">Pedidos: <span className="font-medium">{customer.totalOrders || 0}</span></p>
                        </div>
                        <div className="ml-4 mt-14 text-right flex-shrink-0 w-28">
                          <p className="font-medium truncate whitespace-nowrap">{formatPrice(Number(customer.totalSpent || 0))}</p>
                          <div className="mt-2">
                            <Badge className={`inline-flex items-center whitespace-nowrap ${statusConfig[customer.status]?.color || statusConfig.active.color}`}>
                              {statusConfig[customer.status]?.label || 'Ativo'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button variant="ghost" size="sm" onClick={() => openViewModal(customer)} className="whitespace-nowrap">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(customer)} className="whitespace-nowrap">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canManageAdmins && (
                          <Button variant="ghost" size="sm" onClick={() => { setAdminActionTarget(customer); setIsAdminConfirmOpen(true); }} className="whitespace-nowrap">
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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

      {/* Admin confirm modal */}
      <Modal isOpen={isAdminConfirmOpen} onClose={() => { setIsAdminConfirmOpen(false); setAdminActionTarget(null); }}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">{adminActionTarget?.isAdmin ? 'Remover Acesso de Admin' : 'Conceder Acesso de Admin'}</h2>
          <p className="text-sm text-muted-foreground mb-4">{adminActionTarget ? `Tem certeza que deseja ${adminActionTarget.isAdmin ? 'remover' : 'conceder'} acesso de administrador para ${adminActionTarget.name || adminActionTarget.email}?` : ''}</p>
          <div className="mb-4">
            <Label>Notas (opcional)</Label>
            <StableInput value={adminActionNotes} onChange={(v) => setAdminActionNotes(v)} placeholder="Motivo ou anotações" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsAdminConfirmOpen(false); setAdminActionTarget(null); }}>Cancelar</Button>
            <Button onClick={performAdminAction} disabled={adminActionLoading}>
              {adminActionLoading ? 'Processando...' : (adminActionTarget?.isAdmin ? 'Remover Admin' : 'Tornar Admin')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { if (!deleteLoading) { setIsDeleteConfirmOpen(false); setDeleteTarget(null); } }}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">Excluir Cliente</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {deleteTarget ? `Tem certeza que deseja excluir ${deleteTarget.name || deleteTarget.email}? Esta ação não pode ser desfeita.` : ''}
          </p>
          {deleteTarget?.isProtectedAdmin && (
            <p className="text-sm text-yellow-700 mb-4">Este usuário é um administrador protegido e não pode ser excluído.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} disabled={deleteLoading}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteLoading || !!deleteTarget?.isProtectedAdmin}
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  setDeleteLoading(true);
                  await customersApi.deleteAdmin(deleteTarget.id);
                  // Remove locally
                  setCustomers(prev => prev.filter(c => c.id !== deleteTarget.id));
                  setTotalCustomers(prev => Math.max(0, (prev || 0) - 1));
                  setIsDeleteConfirmOpen(false);
                  setDeleteTarget(null);
                  toast({ title: 'Cliente excluído', description: 'O cliente foi removido com sucesso.' });
                } catch (err: any) {
                  console.error('Erro ao excluir cliente:', err);
                  toast({ title: 'Erro', description: err?.message || 'Erro ao excluir cliente', variant: 'destructive' });
                } finally {
                  setDeleteLoading(false);
                }
              }}
            >
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
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
                  <TabsTrigger value="permissions">Permissões</TabsTrigger>
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

                <TabsContent value="permissions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Permissões do Usuário</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {viewingCustomer.isFirebaseUser ? (
                          <>
                            <div className="flex items-center justify-between border-b pb-4">
                              <div>
                                <p className="font-medium">Status Firebase</p>
                                <p className="text-sm text-muted-foreground">
                                  Usuário vinculado ao Firebase ID: {viewingCustomer.firebaseUid}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const updated = await customersApi.syncFirebaseUser(viewingCustomer.id);
                                    setViewingCustomer(updated);
                                    
                                    // Atualiza a lista principal também
                                    setCustomers(prev =>
                                      prev.map(c => c.id === updated.id ? updated : c)
                                    );
                                    setCustomers(prev => 
                                      prev.map(c => c.id === updated.id ? updated : c)
                                    );
                                  } catch (err) {
                                    // TODO: Add error handling
                                    console.error('Erro ao sincronizar com Firebase:', err);
                                  }
                                }}
                              >
                                Sincronizar com Firebase
                              </Button>
                            </div>

                            <div className="flex items-center justify-between border-b pb-4">
                              <div>
                                <p className="font-medium">Permissões de Admin</p>
                                <p className="text-sm text-muted-foreground">
                                  {viewingCustomer?.isAdmin 
                                    ? 'Este usuário tem acesso de administrador' 
                                    : 'Este usuário não tem acesso de administrador'}
                                </p>
                                {viewingCustomer?.isProtectedAdmin && (
                                  <p className="text-sm text-yellow-600 mt-1">
                                    <Shield className="h-4 w-4 inline-block mr-1" />
                                    Este é um administrador protegido definido no arquivo .env
                                  </p>
                                )}
                              </div>
                              {viewingCustomer && canManageAdmins && !viewingCustomer.isProtectedAdmin && (
                                <Button
                                variant={viewingCustomer.isAdmin ? "destructive" : "default"}
                                size="sm"
                                title={viewingCustomer.isProtectedAdmin ? "Este usuário é um administrador protegido" : undefined}
                                onClick={async () => {
                                  try {
                                    const updated = viewingCustomer.isAdmin
                                      ? await customersApi.revokeAdmin(viewingCustomer.id)
                                      : await customersApi.grantAdmin(viewingCustomer.id);
                                    
                                    setViewingCustomer(updated);
                                    setCustomers(prev => 
                                      prev.map(c => c.id === updated.id ? updated : c)
                                    );
                                    toast({
                                      title: 'Permissões atualizadas',
                                      description: updated.isAdmin ? 'Usuário promovido a administrador.' : 'Acesso de administrador removido.',
                                    });
                                  } catch (err: any) {
                                    console.error('Erro ao alterar permissões:', err);
                                    toast({ title: 'Erro', description: err.response?.data?.detail || 'Erro ao alterar permissões do usuário', variant: 'destructive' });
                                  }
                                }}
                              >
                                {viewingCustomer.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                              </Button>
                              )}
                            </div>

                            {/* Modal de Confirmação Admin */}
                            <Modal
                              isOpen={!!adminActionTarget}
                              onClose={() => {
                                setAdminActionTarget(null);
                                setAdminActionNotes('');
                              }}
                              className="max-w-md"
                            >
                              <div className="p-6">
                                <h3 className="text-lg font-medium mb-4">
                                  {adminActionTarget?.isAdmin ? 'Remover Acesso Admin' : 'Conceder Acesso Admin'}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                  {adminActionTarget?.isAdmin
                                    ? `Tem certeza que deseja remover os privilégios de administrador de ${adminActionTarget.name || adminActionTarget.email}?`
                                    : `Tem certeza que deseja conceder privilégios de administrador para ${adminActionTarget?.name || adminActionTarget?.email}?`}
                                </p>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Observações (opcional)</Label>
                                    <StableInput
                                      value={adminActionNotes}
                                      onChange={setAdminActionNotes}
                                      placeholder="Motivo da alteração..."
                                    />
                                  </div>

                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setAdminActionTarget(null);
                                        setAdminActionNotes('');
                                      }}
                                      disabled={adminActionLoading}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={async () => {
                                        if (!adminActionTarget) return;
                                        
                                        try {
                                          setAdminActionLoading(true);
                                          const updated = adminActionTarget.isAdmin
                                            ? await customersApi.revokeAdmin(adminActionTarget.id, adminActionNotes)
                                            : await customersApi.grantAdmin(adminActionTarget.id, adminActionNotes);
                                          
                                          // Atualiza a lista de clientes e o cliente em visualização
                                          setCustomers(prev =>
                                            prev.map(c => c.id === updated.id ? updated : c)
                                          );
                                          setViewingCustomer(updated);
                                          
                                          // Recarrega histórico
                                          const history = await customersApi.getPermissionHistory(updated.id);
                                          setPermissionHistory(history);
                                          
                                          // Limpa estado do modal
                                          setAdminActionTarget(null);
                                          setAdminActionNotes('');
                                        } catch (error) {
                                          console.error('Erro ao alterar permissões:', error);
                                        } finally {
                                          setAdminActionLoading(false);
                                        }
                                      }}
                                      disabled={adminActionLoading}
                                    >
                                      {adminActionLoading ? 'Processando...' : 'Confirmar'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Modal>

                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-medium">Histórico de Alterações</h4>
                              </div>
                              <div className="space-y-3">
                                {permissionHistory.length > 0 ? (
                                  permissionHistory.map((change) => (
                                    <div key={change.id} className="flex justify-between text-sm">
                                      <div>
                                        <span className="font-medium">
                                          {change.changeType === 'grant_admin' ? 'Acesso Admin Concedido' :
                                           change.changeType === 'revoke_admin' ? 'Acesso Admin Removido' :
                                           change.changeType === 'grant_super_admin' ? 'Acesso Super Admin Concedido' :
                                           'Acesso Super Admin Removido'}
                                        </span>
                                        {change.notes && (
                                          <p className="text-muted-foreground mt-1">{change.notes}</p>
                                        )}
                                      </div>
                                      <div className="text-muted-foreground">
                                        <p>{formatDate(change.timestamp)}</p>
                                        <p className="text-right">por {change.changedBy}</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    Nenhuma alteração de permissão registrada.
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>Este usuário não está vinculado ao Firebase.</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
