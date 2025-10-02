import { useState, useCallback } from 'react';

const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api` : 'http://localhost:8000/api');

export interface InitiatePaymentResponse {
  order_id: number;
  payment: any; // raw gateway payload (may contain reference, redirect_url, etc.)
}

export interface PaymentStatusResponse {
  order: any;
  payments: any[];
}

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureActiveCart = async () => {
    try {
      // Try to add a default item to cart to ensure there's an active cart
      await fetch(`${API_BASE_URL}/cart/debug/add-item/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test-uid', product_id: 21 }),
      });
      console.log('✅ Ensured active cart exists');
    } catch (e) {
      console.warn('⚠️ Could not ensure active cart:', e);
    }
  };

  const getAuthHeaders = async () => {
    // Force dev bypass during development
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
      console.log('🔧 Using dev bypass token for payment request (forced)');
      return { Authorization: 'Bearer fake.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake' } as Record<string, string>;
    }
    
    try {
      const { auth } = await import('../lib/firebase');
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        console.log('🔐 Using Firebase token for payment request');
        return { Authorization: `Bearer ${token}` } as Record<string, string>;
      }
    } catch (e) {
      // ignore, we'll return empty headers
    }
    
    // Fallback: Use dev bypass token when no Firebase user
    console.log('🔧 Using dev bypass token for payment request');
    return { Authorization: 'Bearer fake.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake' } as Record<string, string>;
  };

  const initiatePayment = useCallback(async (method: 'mpesa' | 'emola' | 'card' | 'transfer' = 'mpesa', paymentData?: any): Promise<InitiatePaymentResponse> => {
    setLoading(true);
    setError(null);
    try {
      // Ensure there's an active cart before attempting payment
      await ensureActiveCart();
      
      const authHeaders = await getAuthHeaders();
      const url = `${API_BASE_URL}/cart/payments/initiate/`;
      console.log('💳 Initiating payment:', { method, url, headers: Object.keys(authHeaders) });
      
      const requestBody: any = {
        method,
        ...paymentData // Include all payment-specific data (phone, card data, etc.)
      };
      // If caller provided amount/shipping, pass them through to backend
      if (typeof paymentData?.amount === 'number') requestBody.amount = paymentData.amount;
      if (typeof paymentData?.shipping_amount === 'number') requestBody.shipping_amount = paymentData.shipping_amount;
      if (paymentData?.currency) requestBody.currency = paymentData.currency;
      if (requestBody.amount != null) {
        console.log('🧮 Initiating with explicit amount from UI:', requestBody.amount, requestBody.currency || 'MZN');
      }
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        // Bubble structured error for amount/method limits so the UI can suggest alternatives
        if (data && data.error === 'amount_exceeds_method_limit') {
          const err: any = new Error(data.message || 'Valor excede o limite do método');
          err.code = data.error;
          err.method = data.method;
          err.limit = data.limit;
          err.total = data.total;
          err.suggestions = data.suggestions || [];
          throw err;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      }
  const json = await res.json();
  // Backend returns { order_id, payment }, but if backend starts proxying gateway
  // responses directly, handle { status, data }
  if (json && json.status && json.data) return json.data;
  return json;
    } catch (e: any) {
      setError(e?.message || 'Falha ao iniciar pagamento');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentStatus = useCallback(async (orderId: number): Promise<PaymentStatusResponse> => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/cart/payments/status/${orderId}/`, {
      credentials: 'include',
      headers: { ...authHeaders },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }, []);

  return { loading, error, initiatePayment, fetchPaymentStatus };
}
