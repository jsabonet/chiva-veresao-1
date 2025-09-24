import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Mail, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Eye,
  Send,
  CheckCircle
} from 'lucide-react';
import { formatPrice } from '@/lib/formatPrice';

// Types for abandoned cart data
interface AbandonedCartItem {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    image: string;
  };
  color?: {
    name: string;
  };
  quantity: number;
  total_price: number;
}

interface AbandonedCartData {
  id: number;
  cart: {
    id: number;
    status: string;
    subtotal: number;
    total: number;
    items: AbandonedCartItem[];
    last_activity: string;
  };
  recovery_emails_sent: number;
  last_recovery_sent?: string;
  recovered: boolean;
  recovered_at?: string;
  abandonment_stage: string;
  created_at: string;
}

// Component for displaying abandoned cart recovery interface
interface AbandonedCartRecoveryProps {
  cartData: AbandonedCartData;
  onSendRecovery: (cartId: number) => void;
  onMarkRecovered: (cartId: number) => void;
}

export const AbandonedCartRecovery: React.FC<AbandonedCartRecoveryProps> = ({
  cartData,
  onSendRecovery,
  onMarkRecovered,
}) => {
  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'product_added':
        return 'Produto Adicionado';
      case 'cart_viewed':
        return 'Carrinho Visualizado';
      case 'checkout_started':
        return 'Checkout Iniciado';
      default:
        return stage;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'product_added':
        return 'bg-blue-100 text-blue-800';
      case 'cart_viewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'checkout_started':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const timeSinceAbandonment = () => {
    const now = new Date();
    const abandoned = new Date(cartData.created_at);
    const diffMs = now.getTime() - abandoned.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} dia(s) atrás`;
    }
    return `${diffHours} hora(s) atrás`;
  };

  return (
    <Card className={`w-full ${cartData.recovered ? 'border-green-200 bg-green-50' : 'border-orange-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5" />
            <div>
              <CardTitle className="text-lg">
                Carrinho Abandonado #{cartData.cart.id}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {cartData.cart.items.length} item(s) • {timeSinceAbandonment()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStageColor(cartData.abandonment_stage)}>
              {getStageLabel(cartData.abandonment_stage)}
            </Badge>
            
            {cartData.recovered && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Recuperado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cart Items Preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Itens no carrinho:</h4>
          <div className="grid gap-2">
            {cartData.cart.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <img
                  src={item.product.image || '/placeholder.svg'}
                  alt={item.product.name}
                  className="w-10 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.product.name}
                    {item.color && <span className="text-muted-foreground"> • {item.color.name}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}x {formatPrice(item.product.price)}
                  </p>
                </div>
                <div className="text-sm font-medium">
                  {formatPrice(item.total_price)}
                </div>
              </div>
            ))}
            
            {cartData.cart.items.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{cartData.cart.items.length - 3} mais item(s)
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Cart Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span className="font-medium">{formatPrice(cartData.cart.subtotal)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>{formatPrice(cartData.cart.total)}</span>
          </div>
        </div>

        <Separator />

        {/* Recovery Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-mails de recuperação enviados:
            </span>
            <Badge variant="secondary">
              {cartData.recovery_emails_sent}/3
            </Badge>
          </div>

          {cartData.last_recovery_sent && (
            <div className="text-sm text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              Último e-mail: {formatDate(cartData.last_recovery_sent)}
            </div>
          )}

          {cartData.recovered && cartData.recovered_at && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Carrinho recuperado em {formatDate(cartData.recovered_at)}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        {!cartData.recovered && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendRecovery(cartData.id)}
              disabled={cartData.recovery_emails_sent >= 3}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {cartData.recovery_emails_sent === 0 ? 'Enviar E-mail' : 'Reenviar E-mail'}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onMarkRecovered(cartData.id)}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como Recuperado
            </Button>
          </div>
        )}

        {cartData.recovery_emails_sent >= 3 && !cartData.recovered && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Limite máximo de e-mails de recuperação atingido para este carrinho.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Component for admin abandoned cart management dashboard
interface AbandonedCartDashboardProps {
  abandonedCarts: AbandonedCartData[];
  loading?: boolean;
  onRefresh: () => void;
  onSendRecovery: (cartId: number) => void;
  onMarkRecovered: (cartId: number) => void;
}

export const AbandonedCartDashboard: React.FC<AbandonedCartDashboardProps> = ({
  abandonedCarts,
  loading = false,
  onRefresh,
  onSendRecovery,
  onMarkRecovered,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'recovered'>('all');

  const filteredCarts = abandonedCarts.filter(cart => {
    switch (filter) {
      case 'pending':
        return !cart.recovered;
      case 'recovered':
        return cart.recovered;
      default:
        return true;
    }
  });

  const stats = {
    total: abandonedCarts.length,
    pending: abandonedCarts.filter(c => !c.recovered).length,
    recovered: abandonedCarts.filter(c => c.recovered).length,
    totalValue: abandonedCarts.reduce((sum, c) => sum + c.cart.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Abandonados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.recovered}</div>
            <p className="text-sm text-muted-foreground">Recuperados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatPrice(stats.totalValue)}</div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todos ({stats.total})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pendentes ({stats.pending})
          </Button>
          <Button
            variant={filter === 'recovered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('recovered')}
          >
            Recuperados ({stats.recovered})
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Abandoned Carts List */}
      <div className="space-y-4">
        {filteredCarts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">Nenhum carrinho abandonado encontrado</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? 'Não há carrinhos abandonados no momento.'
                  : `Não há carrinhos ${filter === 'pending' ? 'pendentes' : 'recuperados'}.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCarts.map((cart) => (
            <AbandonedCartRecovery
              key={cart.id}
              cartData={cart}
              onSendRecovery={onSendRecovery}
              onMarkRecovered={onMarkRecovered}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AbandonedCartRecovery;