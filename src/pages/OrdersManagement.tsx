import { useState } from 'react';
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
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice } from '@/lib/formatPrice';

interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  items: {
    id: number;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  total: number;
  shippingCost: number;
  orderDate: string;
  estimatedDelivery?: string;
  trackingCode?: string;
  notes?: string;
}

const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ORD-2024-001',
      customer: {
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '+258 84 123 4567',
        address: 'Av. Julius Nyerere, 123',
        city: 'Maputo'
      },
      items: [
        {
          id: 1,
          name: 'Laptop ASUS VivoBook 15',
          quantity: 1,
          price: 89000,
          image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&h=100&fit=crop'
        }
      ],
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'M-Pesa',
      total: 89000,
      shippingCost: 0,
      orderDate: '2024-01-15T10:30:00Z',
      notes: 'Cliente solicitou entrega pela manhã'
    },
    {
      id: 'ORD-2024-002',
      customer: {
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '+258 87 654 3210',
        address: 'Rua da Resistência, 456',
        city: 'Maputo'
      },
      items: [
        {
          id: 2,
          name: 'Desktop Gaming Intel i5',
          quantity: 1,
          price: 125000,
          image: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=100&h=100&fit=crop'
        },
        {
          id: 3,
          name: 'Monitor Samsung 24"',
          quantity: 1,
          price: 22000,
          image: 'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=100&h=100&fit=crop'
        }
      ],
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'Cartão de Crédito',
      total: 147000,
      shippingCost: 500,
      orderDate: '2024-01-14T14:20:00Z',
      estimatedDelivery: '2024-01-18',
      trackingCode: 'CHV123456789'
    },
    {
      id: 'ORD-2024-003',
      customer: {
        name: 'Carlos Mendes',
        email: 'carlos.mendes@email.com',
        phone: '+258 82 111 2222',
        address: 'Av. 24 de Julho, 789',
        city: 'Beira'
      },
      items: [
        {
          id: 4,
          name: 'Kit Gaming RGB',
          quantity: 2,
          price: 8500,
          image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=100&h=100&fit=crop'
        }
      ],
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'Transferência Bancária',
      total: 17000,
      shippingCost: 1000,
      orderDate: '2024-01-10T09:15:00Z',
      estimatedDelivery: '2024-01-15',
      trackingCode: 'CHV987654321'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    processing: { label: 'Processando', color: 'bg-purple-100 text-purple-800', icon: Package },
    shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const paymentStatusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
    failed: { label: 'Falhou', color: 'bg-red-100 text-red-800' }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOrderStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const revenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);

    return { total, pending, processing, delivered, revenue };
  };

  const stats = getOrderStats();

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
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

    return (
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalhes do Pedido {selectedOrder.id}
              <Badge className={statusConfig[selectedOrder.status].color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[selectedOrder.status].label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6">
            {/* Order Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={(value) => handleUpdateOrderStatus(selectedOrder.id, value as Order['status'])}
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
                  
                  {selectedOrder.trackingCode && (
                    <div className="text-sm">
                      <span className="font-medium">Código de Rastreamento: </span>
                      <code className="bg-muted px-2 py-1 rounded">{selectedOrder.trackingCode}</code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{selectedOrder.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedOrder.customer.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p>{selectedOrder.customer.address}</p>
                      <p>{selectedOrder.customer.city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Data do Pedido</p>
                    <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                  </div>
                  {selectedOrder.estimatedDelivery && (
                    <div>
                      <p className="text-sm text-muted-foreground">Entrega Estimada</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.estimatedDelivery).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedOrder.paymentMethod}</p>
                      <Badge className={paymentStatusConfig[selectedOrder.paymentStatus].color}>
                        {paymentStatusConfig[selectedOrder.paymentStatus].label}
                      </Badge>
                    </div>
                  </div>
                  {selectedOrder.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="text-sm">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-md object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(item.quantity * item.price)}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Order Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(selectedOrder.total - selectedOrder.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frete:</span>
                      <span>{selectedOrder.shippingCost === 0 ? 'Grátis' : formatPrice(selectedOrder.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(selectedOrder.total)}</span>
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
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
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
                placeholder="Buscar por ID ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
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
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Mais Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Pedido</th>
                  <th className="text-left p-4 font-medium">Cliente</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-left p-4 font-medium">Total</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Pagamento</th>
                  <th className="text-left p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{order.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} item(s)
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{order.customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customer.city}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{formatDate(order.orderDate)}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{formatPrice(order.total)}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={statusConfig[order.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[order.status].label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={paymentStatusConfig[order.paymentStatus].color}>
                          {paymentStatusConfig[order.paymentStatus].label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca.
              </p>
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
