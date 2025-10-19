import React from 'react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface RatingProps {
  value: number; // 0..5, supports halves
  count?: number; // optional total reviews
  size?: Size;
  showValue?: boolean; // show numeric like 4.5
  className?: string;
  colorClass?: string; // override star color
  grayClass?: string; // override empty star color
  'aria-label'?: string;
}

// Simple star SVG path for better control over fill/mask (lucide half is not available)
const StarSvg = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" />
  </svg>
);

const sizeMap: Record<Size, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const Rating: React.FC<RatingProps> = ({
  value,
  count,
  size = 'md',
  showValue = true,
  className,
  colorClass = 'text-yellow-400',
  grayClass = 'text-gray-300',
  'aria-label': ariaLabel,
}) => {
  const clamp = (n: number) => Math.max(0, Math.min(5, n));
  const v = clamp(Number.isFinite(value) ? value : 0);
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.25 && v - full < 0.75; // treat 0.25..0.74 as half
  const stars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="img"
      aria-label={ariaLabel || `${v.toFixed(1)} de 5${count ? `, ${count} avaliações` : ''}`}
    >
      <div className="flex items-center">
        {stars.map((i) => {
          const isFull = i < full;
          const isHalf = i === full && hasHalf;
          return (
            <div key={i} className={cn('relative', i > 0 ? 'ml-0.5' : '')}>
              {/* Base empty star */}
              <StarSvg className={cn(sizeMap[size], grayClass)} />
              {/* Filled part */}
              <div
                className={cn('absolute inset-0 overflow-hidden', isHalf ? 'w-1/2' : 'w-full')}
                style={{ width: isFull ? '100%' : isHalf ? '50%' : '0%' }}
                aria-hidden="true"
              >
                <StarSvg className={cn(sizeMap[size], colorClass)} />
              </div>
            </div>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium tabular-nums">{v.toFixed(1)}</span>
      )}
      {typeof count === 'number' && (
        <span className="text-xs text-muted-foreground">({count.toLocaleString()})</span>
      )}
    </div>
  );
};

export default Rating;
