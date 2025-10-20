import React from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  onChange, 
  readOnly = false,
  className = '',
  size = 'md'
}) => {
  const [hover, setHover] = React.useState(0);
  
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div 
      className={cn(
        'flex items-center gap-1',
        className
      )}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = hover || rating;
        const isHighlighted = star <= selected;
        
        return (
          <button
            key={star}
            type={readOnly ? 'button' : 'button'}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            className={cn(
              'rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors',
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
              isHighlighted ? 'text-yellow-500' : 'text-yellow-200'
            )}
            disabled={readOnly}
          >
            <Star 
              className={cn(
                'fill-current',
                sizes[size]
              )} 
              strokeWidth={1}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;