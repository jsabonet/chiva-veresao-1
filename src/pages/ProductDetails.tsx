import { useParams, Navigate } from 'react-router-dom';
import { ShoppingCart, Heart, ArrowLeft, Star, Truck, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';
import { getProductById } from '@/data/products';

const ProductDetails = () => {
  const { id } = useParams();
  
  const productId = id ? parseInt(id, 10) : null;
  const product = productId ? getProductById(productId) : null;

  // Redirect to 404 if product not found
  if (!product) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          <span className="text-foreground">{product.category}</span>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos produtos
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-accent/50">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-md bg-accent/50 cursor-pointer hover:opacity-80 transition-opacity">
                    <img
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              {product.isNew && (
                <Badge className="bg-success text-success-foreground">
                  Novo
                </Badge>
              )}
              {product.isPromotion && (
                <Badge className="bg-destructive text-destructive-foreground">
                  Promoção
                </Badge>
              )}
            </div>

            {/* Title */}
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                {product.category}
              </p>
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating)
                        ? 'text-warning fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  ({product.reviews} avaliações)
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              {product.price ? (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                  {product.originalPrice && (
                    <p className="text-success font-medium">
                      Economize {formatPrice(product.originalPrice - product.price)}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-2xl font-bold text-primary">
                  Consulte o preço
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Actions */}
            <div className="space-y-4">
              <div className="flex gap-3">
                {product.price ? (
                  <Button size="lg" className="flex-1">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                ) : (
                  <Button variant="quote" size="lg" className="flex-1">
                    Solicitar Orçamento
                  </Button>
                )}
                <Button variant="outline" size="lg">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>
              {product.hasQuote && (
                <Button variant="quote" size="lg" className="w-full">
                  Solicitar Orçamento Personalizado
                </Button>
              )}
            </div>

            {/* Features */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Características Principais</h3>
                <ul className="grid gap-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-success" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Shipping Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Truck className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium">Entrega Gratuita</h4>
                    <p className="text-sm text-muted-foreground">
                      Entrega gratuita em Maputo • 2-5 dias úteis
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center gap-4">
                  <RefreshCw className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium">Suporte e Instalação</h4>
                    <p className="text-sm text-muted-foreground">
                      Instalação profissional e suporte técnico incluído
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="specifications" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="specifications">Especificações</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            <TabsTrigger value="warranty">Garantia</TabsTrigger>
          </TabsList>
          
          <TabsContent value="specifications" className="mt-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-6">Especificações Técnicas</h3>
                <div className="grid gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-border">
                      <span className="font-medium">{key}</span>
                      <span className="col-span-2 text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-6">Avaliações dos Clientes</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold">{product.rating}</div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(product.rating)
                                ? 'text-warning fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Baseado em {product.reviews} avaliações
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="border-b border-border pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-warning fill-current" />
                          ))}
                        </div>
                        <span className="font-medium">João M.</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "Excelente {product.category.toLowerCase()}! Muito robusta e fácil de usar. Recomendo para quem quer investir em qualidade."
                      </p>
                    </div>
                    
                    <div className="border-b border-border pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(4)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-warning fill-current" />
                          ))}
                          <Star className="h-4 w-4 text-gray-300" />
                        </div>
                        <span className="font-medium">Maria S.</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "Bom produto, mas a entrega demorou um pouco mais do que esperado. Fora isso, estou satisfeita."
                      </p>
                    </div>

                    <div className="border-b border-border pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-warning fill-current" />
                          ))}
                        </div>
                        <span className="font-medium">Carlos R.</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "Produto de excelente qualidade. A instalação foi rápida e o suporte técnico muito prestativo. Recomendo!"
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="warranty" className="mt-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-6">Garantia e Suporte</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Garantia de {product.features.find(f => f.includes('Garantia'))?.split(': ')[1] || '12 meses'}</h4>
                    <p className="text-sm text-muted-foreground">
                      Cobertura completa contra defeitos de fabricação e problemas técnicos.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Suporte Técnico</h4>
                    <p className="text-sm text-muted-foreground">
                      Assistência técnica especializada disponível 24/7 através do WhatsApp +258 87 849 4330.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Instalação Gratuita</h4>
                    <p className="text-sm text-muted-foreground">
                      Instalação e configuração inicial realizada por técnicos especializados sem custo adicional.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductDetails;
