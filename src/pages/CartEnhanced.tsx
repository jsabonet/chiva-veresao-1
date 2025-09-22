import { useMemo } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';
import { useCart } from '@/contexts/CartContextAPI';
import { CartSummary } from '@/components/ui/CouponComponents';

const Cart = () => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discount_amount,
    total,
    applied_coupon_code,
    synced_with_server,
    loading,
    formatSubtotal,
    formatTotal,
    formatDiscount,
  } = useCart();

  const shipping = 2500; // TODO: calcular dinamicamente no futuro
  const finalTotal = useMemo(() => total + shipping, [total, shipping]);

  const handleCouponApplied = (code: string, discountAmount: number) => {
    // This is handled by the CartSummary component
  };

  const handleCouponRemoved = () => {
    // This is handled by the CartSummary component
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto" />
            <h1 className="text-3xl font-bold">Seu carrinho está vazio</h1>
            <p className="text-muted-foreground">
              Adicione alguns produtos ao seu carrinho para continuar comprando.
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" className="mb-4" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Carrinho de Compras</h1>
                <p className="text-muted-foreground mt-2">
                  {items.length} {items.length === 1 ? 'item' : 'itens'} no carrinho
                  {synced_with_server && (
                    <Badge variant="secondary" className="ml-2">
                      Sincronizado
                    </Badge>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={clearCart}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Limpar Carrinho
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={`${item.id}-${item.color_id || 'no-color'}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-semibold text-lg leading-tight">
                              {item.name}
                              {item.color_name && (
                                <span className="text-muted-foreground">
                                  {' '}• Cor: {item.color_name}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatPrice(item.price)} cada
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id, item.color_id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, -1, item.color_id)}
                              disabled={loading || item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, 1, item.color_id)}
                              disabled={
                                loading ||
                                (item.max_quantity !== undefined && item.quantity >= item.max_quantity)
                              }
                              className="h-8 w-8 p-0"
                              title={
                                item.max_quantity !== undefined && item.quantity >= item.max_quantity
                                  ? `Máximo ${item.max_quantity} em estoque`
                                  : undefined
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Item Total */}
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                            {item.max_quantity && (
                              <p className="text-xs text-muted-foreground">
                                {item.max_quantity - item.quantity} restantes
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stock Warning */}
                        {item.max_quantity && item.quantity >= item.max_quantity && (
                          <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Quantidade máxima em estoque atingida
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary with Coupon Support */}
            <div className="lg:col-span-1">
              <CartSummary
                subtotal={subtotal}
                discountAmount={discount_amount}
                total={finalTotal}
                appliedCoupon={applied_coupon_code}
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
              />

              {/* Additional Info */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Informações de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Frete</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>• Entrega em até 7 dias úteis</p>
                    <p>• Frete grátis acima de R$ 200,00</p>
                    <p>• Produto pode ter cores variadas</p>
                  </div>
                </CardContent>
              </Card>

              {/* Sync Status */}
              {!synced_with_server && (
                <Card className="mt-4 border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Carrinho local</p>
                      <p className="text-xs mt-1">
                        Faça login para sincronizar seu carrinho entre dispositivos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Mobile Summary */}
          <div className="lg:hidden mt-8">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
                    <span>{formatSubtotal()}</span>
                  </div>
                  {discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto</span>
                      <span>-{formatDiscount()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" size="lg">
                  Finalizar Compra
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Cart;