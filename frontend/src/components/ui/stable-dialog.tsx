import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StableDialogProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  preventClose?: boolean;
}

export const StableDialog: React.FC<StableDialogProps> = ({
  open,
  onClose,
  children,
  className,
  preventClose = false
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (preventClose) return;
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (preventClose) return;
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose, preventClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={cn(
          "relative bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {!preventClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export const StableDialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

export const StableDialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4">
    {children}
  </div>
);

export const StableDialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
);

export const StableDialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => (
  <div className={cn("flex justify-end gap-2 mt-6", className)}>
    {children}
  </div>
);