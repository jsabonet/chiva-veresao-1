import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { useFavoritesContext } from '@/contexts/FavoritesContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/formatPrice';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const AccountFavorites = () => {
  const { favorites, loading, removeFromFavorites } = useFavoritesContext();
  const { addItem } = useCart();

  const handleAddToCart = (favorite: any) => {
    const product = favorite.product;
    
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.price),
      original_price: product.original_price ? parseFloat(product.original_price) : undefined,
      quantity: 1,
      image: product.main_image_url,
      category: product.category_name,
      max_quantity: 999, // Default since we don't have stock info in favorites
    });

    toast({
      title: 'Adicionado ao carrinho',
      description: `${product.name} foi adicionado ao carrinho.`,
    });
  };

  const handleRemoveFromFavorites = async (productId: number) => {
    try {
      await removeFromFavorites(productId);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Meus Favoritos</h1>
          <p className="text-gray-600">Seus produtos favoritos</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Meus Favoritos</h1>
          <p className="text-gray-600">Seus produtos favoritos</p>
        </div>
        
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum favorito ainda</h3>
            <p className="text-gray-600 mb-6">
              Explore nossos produtos e adicione seus favoritos aqui
            </p>
            <Button asChild>
              <Link to="/products">
                <Package className="mr-2 h-4 w-4" />
                Ver Produtos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Meus Favoritos</h1>
        <p className="text-gray-600">
          {favorites.length} {favorites.length === 1 ? 'produto favoritado' : 'produtos favoritados'}
        </p>
      </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite) => {
          const product = favorite.product;
          const hasDiscount = product.original_price && parseFloat(product.original_price) > parseFloat(product.price);
          
          return (
            <Card key={favorite.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {/* Product Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-gray-100 w-full">
                  {product.main_image_url ? (
                    <img
                      src={product.main_image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Remove from favorites button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm"
                    onClick={() => handleRemoveFromFavorites(product.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>

                  {/* Discount badge */}
                  {hasDiscount && (
                    <Badge variant="destructive" className="absolute top-2 left-2">
                      Em Promoção
                    </Badge>
                  )}

                  {/* Stock status */}
                  {!product.is_in_stock && (
                    <Badge variant="secondary" className="absolute bottom-2 left-2">
                      Fora de Estoque
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <div>
                    {product.category_name && (
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {product.category_name}
                      </p>
                    )}
                    <Link
                      to={`/produto/${product.slug}`}
                      className="block font-semibold text-sm leading-tight hover:text-primary transition-colors"
                    >
                      {product.name}
                    </Link>
                    {product.brand && (
                      <p className="text-xs text-gray-500 mt-1">
                        {product.brand}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {formatPrice(parseFloat(product.price))}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(parseFloat(product.original_price!))}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleAddToCart(favorite)}
                      disabled={!product.is_in_stock}
                      className="w-full sm:w-auto"
                      size="sm"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {product.is_in_stock ? 'Adicionar' : 'Indisponível'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromFavorites(product.id)}
                      className="w-full sm:w-auto"
                    >
                      <Heart className="h-4 w-4 fill-current text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistics */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {favorites.length}
              </div>
              <div className="text-sm text-gray-600">
                Total de Favoritos
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {favorites.filter(f => f.product.is_in_stock).length}
              </div>
              <div className="text-sm text-gray-600">
                Em Estoque
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {favorites.filter(f => f.product.original_price && parseFloat(f.product.original_price) > parseFloat(f.product.price)).length}
              </div>
              <div className="text-sm text-gray-600">
                Em Promoção
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountFavorites;