import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layout/AdminLayout';
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
import { formatPrice } from '@/lib/formatPrice';
import { toast } from '@/hooks/use-toast';

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
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    has_next: false,
    has_previous: false
  });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm, pagination.page]);

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

      const response = await fetch(`/api/cart/orders/?${params}`, {
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

  const fetchOrderItems = async (orderId: number) => {
    try {
      setLoadingItems(true);
      const token = await currentUser?.getIdToken();
      
      const response = await fetch(`/api/cart/orders/${orderId}/items/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const items = await response.json();
        setOrderItems(items.items || []);
        setItemsLoaded(true);
      } else {
        console.error(`Error fetching order items: ${response.status} ${response.statusText}`);
        const errorData = await response.text();
        console.error('Error response:', errorData);
        setOrderItems([]);
        
        // Only show toast if it's not a 403 (permission) error
        if (response.status !== 403) {
          toast({
            title: 'Aviso',
            description: 'Não foi possível carregar os itens do pedido.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching order items:', error);
      setOrderItems([]);
      toast({
        title: 'Erro',
        description: 'Erro de conexão ao carregar itens do pedido.',
        variant: 'destructive',
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderItems([]);
    setItemsLoaded(false);
    setIsOrderDialogOpen(true);
    // Auto-load items when dialog opens
    fetchOrderItems(order.id);
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Status do Pedido</label>
                  <Select 
                    value={selectedOrder.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger className="w-[200px]">
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

            {/* Itens e Resumo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Itens do Pedido
                  {!loadingItems && !itemsLoaded && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchOrderItems(selectedOrder.id)}
                    >
                      Carregar Itens
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Lista de Itens */}
                  <div className="border rounded-lg">
                    {loadingItems ? (
                      <div className="p-4 text-center">
                        <Package className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Carregando itens do pedido...</p>
                      </div>
                    ) : orderItems.length > 0 ? (
                      <div className="divide-y">
                        {orderItems.map((item) => (
                          <div key={item.id} className="p-4 flex items-center gap-4">
                            <img 
                              src={item.image || '/placeholder-product.jpg'} 
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-product.jpg';
                              }}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Quantidade: {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatPrice(item.price)}</p>
                              <p className="text-sm text-muted-foreground">
                                Total: {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : itemsLoaded ? (
                      <div className="p-4 text-center">
                        <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Nenhum item encontrado neste pedido</p>
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Aguardando carregamento dos itens...</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => fetchOrderItems(selectedOrder.id)}
                          disabled={loadingItems}
                        >
                          Tentar Novamente
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Resumo */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(parseFloat(selectedOrder.total_amount) - parseFloat(selectedOrder.shipping_cost))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frete:</span>
                      <span>{parseFloat(selectedOrder.shipping_cost) === 0 ? 'Grátis' : formatPrice(parseFloat(selectedOrder.shipping_cost))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total do Pedido:</span>
                      <span>{formatPrice(parseFloat(selectedOrder.total_amount))}</span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie todos os pedidos da loja
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => fetchOrders()}
            disabled={loading}
          >
            <Package className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por pedido, cliente..."
                className="pl-8"
                aria-label="Buscar pedidos"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
            >
              <Filter className="h-4 w-4 mr-2" />
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <div className="hidden md:block">
              <table className="w-full">
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Package className="h-4 w-4 animate-spin" />
                        Carregando pedidos...
                      </div>
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
                          <div className="flex items-center gap-1">
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
                <div className="p-4 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Package className="h-4 w-4 animate-spin" />
                    Carregando pedidos...
                  </div>
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

                        <div className="flex items-center gap-2 mt-3">
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
