import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UltraStableDialogProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const UltraStableDialog: React.FC<UltraStableDialogProps> = ({
  open,
  onClose,
  children,
  className
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      
      // Prevent all form of automatic closing
      const preventClose = (e: Event) => {
        e.stopPropagation();
      };
      
      const preventKeyClose = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      // Add event listeners to prevent closing
      document.addEventListener('keydown', preventKeyClose, true);
      
      return () => {
        document.removeEventListener('keydown', preventKeyClose, true);
      };
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on backdrop, not on dialog content
    if (e.target === backdropRef.current && onClose) {
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          "relative bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-full",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          margin: '0 auto'
        }}
      >
        <button
          type="button"
          onClick={handleCloseClick}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
};

export const UltraStableDialogContent: React.FC<{ 
  children: React.ReactNode; 
  className?: string 
}> = ({ children, className }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

export const UltraStableDialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4 pr-8">
    {children}
  </div>
);

export const UltraStableDialogTitle: React.FC<{ 
  children: React.ReactNode; 
  className?: string 
}> = ({ children, className }) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
);

export const UltraStableDialogFooter: React.FC<{ 
  children: React.ReactNode; 
  className?: string 
}> = ({ children, className }) => (
  <div className={cn("flex justify-end gap-2 mt-6", className)}>
    {children}
  </div>
);

// Special input component that prevents any event bubbling that could close dialog
export const UltraStableInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
}> = ({ value, onChange, placeholder, type = "text", className, required }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onChange(e.target.value);
  };
  
  const handleFocus = (e: React.FocusEvent) => {
    e.stopPropagation();
  };
  
  const handleBlur = (e: React.FocusEvent) => {
    e.stopPropagation();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };
  
  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      required={required}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
};