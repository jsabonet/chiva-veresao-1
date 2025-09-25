import { useState, useCallback } from 'react';
import { useToast } from '../hooks/use-toast';

// Types for cart operations
export interface CartItem {
  id: number;
  product: {
    id: number;
    name: string;
    price: number;
    image: string;
    slug: string;
    stock: number;
  };
  color: {
    id: number;
    name: string;
    hex_code: string;
  } | null;
  quantity: number;
  price: number;
  total_price: number;
  added_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  items: CartItem[];
  total_items: number;
  applied_coupon_code?: string;
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_amount?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_currently_valid: boolean;
}

const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api` : 'http://localhost:8000/api');

// Custom hook for cart API operations
export const useCartAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper function to make API requests
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include session cookies
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Get current cart
  const getCart = useCallback(async (): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/cart/');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get cart';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add item to cart
  const addToCart = useCallback(async (
    productId: number,
    quantity: number = 1,
    colorId?: number
  ): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/cart/', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          quantity,
          color_id: colorId,
        }),
      });
      
      toast({
        title: "Item adicionado ao carrinho",
        description: "O produto foi adicionado com sucesso ao seu carrinho.",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(errorMessage);
      
      toast({
        title: "Erro ao adicionar item",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update cart item quantity
  const updateCartItem = useCallback(async (
    itemId: number,
    quantity: number
  ): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/cart/items/${itemId}/`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cart item';
      setError(errorMessage);
      
      toast({
        title: "Erro ao atualizar item",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Remove item from cart
  const removeFromCart = useCallback(async (itemId: number): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/cart/items/${itemId}/`, {
        method: 'DELETE',
      });
      
      toast({
        title: "Item removido",
        description: "O item foi removido do seu carrinho.",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from cart';
      setError(errorMessage);
      
      toast({
        title: "Erro ao remover item",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Clear cart
  const clearCart = useCallback(async (): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/cart/', {
        method: 'DELETE',
      });
      
      toast({
        title: "Carrinho limpo",
        description: "Todos os itens foram removidos do seu carrinho.",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(errorMessage);
      
      toast({
        title: "Erro ao limpar carrinho",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Apply coupon
  const applyCoupon = useCallback(async (couponCode: string): Promise<{ cart: Cart; discount_amount: number }> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/cart/coupon/', {
        method: 'POST',
        body: JSON.stringify({ coupon_code: couponCode }),
      });
      
      toast({
        title: "Cupom aplicado",
        description: `Desconto de ${data.discount_amount} aplicado com sucesso.`,
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply coupon';
      setError(errorMessage);
      
      toast({
        title: "Erro ao aplicar cupom",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Remove coupon
  const removeCoupon = useCallback(async (): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/cart/coupon/', {
        method: 'DELETE',
      });
      
      toast({
        title: "Cupom removido",
        description: "O cupom foi removido do seu carrinho.",
      });
      
      return data.cart;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove coupon';
      setError(errorMessage);
      
      toast({
        title: "Erro ao remover cupom",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Validate coupon
  const validateCoupon = useCallback(async (couponCode: string): Promise<{
    valid: boolean;
    coupon: Coupon;
    discount_amount: number;
    error_message?: string;
  }> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/cart/coupon/validate/?code=${encodeURIComponent(couponCode)}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate coupon';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Merge cart on login
  const mergeCart = useCallback(async (anonymousCartData: any[]): Promise<Cart> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/cart/merge/', {
        method: 'POST',
        body: JSON.stringify({ anonymous_cart_data: anonymousCartData }),
      });
      
      toast({
        title: "Carrinho sincronizado",
        description: "Seu carrinho foi sincronizado com sucesso.",
      });
      
      return data.cart;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to merge cart';
      setError(errorMessage);
      
      toast({
        title: "Erro ao sincronizar carrinho",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    error,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    validateCoupon,
    mergeCart,
  };
};

// Hook for coupon operations
export const useCouponAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/cart/coupon/validate/?code=${encodeURIComponent(code)}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate coupon');
      }
      
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate coupon';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    validateCoupon,
  };
};