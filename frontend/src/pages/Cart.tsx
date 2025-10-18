import { useMemo, useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShoppingCart, Package, Truck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';
import { useCart } from '@/contexts/CartContext';
import { usePayments } from '@/hooks/usePayments';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';

const Cart = () => {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const { initiatePayment } = usePayments();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const shipping = 0; // TODO: calcular dinamicamente no futuro
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        <main className="container mx-auto px-4 py-12 sm:py-20">
          <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in duration-500">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-xl">
              <ShoppingBag className="h-16 w-16 text-gray-500" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Seu carrinho está vazio</h1>
              <p className="text-base sm:text-lg text-gray-600">
                Adicione alguns produtos ao seu carrinho para continuar comprando.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto h-12 px-8 rounded-xl font-semibold text-base bg-primary hover:bg-primary-hover shadow-lg">
              <Link to="/">
                <ArrowLeft className="h-5 w-5 mr-2" />
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-in fade-in duration-500">
            <Button variant="ghost" className="mb-4 hover:bg-gray-100 rounded-xl" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Carrinho de Compras</h1>
            </div>
            <p className="text-base text-gray-600 ml-15">{items.length} {items.length === 1 ? 'item' : 'itens'} no seu carrinho</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={`${item.id}-${item.color_id || 'no-color'}`} className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 animate-in slide-in-from-bottom-4 duration-500 hover:shadow-xl transition-shadow">
                  <div className="flex flex-col sm:grid sm:grid-cols-4 gap-4 items-start sm:items-center">
                    {/* Product Image and Info */}
                    <div className="sm:col-span-2 flex gap-4 w-full">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.category && (
                          <p className="text-xs text-primary uppercase tracking-wider mb-1 font-semibold">
                            {item.category}
                          </p>
                        )}
                        <h3 className="font-bold text-base sm:text-lg leading-tight text-gray-900 line-clamp-2">
                          {item.name}
                        </h3>
                        {item.color_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            Cor: <span className="font-medium">{item.color_name}</span>
                          </p>
                        )}
                        <p className="text-lg sm:text-xl font-bold text-primary mt-2">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-center w-full sm:w-auto">
                      <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl overflow-hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 hover:bg-gray-200 rounded-none"
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.color_id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1, item.color_id)}
                          className="w-16 text-center border-0 focus:ring-0 bg-transparent font-semibold"
                          min="1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 hover:bg-gray-200 rounded-none"
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.color_id)}
                          disabled={item.max_quantity ? item.quantity >= item.max_quantity : false}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Total and Remove */}
                    <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                        <p className="font-bold text-xl text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-10 w-10"
                        onClick={() => removeItem(item.id, item.color_id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:sticky lg:top-4 h-fit space-y-6">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-primary p-6">
                  <div className="flex items-center gap-3 text-white">
                    <Package className="h-6 w-6" />
                    <h2 className="text-xl font-bold">Resumo do Pedido</h2>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Entrega</span>
                    <span className="font-semibold text-green-600">{shipping === 0 ? 'Grátis' : formatPrice(shipping)}</span>
                  </div>
                  <div className="h-px bg-gray-200"></div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full h-12 rounded-xl font-semibold text-base bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg" 
                  onClick={() => setShowPaymentModal(true)}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Finalizar Compra
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-12 rounded-xl font-semibold text-base border-2 hover:bg-gray-50"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Solicitar Orçamento
                </Button>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border-2 border-primary/30">
                <div className="flex items-start gap-3 mb-3">
                  <Truck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <h4 className="font-bold text-gray-900">Informações de Entrega</h4>
                </div>
                <ul className="text-sm text-gray-700 space-y-2 ml-8">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Entrega gratuita em Maputo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Prazo: 2-5 dias úteis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Instalação disponível para máquinas</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <PaymentMethodSelector
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={total}
          onSubmit={async (paymentData) => {
            // New flow: navigate to checkout details page where full customer, shipping
            // and order information will be collected before redirecting to the gateway.
            setShowPaymentModal(false);
            navigate('/checkout', {
              state: {
                method: paymentData.method,
                items: items.map(item => ({ id: item.id, quantity: item.quantity, color_id: item.color_id || null })),
                amount: total,
                shipping_amount: shipping,
                currency: 'MZN'
              }
            });
          }}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Cart;