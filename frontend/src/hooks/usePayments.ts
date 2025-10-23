import { useState, useCallback } from 'react';

const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api` : 'http://localhost:8000/api');

export interface InitiatePaymentResponse {
  order_id?: number; // Optional: only present if order already created (legacy flow)
  payment_id: number; // Required: payment ID for polling until order is created
  payment: any; // raw gateway payload (may contain reference, redirect_url, etc.)
}

export interface PaymentStatusResponse {
  order: any;
  payments: any[];
}

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync current UI cart items to the backend before initiating payment
  const syncCart = async (items: Array<{ id: number; quantity: number; color_id?: number | null }>) => {
    try {
      const body = { items: items.map(i => ({ product_id: i.id, quantity: i.quantity, color_id: i.color_id })) };
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/cart/sync/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Falha ao sincronizar carrinho');
      const json = await res.json().catch(() => ({} as any));
      const warnings = Array.isArray(json?.warnings) ? json.warnings : [];
      console.log('🔄 Cart synced with server', warnings.length ? { warnings } : '');
      return { cart: json, warnings } as { cart: any; warnings: any[] };
    } catch (e) {
      console.warn('⚠️ Cart sync failed (continuing):', e);
      return { cart: null, warnings: [] };
    }
  };

  const getAuthHeaders = async () => {
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
    
    // Fallback: No user, no auth
    console.log('⚠️ No Firebase user found, proceeding without authentication for payment request.');
    return {} as Record<string, string>;
  };

  const initiatePayment = useCallback(async (method: 'mpesa' | 'emola' | 'card' | 'transfer' = 'mpesa', paymentData?: any): Promise<InitiatePaymentResponse> => {
    setLoading(true);
    setError(null);
    try {
      // Sync UI cart first if caller provided items
      let syncInfo: { cart: any; warnings: any[] } = { cart: null, warnings: [] };
      if (Array.isArray(paymentData?.items)) {
        syncInfo = await syncCart(paymentData.items);
      }
      // After sync, fetch server cart to ensure it has valid items and a non-zero total
      try {
        const authHeaders = await getAuthHeaders();
        const cartRes = await fetch(`${API_BASE_URL}/cart/`, { credentials: 'include', headers: { ...authHeaders }});
        if (cartRes.ok) {
          const cartJson = await cartRes.json();
          const items = Array.isArray(cartJson?.items) ? cartJson.items : [];
          const total = Number(cartJson?.total || 0);
          if (items.length === 0 || !isFinite(total) || total <= 0) {
            const err: any = new Error('Seu carrinho está vazio ou contém itens indisponíveis. Atualize os itens antes de pagar.');
            err.code = 'cart_empty_or_invalid';
            err.cart = cartJson;
            err.warnings = Array.isArray(syncInfo?.warnings) ? syncInfo.warnings : [];
            throw err;
          }
        }
      } catch (e) {
        // If we threw a structured error above, bubble it; otherwise continue
        if ((e as any)?.code === 'cart_empty_or_invalid') throw e;
      }
      
      const authHeaders = await getAuthHeaders();
      const url = `${API_BASE_URL}/cart/payments/initiate/`;
      console.log('💳 Initiating payment:', { method, url, headers: Object.keys(authHeaders) });
      
      const requestBody: any = {
        method,
        ...paymentData // Include method-specific data, addresses, shipping_method, items
      };
      // Never send client-side totals; let the server compute authoritative totals
      delete requestBody.amount;
      delete requestBody.shipping_amount;
      if (paymentData?.currency) requestBody.currency = paymentData.currency;
      
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
        if (data && data.error === 'amount_mismatch') {
          const err: any = new Error(data.message || 'O total no carrinho foi atualizado. Recarregue a página.');
          err.code = data.error;
          err.sent = data.sent;
          err.calculated = data.calculated;
          err.cart_total = data.cart_total;
          err.shipping = data.shipping;
          throw err;
        }
        if (data && data.error === 'Invalid amount') {
          const err: any = new Error('Seu carrinho está vazio ou contém itens indisponíveis. Atualize os itens antes de pagar.');
          err.code = 'cart_empty_or_invalid';
          throw err;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const json = await res.json().catch(() => null);
      // Backend sometimes wraps payload as { status, data }
      const payload = json && json.status && json.data ? json.data : json;

      // If gateway returned a checkout URL (external redirect), allow callers to handle it
      const checkoutUrl = payload?.payment?.checkout_url || payload?.payment?.redirect_url || payload?.payment?.payment_url;
      // Require payment_id (order_id is optional now - only created after payment confirmed)
      if ((payload == null || payload.payment_id == null) && !checkoutUrl) {
        const err: any = new Error('Resposta inválida do servidor: payment_id ausente');
        err.code = 'missing_payment_id';
        err.payload = payload;
        throw err;
      }

      return payload;
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
