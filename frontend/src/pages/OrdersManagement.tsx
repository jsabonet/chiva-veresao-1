import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import AdminLayout from '@/components/layout/AdminLayout';
import Loading from '@/components/ui/Loading';
import { 
  Search, 
  Filter, 
  Eye, 
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Calendar,
  User,
  MapPin,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPrice } from '@/lib/formatPrice';
import { toast } from '@/hooks/use-toast';
import { useExport, generateFilename, formatDateFilter } from '@/hooks/useExport';

interface Order {
  id: number;
  order_number: string;
  user: number;
  customer_info: {
    name: string;
    email: string;
    phone?: string;
  };
  total_amount: string;
  shipping_cost: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'paid' | 'failed';
  shipping_method: string;
  shipping_address: any;
  billing_address: any;
  tracking_number?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  notes?: string;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
  is_delivered: boolean;
  is_shipped: boolean;
  can_be_cancelled: boolean;
  shipping_address_display?: string;
  items?: OrderItem[]; // Included from API
}

interface OrderItem {
  id: number;
  product: number | null;
  product_name: string;
  sku: string;
  product_image: string | null;
  color: number | null;
  color_name: string;
  color_hex: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  weight: string | null;
  dimensions: string;
  created_at: string;
}

interface ApiResponse {
  orders: Order[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

const OrdersManagement = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    has_next: false,
    has_previous: false
  });
  const { isAdmin } = useAdminStatus();
  const { exportData, isExporting } = useExport();

  // Today quick metrics
  const [filterToday, setFilterToday] = useState(false);
  const [todayOrdersCount, setTodayOrdersCount] = useState<number | null>(null);
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm, pagination.page, filterToday, isAdmin]);

  // Fetch today's aggregated metrics on mount and when admin/user changes
  useEffect(() => {
    fetchTodayMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, currentUser]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await currentUser?.getIdToken();
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.page_size.toString(),
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      // If the quick 'today' filter is enabled, use date_from/date_to
      if (filterToday) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const isoDate = `${y}-${m}-${d}`;
        params.append('date_from', isoDate);
        params.append('date_to', isoDate);
      }

      // Choose admin vs user endpoint
      const basePath = isAdmin ? '/api/cart/admin/orders/' : '/api/cart/orders/';

      const response = await fetch(`${basePath}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar pedidos');
      }

      const data: ApiResponse = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch aggregated metrics for today (orders count and revenue).
  // This uses the admin endpoint when available; it fetches up to a large page
  // size to try to retrieve all today's orders and sum revenue locally.
  const fetchTodayMetrics = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const isoDate = `${y}-${m}-${d}`;

      const params = new URLSearchParams({
        page: '1',
        page_size: '1000',
        date_from: isoDate,
        date_to: isoDate,
      });

      const basePath = isAdmin ? '/api/cart/admin/orders/' : '/api/cart/orders/';

      const resp = await fetch(`${basePath}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!resp.ok) {
        throw new Error('Erro ao carregar métricas de hoje');
      }

      const data: ApiResponse = await resp.json();
      const list = data.orders || [];
      const revenue = list.reduce((sum, o) => {
        const total = parseFloat(o.total_amount || '0') || 0;
        const shipping = parseFloat(o.shipping_cost || '0') || 0;
        return sum + total + shipping;
      }, 0);

      setTodayOrdersCount(list.length);
      setTodayRevenue(revenue);
    } catch (err) {
      console.error('Error fetching today metrics:', err);
      setTodayOrdersCount(null);
      setTodayRevenue(null);
    }
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    processing: { label: 'Processando', color: 'bg-purple-100 text-purple-800', icon: Package },
    shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
    paid: { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { label: 'Falhou', color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  // Orders are already filtered by the API, no need for client-side filtering
  const filteredOrders = orders;

  const getOrderStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const revenue = orders
      .filter(o => o.status === 'paid' || o.status === 'delivered')
      .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    return { total, pending, processing, delivered, revenue };
  };

  const stats = getOrderStats();

  // Items are now included in Order response - no need for separate fetch

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
    // Items are now included in the order response
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      const token = await currentUser?.getIdToken();
      
      const response = await fetch(`/api/cart/orders/${orderId}/status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar status do pedido');
      }

      const updatedOrder = await response.json();
      
      // Update the order in the orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );

      // Update the selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null);
      }

      toast({
        title: 'Status atualizado',
        description: `Status do pedido alterado para ${statusConfig[newStatus]?.label || newStatus}.`,
      });
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status do pedido.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTracking = async (orderId: number, trackingNum: string) => {
    try {
      const token = await currentUser?.getIdToken();
      
      const response = await fetch(`/api/cart/orders/${orderId}/tracking/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tracking_number: trackingNum }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar rastreamento');
      }

      // Update the order in the orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, tracking_number: trackingNum, updated_at: new Date().toISOString() }
            : order
        )
      );

      // Update the selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, tracking_number: trackingNum, updated_at: new Date().toISOString() } : null);
      }

      toast({
        title: 'Rastreamento atualizado',
        description: 'Código de rastreamento foi atualizado com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating tracking:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o rastreamento.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateNotes = async (orderId: number, notes: string) => {
    try {
      const token = await currentUser?.getIdToken();
      
      const response = await fetch(`/api/cart/orders/${orderId}/notes/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notes: notes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar observações');
      }

      // Update the order in the orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, notes: notes, updated_at: new Date().toISOString() }
            : order
        )
      );

      // Update the selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, notes: notes, updated_at: new Date().toISOString() } : null);
      }

      toast({
        title: 'Observações atualizadas',
        description: 'Observações do pedido foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar as observações.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    // Aplicar os mesmos filtros da lista atual
    const filters: Record<string, any> = {};
    
    if (statusFilter && statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    
    if (searchTerm) {
      filters.search = searchTerm;
    }
    
    await exportData({
      endpoint: '/cart/admin/export/orders',
      format,
      filename: generateFilename('pedidos'),
      filters
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderDetailsDialog = () => {
    if (!selectedOrder) return null;

    const StatusIcon = statusConfig[selectedOrder.status].icon;

    const [localTracking, setLocalTracking] = useState(selectedOrder.tracking_number || '');
    const [localNotes, setLocalNotes] = useState(selectedOrder.notes || '');

    // Reset local state when selected order changes
    useEffect(() => {
      setLocalTracking(selectedOrder.tracking_number || '');
      setLocalNotes(selectedOrder.notes || '');
    }, [selectedOrder]);

    const handleTrackingUpdate = async () => {
      if (localTracking.trim() === (selectedOrder.tracking_number || '').trim()) return;
      await handleUpdateTracking(selectedOrder.id, localTracking);
    };

    const handleNotesUpdate = async () => {
      if (localNotes.trim() === (selectedOrder.notes || '').trim()) return;
      await handleUpdateNotes(selectedOrder.id, localNotes);
    };

    const handleStatusChange = (newStatus: string) => {
      handleUpdateOrderStatus(selectedOrder.id, newStatus as Order['status']);
    };

    return (
      <Dialog 
        open={isOrderDialogOpen} 
        onOpenChange={setIsOrderDialogOpen}
      >
        {/*
          Make dialog full-screen on small devices while keeping centered max-width on desktop.
          Use utility classes: w-screen h-screen p-4 for mobile; revert to max-w-4xl on md+
        */}
  <DialogContent className="w-screen h-screen p-4 overflow-y-auto md:w-auto md:h-auto md:p-0 max-w-4xl md:max-h-[80vh] md:overflow-y-auto rounded-none md:rounded-lg">
          {/* Close button on mobile */}
          <div className="md:hidden flex justify-end mb-2">
            <Button variant="ghost" size="icon" onClick={() => setIsOrderDialogOpen(false)} aria-label="Fechar detalhes">
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalhes do Pedido {selectedOrder.order_number}
              <Badge className={statusConfig[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Gerencie e acompanhe os detalhes deste pedido
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            {/* Gestão do Pedido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gestão do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status do Pedido */}
                <div className="min-w-0">
                  <label className="text-sm font-medium mb-2 block">Status do Pedido</label>
                  <Select 
                    value={selectedOrder.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
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

                {/* Rastreamento */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Código de Rastreamento</label>
                  <div className="flex gap-2">
                    <Input
                      value={localTracking}
                      onChange={(e) => setLocalTracking(e.target.value)}
                      placeholder="Digite o código de rastreamento"
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleTrackingUpdate}
                      disabled={localTracking.trim() === (selectedOrder.tracking_number || '').trim()}
                    >
                      Atualizar
                    </Button>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Observações Internas</label>
                  <div className="space-y-2">
                    <Textarea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="Adicione notas internas sobre este pedido..."
                      rows={3}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleNotesUpdate}
                      disabled={localNotes.trim() === (selectedOrder.notes || '').trim()}
                    >
                      Salvar Notas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Cliente e Pedido */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dados do Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{selectedOrder.customer_info.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer_info.email}</p>
                  </div>
                  {selectedOrder.customer_info.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedOrder.customer_info.phone}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p>{selectedOrder.shipping_address_display || 'Endereço não informado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Detalhes do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Data do Pedido</p>
                    <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  {selectedOrder.estimated_delivery && (
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.estimated_delivery).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  )}
                  {selectedOrder.delivered_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Entregue em</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.delivered_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Método de Envio</p>
                    <p className="font-medium">{selectedOrder.shipping_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última Atualização</p>
                    <p className="font-medium">{formatDate(selectedOrder.updated_at)}</p>
                  </div>
                  {selectedOrder.tracking_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Código de Rastreamento</p>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{selectedOrder.tracking_number}</code>
                    </div>
                  )}
                  {selectedOrder.customer_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observações do Cliente</p>
                      <p className="text-sm bg-blue-50 p-2 rounded border">{selectedOrder.customer_notes}</p>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observações Internas</p>
                      <p className="text-sm bg-gray-50 p-2 rounded border">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Itens e Resumo - MELHORADO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens do Pedido ({selectedOrder.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Lista de Itens com Design Profissional */}
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div 
                          key={item.id} 
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50"
                        >
                          <div className="flex flex-col sm:flex-row gap-4">
                            {/* Imagem do Produto */}
                            <div className="flex-shrink-0">
                              <img 
                                src={item.product_image || '/placeholder-product.jpg'} 
                                alt={item.product_name}
                                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-product.jpg';
                                }}
                              />
                            </div>

                            {/* Informações do Produto */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <h4 className="font-bold text-base text-gray-900">{item.product_name}</h4>
                                  {item.sku && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium">SKU:</span>{' '}
                                      <code className="bg-blue-50 px-2 py-0.5 rounded text-xs font-mono text-blue-700">
                                        {item.sku}
                                      </code>
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary">{formatPrice(parseFloat(item.subtotal))}</p>
                                  <p className="text-xs text-gray-500">Total</p>
                                </div>
                              </div>

                              {/* Detalhes em Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Quantidade</p>
                                  <p className="font-semibold text-sm">
                                    <Badge variant="secondary">{item.quantity}x</Badge>
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Preço Unit.</p>
                                  <p className="font-semibold text-sm">{formatPrice(parseFloat(item.unit_price))}</p>
                                </div>
                                {item.color_name && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Cor</p>
                                    <div className="flex items-center gap-1.5">
                                      {item.color_hex && (
                                        <div 
                                          className="w-4 h-4 rounded-full border-2 border-gray-300"
                                          style={{ backgroundColor: item.color_hex }}
                                        />
                                      )}
                                      <p className="font-semibold text-sm">{item.color_name}</p>
                                    </div>
                                  </div>
                                )}
                                {item.weight && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Peso</p>
                                    <p className="font-semibold text-sm">{parseFloat(item.weight).toFixed(2)} kg</p>
                                  </div>
                                )}
                              </div>

                              {/* Dimensões se disponível */}
                              {item.dimensions && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-gray-500">
                                    <span className="font-medium">Dimensões:</span> {item.dimensions}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border rounded-lg bg-gray-50">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600 font-medium mb-1">Nenhum item encontrado</p>
                      <p className="text-sm text-gray-500">Este pedido não possui itens registrados</p>
                    </div>
                  )}
                  
                  {/* Resumo Financeiro */}
                  <div className="border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3 mt-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Resumo Financeiro</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="font-semibold">{formatPrice(parseFloat(selectedOrder.total_amount) - parseFloat(selectedOrder.shipping_cost))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Frete:</span>
                        <span className={`font-semibold ${parseFloat(selectedOrder.shipping_cost) === 0 ? 'text-green-600' : ''}`}>
                          {parseFloat(selectedOrder.shipping_cost) === 0 ? 'Grátis' : formatPrice(parseFloat(selectedOrder.shipping_cost))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                        <span className="font-bold text-base">Total do Pedido:</span>
                        <span className="font-bold text-2xl text-primary">{formatPrice(parseFloat(selectedOrder.total_amount))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie todos os pedidos da loja
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={() => fetchOrders()}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <Package className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Relatório'}
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
        </div>
      </div>

    {/* Stats Cards */}
  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Pedidos
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Processando
                </p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Entregues
                </p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Receita Total
                </p>
                <p className="text-lg font-bold">{formatPrice(stats.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pedidos Hoje</p>
                <p className="text-2xl font-bold">{todayOrdersCount === null ? '—' : todayOrdersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Receita Hoje</p>
                <p className="text-lg font-bold">{todayRevenue === null ? '—' : formatPrice(todayRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por pedido, cliente..."
                className="pl-8 w-full"
                aria-label="Buscar pedidos"
              />
            </div>
            <div className="flex items-center w-full sm:w-auto gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline"
                onClick={() => fetchOrders()}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                {loading ? 'Carregando...' : 'Atualizar'}
              </Button>
              <Button
                variant={filterToday ? 'default' : 'outline'}
                onClick={() => {
                  setFilterToday(v => !v);
                  // refresh both orders and today's metrics
                  fetchTodayMetrics();
                  fetchOrders();
                }}
                className="w-full sm:w-auto"
                title="Filtrar pedidos de hoje"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Hoje
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
            <div className="rounded-md border">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Pedido</th>
                  <th className="text-left p-4 font-medium">Cliente</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-left p-4 font-medium">Total</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8">
                      <Loading label="Carregando pedidos..." />
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status]?.icon || Package;
                    return (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                ID: {order.id}
                              </p>
                            </div>
                            {/* Recent update indicator */}
                            {new Date(order.updated_at).getTime() > Date.now() - 5 * 60 * 1000 && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Atualizado recentemente" />
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{order.customer_info.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customer_info.email}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">{formatDate(order.created_at)}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{formatPrice(parseFloat(order.total_amount))}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Quick status actions */}
                            {order.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                title="Confirmar pedido"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {order.status === 'confirmed' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                                title="Marcar como processando"
                                className="text-purple-600 hover:text-purple-800"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {order.status === 'processing' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                                title="Marcar como enviado"
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {order.status === 'shipped' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                title="Marcar como entregue"
                                className="text-green-600 hover:text-green-800"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {order.can_be_cancelled && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                title="Cancelar pedido"
                                className="text-red-600 hover:text-red-800"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>

            {/* Mobile - card list */}
            <div className="md:hidden p-2 space-y-3">
              {loading ? (
                <div className="p-4">
                  <Loading label="Carregando pedidos..." />
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const StatusIcon = statusConfig[order.status]?.icon || Package;
                  return (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-sm text-muted-foreground">ID: {order.id}</p>
                              </div>
                              {new Date(order.updated_at).getTime() > Date.now() - 5 * 60 * 1000 && (
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Atualizado recentemente" />
                              )}
                            </div>

                            <p className="text-sm mt-2">{order.customer_info.name} · <span className="text-muted-foreground">{order.customer_info.email}</span></p>
                            <p className="text-sm mt-1">{formatDate(order.created_at)}</p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="font-medium">{formatPrice(parseFloat(order.total_amount))}</p>
                            <Badge className={`${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'} mt-2 inline-flex items-center`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[order.status]?.label || order.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)} title="Ver detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>

                          {order.status === 'pending' && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')} className="text-blue-600 hover:text-blue-800">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}

                          {order.status === 'confirmed' && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'processing')} className="text-purple-600 hover:text-purple-800">
                              <Package className="h-4 w-4" />
                            </Button>
                          )}

                          {order.status === 'processing' && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} className="text-indigo-600 hover:text-indigo-800">
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}

                          {order.status === 'shipped' && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} className="text-green-600 hover:text-green-800">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}

                          {order.can_be_cancelled && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')} className="text-red-600 hover:text-red-800">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
          
          {!loading && filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.page_size) + 1} a{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} de{' '}
                {pagination.total} pedidos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.has_previous || loading}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {pagination.page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.has_next || loading}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <OrderDetailsDialog />
    </AdminLayout>
  );
};

export default OrdersManagement;
