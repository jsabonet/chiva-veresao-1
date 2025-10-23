import React from 'react';

type LoadingProps = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  center?: boolean;
  className?: string;
};

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export default function Loading({ label, size = 'md', center = true, className = '' }: LoadingProps) {
  const container = `${center ? 'text-center py-8' : ''} ${className}`.trim();
  const spinnerSize = sizeMap[size] || sizeMap.md;
  return (
    <div className={container} role="status" aria-live="polite" aria-busy="true">
      <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-primary mx-auto`} />
      {label ? (
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
