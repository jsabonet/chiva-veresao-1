import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Loading from '@/components/ui/Loading';
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
  product: number;
  product_name: string;
  sku: string;
  product_image?: string;
  color?: number;
  color_name?: string;
  color_hex?: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  weight?: string;
  dimensions?: string;
  created_at: string;
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
        <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          {/* Header - Fixed */}
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl font-bold">Pedido {selectedOrder.order_number}</span>
              <Badge className={`${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'} w-fit`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-4 sm:px-6 pb-6 pt-4">
            <div className="grid gap-4 sm:gap-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-blue-900">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                    Informações do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-gray-600 font-medium">Data:</span>
                    <span className="text-right font-semibold text-gray-900">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-gray-600 font-medium">Total:</span>
                    <span className="text-right font-bold text-lg text-blue-700">{formatPrice(parseFloat(selectedOrder.total_amount))}</span>
                  </div>
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-gray-600 font-medium">Entrega:</span>
                    <span className="text-right font-semibold text-green-700">
                      {parseFloat(selectedOrder.shipping_cost) === 0 ? 'Grátis' : formatPrice(parseFloat(selectedOrder.shipping_cost))}
                    </span>
                  </div>
                  {selectedOrder.estimated_delivery && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-gray-600 font-medium">Previsão de Entrega:</span>
                        <span className="text-right font-semibold text-indigo-700">
                          {new Date(selectedOrder.estimated_delivery).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedOrder.tracking_number && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-600 font-medium text-sm">Rastreamento:</span>
                        <code className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-xs sm:text-sm font-mono border border-blue-200 break-all">
                          {selectedOrder.tracking_number}
                        </code>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Card className="border-2 border-green-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-green-900">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                    Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div>
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Método:</span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {shippingMethodNames[selectedOrder.shipping_method as keyof typeof shippingMethodNames] || selectedOrder.shipping_method}
                    </p>
                  </div>
                  
                  {selectedOrder.shipping_address && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">Endereço:</span>
                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm mt-2 border border-gray-200">
                          <p className="font-bold text-gray-900 mb-2">{selectedOrder.shipping_address.name}</p>
                          <p className="text-gray-700">{selectedOrder.shipping_address.address}</p>
                          <p className="text-gray-700">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province}</p>
                          {selectedOrder.shipping_address.phone && (
                            <p className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-300 text-gray-800 font-medium">
                              <Phone className="h-3 w-3" />
                              {selectedOrder.shipping_address.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items - Always show card with fallback, align with OrdersManagement */}
            <Card className="border-2 border-purple-100 shadow-md">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-purple-900">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  Itens do Pedido ({selectedOrder.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3 sm:space-y-4">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all duration-200 border-2 border-gray-200 hover:border-purple-300"
                        >
                          {/* Header with Image and Basic Info */}
                          <div className="flex items-start gap-3 sm:gap-4 mb-3">
                            <div className="relative flex-shrink-0">
                              <img
                                src={item.product_image || '/placeholder-product.jpg'}
                                alt={item.product_name}
                                className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg object-cover border-2 border-white shadow-lg ring-2 ring-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-product.jpg';
                                }}
                              />
                              <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
                                {item.quantity}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm sm:text-base text-gray-900 mb-2 line-clamp-2 leading-tight">
                                {item.product_name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-mono text-xs px-2 py-0.5">
                                  <span className="hidden sm:inline">SKU: </span>{item.sku}
                                </Badge>
                                {item.color_name && (
                                  <Badge variant="outline" className="bg-white border-gray-300 flex items-center gap-1.5 px-2 py-0.5">
                                    {item.color_hex && (
                                      <div
                                        className="w-3 h-3 rounded-full border-2 border-gray-400 shadow-sm"
                                        style={{ backgroundColor: item.color_hex }}
                                      />
                                    )}
                                    <span className="text-xs font-medium">{item.color_name}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-base sm:text-lg font-bold text-purple-700">
                                {formatPrice(parseFloat(item.subtotal))}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                                {item.quantity}x {formatPrice(parseFloat(item.unit_price))}
                              </div>
                            </div>
                          </div>

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm">
                            <div className="bg-white rounded-lg p-2 sm:p-2.5 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                              <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 font-medium">Quantidade</div>
                              <div className="font-bold text-gray-900">{item.quantity} un.</div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-2 sm:p-2.5 border-2 border-gray-200 hover:border-green-300 transition-colors">
                              <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 font-medium">Preço Unit.</div>
                              <div className="font-bold text-green-700">{formatPrice(parseFloat(item.unit_price))}</div>
                            </div>

                            {item.weight && (
                              <div className="bg-white rounded-lg p-2 sm:p-2.5 border-2 border-gray-200 hover:border-orange-300 transition-colors">
                                <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 font-medium">Peso</div>
                                <div className="font-bold text-gray-900">{item.weight}</div>
                              </div>
                            )}

                            {item.dimensions && (
                              <div className="bg-white rounded-lg p-2 sm:p-2.5 border-2 border-gray-200 hover:border-purple-300 transition-colors">
                                <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 font-medium">Dimensões</div>
                                <div className="font-bold text-gray-900 text-[10px] sm:text-xs">{item.dimensions}</div>
                              </div>
                            )}
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

                  {/* Financial Summary to match admin modal */}
                  <div className="border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3 mt-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Resumo Financeiro</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="font-semibold">
                          {formatPrice(Math.max(0, parseFloat(selectedOrder.total_amount) - parseFloat(selectedOrder.shipping_cost)))}
                        </span>
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
          <Loading label="Carregando pedidos..." />
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
