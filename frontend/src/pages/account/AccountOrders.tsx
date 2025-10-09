import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Package, 
  Eye, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Home,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  AlertCircle
} from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  shipping_cost: string;
  shipping_method: string;
  shipping_address: any;
  customer_notes: string;
  estimated_delivery?: string;
  tracking_number?: string;
  created_at: string;
  items?: OrderItem[];
  status_history?: StatusHistory[];
}

interface OrderItem {
  id: number;
  name: string;
  sku: string;
  price: string;
  quantity: number;
  color?: string;
  image?: string;
  total: string;
}

interface StatusHistory {
  id: number;
  old_status?: string;
  new_status: string;
  notes: string;
  created_at: string;
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processando', color: 'bg-purple-100 text-purple-800', icon: Package },
  shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
  paid: { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const shippingMethodNames = {
  standard: 'Entrega Padrão',
  express: 'Entrega Expressa',
  pickup: 'Retirada na Loja',
  same_day: 'Entrega no Mesmo Dia',
};

const AccountOrders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await currentUser?.getIdToken();
      
      const response = await fetch('/api/cart/orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar pedidos');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus pedidos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const token = await currentUser?.getIdToken();
      
      const response = await fetch(`/api/cart/orders/${orderId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do pedido');
      }

      const orderData = await response.json();
      setSelectedOrder(orderData);
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do pedido.',
        variant: 'destructive',
      });
    }
  };

  const cancelOrder = async (orderId: number, reason: string = '') => {
    try {
      setCancellingOrder(orderId);
      const token = await currentUser?.getIdToken();
      
      const response = await fetch(`/api/cart/orders/${orderId}/cancel/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cancelar pedido');
      }

      // Refresh orders
      await fetchOrders();
      
      toast({
        title: 'Sucesso',
        description: 'Pedido cancelado com sucesso.',
      });
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível cancelar o pedido.',
        variant: 'destructive',
      });
    } finally {
      setCancellingOrder(null);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    const StatusIcon = statusConfig[selectedOrder.status as keyof typeof statusConfig]?.icon || Package;

    return (
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
    <DialogContent className="max-w-full sm:max-w-4xl h-full sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Pedido {selectedOrder.order_number}
              <Badge className={statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6">
            {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data:</span>
                    <span>{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{formatPrice(parseFloat(selectedOrder.total_amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrega:</span>
                    <span>{parseFloat(selectedOrder.shipping_cost) === 0 ? 'Grátis' : formatPrice(parseFloat(selectedOrder.shipping_cost))}</span>
                  </div>
                  {selectedOrder.estimated_delivery && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previsão de Entrega:</span>
                      <span>{new Date(selectedOrder.estimated_delivery).toLocaleDateString('pt-PT')}</span>
                    </div>
                  )}
                  {selectedOrder.tracking_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rastreamento:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{selectedOrder.tracking_number}</code>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Método:</span>
                    <p className="font-medium">
                      {shippingMethodNames[selectedOrder.shipping_method as keyof typeof shippingMethodNames] || selectedOrder.shipping_method}
                    </p>
                  </div>
                  
                  {selectedOrder.shipping_address && (
                    <div>
                      <span className="text-sm text-muted-foreground">Endereço:</span>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium">{selectedOrder.shipping_address.name}</p>
                        <p>{selectedOrder.shipping_address.address}</p>
                        <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province}</p>
                        {selectedOrder.shipping_address.phone && (
                          <p className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {selectedOrder.shipping_address.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items */}
            {selectedOrder.items && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
              {selectedOrder.items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                          {item.color && (
                            <p className="text-sm text-muted-foreground">
                              Cor: {item.color}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity} × {formatPrice(parseFloat(item.price))}
                          </p>
                        </div>
                        <div className="w-full sm:w-auto text-right">
                          <p className="font-medium">{formatPrice(parseFloat(item.total))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.status_history.map((history) => (
                      <div key={history.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {statusConfig[history.new_status as keyof typeof statusConfig]?.label || history.new_status}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(history.created_at)}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {history.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Notes */}
            {selectedOrder.customer_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suas Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedOrder.customer_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe o status dos seus pedidos
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'Nenhum pedido encontrado' : 'Você ainda não fez nenhum pedido'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca.' 
                    : 'Explore nossa loja e faça seu primeiro pedido!'
                  }
                </p>
                {!searchTerm && (
                  <Button asChild>
                    <Link to="/">
                      Ver Produtos
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Package;
            const canCancel = ['pending', 'confirmed'].includes(order.status);
            
            return (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Pedido {order.order_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        Total: {formatPrice(parseFloat(order.total_amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Entrega: {shippingMethodNames[order.shipping_method as keyof typeof shippingMethodNames] || order.shipping_method}
                      </p>
                      {order.tracking_number && (
                        <p className="text-sm text-muted-foreground">
                          Rastreamento: {order.tracking_number}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrderDetails(order.id)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelOrder(order.id)}
                          disabled={cancellingOrder === order.id}
                          className="w-full sm:w-auto"
                        >
                          {cancellingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                              Cancelando...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog />
    </div>
  );
};

export default AccountOrders;
