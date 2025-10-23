import React from 'react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  widths?: number[]; // e.g., [320, 640, 1024]
  sizes?: string; // e.g., '(max-width: 768px) 100vw, 33vw'
  fallback?: string; // placeholder path
};

const defaultWidths = [320, 640, 1024];

function buildVariantUrl(url: string, width: number, ext = 'webp') {
  try {
    // Remove query/hash for variant generation
    const [baseNoQuery] = url.split(/[?#]/);
    const lastDot = baseNoQuery.lastIndexOf('.');
    if (lastDot === -1) return url;
    const base = baseNoQuery.substring(0, lastDot);
    return `${base}-${width}.${ext}`;
  } catch {
    return url;
  }
}

export const OptimizedImage: React.FC<Props> = ({
  src,
  alt,
  className,
  widths = defaultWidths,
  sizes = '(max-width: 768px) 100vw, 33vw',
  fallback = '/placeholder.svg',
}) => {
  const imgSrc = src || fallback;
  const disableVariants = /\/products\/None\//.test(imgSrc) || /\/reviews\/None\//.test(imgSrc);
  const webpSrcSet = disableVariants
    ? undefined
    : widths.map((w) => `${buildVariantUrl(imgSrc, w, 'webp')} ${w}w`).join(', ');

  return (
    <picture>
      {/* Prefer WebP variants if available and safe */}
      {webpSrcSet && <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />}
      {/* Fallback to original */}
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== fallback) target.src = fallback;
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
