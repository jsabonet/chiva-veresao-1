import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/formatPrice';

interface ProductCardProps {
  id: number;
  name: string;
  price?: number;
  originalPrice?: number;
  image: string;
  category: string;
  isNew?: boolean;
  isPromotion?: boolean;
  hasQuote?: boolean;
  rating?: number;
  reviews?: number;
}

const ProductCard = ({ 
  id, 
  name, 
  price, 
  originalPrice, 
  image, 
  category, 
  isNew, 
  isPromotion, 
  hasQuote,
  rating = 4.5,
  reviews = 0 
}: ProductCardProps) => {

  return (
    <Link to={`/produto/${id}`}>
      <Card className="group relative overflow-hidden shadow-card hover:shadow-hover transition-all duration-300 transform hover:scale-[1.02]">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {isNew && (
          <Badge className="bg-success text-success-foreground">
            Novo
          </Badge>
        )}
        {isPromotion && (
          <Badge className="bg-destructive text-destructive-foreground">
            Promoção
          </Badge>
        )}
      </div>

      {/* Favorite Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-10 bg-white/80 hover:bg-white text-gray-600 hover:text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        <Heart className="h-4 w-4" />
      </Button>

      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-accent/50">
        <img
          src={image || "https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Sem+Imagem"}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Produto+Chiva";
          }}
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/90 hover:bg-white text-gray-700 rounded-full mx-1"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Category */}
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          {category}
        </p>

        {/* Product Name */}
        <h3 className="font-semibold text-sm mb-3 line-clamp-2 leading-tight min-h-[2.5rem]">
          {name}
        </h3>

        {/* Rating */}
        {reviews > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${
                    i < Math.floor(rating) 
                      ? 'text-warning' 
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ({reviews})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            {hasQuote ? (
              <span className="text-sm font-medium text-muted-foreground">
                Consultar preço
              </span>
            ) : (
              <>
                {price && (
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(price)}
                  </span>
                )}
                {originalPrice && originalPrice > (price || 0) && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {hasQuote ? (
            <Button variant="quote" size="sm" className="flex-1">
              Solicitar Orçamento
            </Button>
          ) : (
            <Button variant="shop" size="sm" className="flex-1">
              <ShoppingCart className="h-4 w-4 mr-1" />
              Comprar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </Link>
  );
};

export default ProductCard;