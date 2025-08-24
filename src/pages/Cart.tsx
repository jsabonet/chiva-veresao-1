import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';

const Cart = () => {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Máquina de Sorvete Industrial GELATO PRO 3000",
      price: 85000,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1560717845-968823efbfa1?w=400&h=300&fit=crop&crop=center",
      category: "Máquinas Industriais"
    },
    {
      id: 2,
      name: "Laptop Dell Inspiron 15",
      price: 45000,
      quantity: 2,
      image: "/src/assets/laptop.jpg",
      category: "Informática"
    }
  ]);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = 2500; // Fixed shipping cost
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
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
            <h1 className="text-3xl font-bold">Carrinho de Compras</h1>
            <p className="text-muted-foreground">{cartItems.length} itens no seu carrinho</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-4 items-center">
                      {/* Product Image and Info */}
                      <div className="md:col-span-2 flex gap-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-accent/50 flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            {item.category}
                          </p>
                          <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                          <p className="text-lg font-bold mt-2">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-center">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-0 focus:ring-0"
                            min="1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Total and Remove */}
                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entrega</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">Métodos de Pagamento</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="payment" value="mpesa" defaultChecked />
                      <span>M-Pesa</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="payment" value="card" />
                      <span>Cartão de Crédito/Débito</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="payment" value="transfer" />
                      <span>Transferência Bancária</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button size="lg" className="w-full">
                  Finalizar Compra
                </Button>
                <Button variant="quote" size="lg" className="w-full">
                  Solicitar Orçamento
                </Button>
              </div>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Informações de Entrega</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Entrega gratuita em Maputo</li>
                    <li>• Prazo: 2-5 dias úteis</li>
                    <li>• Instalação disponível para máquinas</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Cart;