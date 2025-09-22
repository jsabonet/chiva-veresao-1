import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface GoogleAuthButtonProps {
  onAuth: () => Promise<void>;
  disabled?: boolean;
  mode?: 'login' | 'register';
  className?: string;
}

/**
 * Reusable Google authentication button (login or register flavor)
 */
export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onAuth,
  disabled,
  mode = 'login',
  className = ''
}) => {
  const [loading, setLoading] = useState(false);

  const label = mode === 'login' ? 'Entrar com Google' : 'Continuar com Google';

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onAuth();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-4 w-4 mr-2"
          />
          {label}
        </>
      )}
    </Button>
  );
};

export default GoogleAuthButton;
