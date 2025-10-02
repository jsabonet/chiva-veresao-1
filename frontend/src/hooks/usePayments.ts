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

  const initiatePayment = useCallback(async (method: 'mpesa' | 'emola' | 'card' | 'transfer' = 'mpesa'): Promise<InitiatePaymentResponse> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/cart/payments/initiate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e: any) {
      setError(e?.message || 'Falha ao iniciar pagamento');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentStatus = useCallback(async (orderId: number): Promise<PaymentStatusResponse> => {
    const res = await fetch(`${API_BASE_URL}/cart/payments/status/${orderId}/`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }, []);

  return { loading, error, initiatePayment, fetchPaymentStatus };
}
