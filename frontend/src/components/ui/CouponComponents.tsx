import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Tag, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContextAPI';
import { useCouponAPI } from '@/hooks/useCartAPI';
import { toast } from '@/hooks/use-toast';

interface CouponInputProps {
  onCouponApplied?: (code: string, discountAmount: number) => void;
}

export const CouponInput: React.FC<CouponInputProps> = ({ onCouponApplied }) => {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { applyCoupon, loading } = useCart();
  const { validateCoupon } = useCouponAPI();

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      toast({
        title: 'Código necessário',
        description: 'Digite um código de cupom válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    try {
      // First validate the coupon
      const validation = await validateCoupon(couponCode.trim());
      
      if (!validation.valid) {
        toast({
          title: 'Cupom inválido',
          description: validation.error_message || 'O cupom não é válido.',
          variant: 'destructive',
        });
        return;
      }

      // Apply the coupon
      await applyCoupon(couponCode.trim());
      onCouponApplied?.(couponCode.trim(), validation.discount_amount);
      setCouponCode('');
    } catch (error) {
      console.error('Error applying coupon:', error);
    } finally {
      setIsValidating(false);
    }
  }, [couponCode, validateCoupon, applyCoupon, onCouponApplied]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCoupon();
    }
  };

  const isLoading = loading || isValidating;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Cupom de Desconto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="coupon-code" className="sr-only">
              Código do cupom
            </Label>
            <Input
              id="coupon-code"
              placeholder="Digite o código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="uppercase"
            />
          </div>
          <Button
            onClick={handleApplyCoupon}
            disabled={isLoading || !couponCode.trim()}
            className="px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Aplicando...
              </>
            ) : (
              'Aplicar'
            )}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Digite um código de cupom válido para obter desconto na sua compra.
        </div>
      </CardContent>
    </Card>
  );
};

interface AppliedCouponProps {
  couponCode: string;
  discountAmount: number;
  onRemove: () => void;
}

export const AppliedCoupon: React.FC<AppliedCouponProps> = ({
  couponCode,
  discountAmount,
  onRemove,
}) => {
  const { removeCoupon, loading } = useCart();

  const handleRemove = useCallback(async () => {
    try {
      await removeCoupon();
      onRemove();
    } catch (error) {
      console.error('Error removing coupon:', error);
    }
  }, [removeCoupon, onRemove]);

  return (
    <Card className="w-full border-green-200 bg-green-50">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                  {couponCode}
                </Badge>
                <span className="text-sm font-medium text-green-800">
                  Cupom aplicado!
                </span>
              </div>
              <div className="text-sm text-green-600 mt-1">
                Desconto: -R$ {discountAmount.toFixed(2)}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface CartSummaryProps {
  subtotal: number;
  discountAmount?: number;
  total: number;
  appliedCoupon?: string;
  onCouponApplied?: (code: string, discountAmount: number) => void;
  onCouponRemoved?: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  discountAmount = 0,
  total,
  appliedCoupon,
  onCouponApplied,
  onCouponRemoved,
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Resumo do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto</span>
              <span>-R$ {discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Frete</span>
            <span>Calculado no checkout</span>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>
        
        <Separator />
        
        {/* Coupon Section */}
        {appliedCoupon ? (
          <AppliedCoupon
            couponCode={appliedCoupon}
            discountAmount={discountAmount}
            onRemove={() => onCouponRemoved?.()}
          />
        ) : (
          <CouponInput onCouponApplied={onCouponApplied} />
        )}
        
        <Button className="w-full" size="lg">
          Finalizar Compra
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          Taxas e impostos serão calculados no checkout
        </div>
      </CardContent>
    </Card>
  );
};

interface CouponValidationMessageProps {
  isValid: boolean;
  message?: string;
  discountAmount?: number;
}

export const CouponValidationMessage: React.FC<CouponValidationMessageProps> = ({
  isValid,
  message,
  discountAmount,
}) => {
  if (!message) return null;

  return (
    <div className={`flex items-center gap-2 text-sm ${
      isValid ? 'text-green-600' : 'text-red-600'
    }`}>
      {isValid ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <span>
        {message}
        {isValid && discountAmount && ` (Desconto: R$ ${discountAmount.toFixed(2)})`}
      </span>
    </div>
  );
};

export default CouponInput;