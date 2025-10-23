import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { formatPrice, getImageUrl, type Product, type ProductListItem } from '@/lib/api';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product | ProductListItem;
  compactPrice?: boolean;
}

const ProductCard = ({ product, compactPrice = false }: ProductCardProps) => {
  const { addItem } = useCart();
  // Type guard to check if product is ProductListItem
  const isProductListItem = (prod: Product | ProductListItem): prod is ProductListItem => {
    return 'main_image_url' in prod || 'category_name' in prod;
  };

  // Helper functions to handle differences between Product and ProductListItem
  const getMainImage = () => {
    return isProductListItem(product) ? product.main_image_url : product.main_image;
  };

  const getCategoryName = () => {
    return isProductListItem(product) ? product.category_name : product.category?.name;
  };

  const getProductSlug = () => {
    return isProductListItem(product) ? product.slug : product.slug || product.id.toString();
  };

  const isLowStock = () => {
    if (isProductListItem(product)) {
      return product.is_low_stock;
    }
    return (product as Product).stock_quantity <= (product as Product).min_stock_level && (product as Product).stock_quantity > 0;
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const priceNumber = typeof product.price === 'number' ? product.price : parseFloat(product.price as any);
    const originalNumber = product.original_price ? (typeof product.original_price === 'number' ? product.original_price : parseFloat(product.original_price as any)) : null;
    addItem({
      id: (product as any).id,
      name: product.name,
      price: priceNumber,
      original_price: originalNumber ?? undefined,
      image: getMainImage() || undefined,
      category: getCategoryName() || undefined,
      slug: getProductSlug(),
      quantity: 1,
      max_quantity: (product as any).stock_quantity ?? undefined,
    });
    toast({
      title: 'Adicionado ao carrinho',
      description: product.name,
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement favorite functionality
    console.log('Toggle favorite:', product.id);
  };

  const discountPercentage = () => {
    if ('discount_percentage' in product) {
      return product.discount_percentage;
    }
    if (product.original_price && product.price) {
      const original = parseFloat(product.original_price);
      const current = parseFloat(product.price);
      return Math.round(((original - current) / original) * 100);
    }
    return 0;
  };

  return (
    <Link 
      to={`/produto/${getProductSlug()}`} 
      className="group block h-full"
    >
      <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-lg border-0 bg-white">
        <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-square">
          <OptimizedImage
            src={getImageUrl(getMainImage())}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
          
          {/* Discount badge */}
          {discountPercentage() > 0 && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="text-xs font-bold">
                -{discountPercentage()}%
              </Badge>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-red/90 hover:bg-white"
              onClick={handleToggleFavorite}
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 hover:bg-white"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Category */}
            <Badge variant="outline" className="text-xs">
              {getCategoryName()}
            </Badge>

            {/* Product name */}
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            {/* Price */}
            {compactPrice ? (
              <div className="inline-flex flex-col gap-0.5">
                <span className="text-base font-bold text-primary leading-none">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price !== product.price && (
                  <span className="text-xs text-gray-500 line-through leading-none">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price !== product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>
            )}

            {/* Stock status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {product.stock_quantity === 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    Esgotado
                  </Badge>
                ) : isLowStock() ? (
                  <Badge variant="secondary" className="text-xs">
                    Estoque baixo
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    Em estoque
                  </Badge>
                )}
              </div>
              
              {/* Add to cart button */}
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                className="flex items-center gap-1"
              >
                <ShoppingCart className="h-3 w-3" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
