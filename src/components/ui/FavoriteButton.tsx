import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useFavoritesContext } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  productId: number;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  variant = 'outline',
  size = 'default',
  className,
  showText = false,
}) => {
  const { currentUser } = useAuth();
  const { isFavorite, toggleFavorite, loading } = useFavoritesContext();
  const isCurrentlyFavorite = isFavorite(productId);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para adicionar produtos aos favoritos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await toggleFavorite(productId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={loading}
      className={cn(
        'relative transition-colors',
        isCurrentlyFavorite && 'text-red-500 hover:text-red-600',
        className
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          showText && 'mr-2',
          isCurrentlyFavorite && 'fill-current'
        )}
      />
      {showText && (
        <span>{isCurrentlyFavorite ? 'Favoritado' : 'Favoritar'}</span>
      )}
    </Button>
  );
};