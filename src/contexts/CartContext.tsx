import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { formatPrice } from '@/lib/formatPrice';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Types
export interface CartItem {
  id: number;            // product id
  name: string;
  slug?: string;
  price: number;         // unit price (current)
  original_price?: number | null;
  quantity: number;
  image?: string | null;
  category?: string | null;
  color_id?: number | null;
  color_name?: string | null;
  max_quantity?: number; // stock available (optional)
}

interface CartState {
  items: CartItem[];
  updatedAt: number | null;
}

type Action =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: number; color_id?: number | null } }
  | { type: 'UPDATE_QTY'; payload: { id: number; quantity: number; color_id?: number | null } }
  | { type: 'SET_QTY'; payload: { id: number; quantity: number; color_id?: number | null } }
  | { type: 'CLEAR' }
  | { type: 'SET'; payload: CartState }
  | { type: 'MERGE'; payload: CartItem[] };

const STORAGE_KEY_ANON = 'chiva_cart_v1';
const STORAGE_KEY_USER = 'chiva_cart_user_';

const initialState: CartState = {
  items: [],
  updatedAt: null,
};

function cartReducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        i => i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null)
      );
      let newItems = [...state.items];
      if (existingIndex >= 0) {
        const existing = newItems[existingIndex];
        const newQty = existing.quantity + action.payload.quantity;
        newItems[existingIndex] = {
          ...existing,
            quantity: existing.max_quantity ? Math.min(newQty, existing.max_quantity) : newQty,
        };
      } else {
        newItems.push(action.payload);
      }
      return { items: newItems, updatedAt: Date.now() };
    }
    case 'REMOVE_ITEM': {
      return {
        items: state.items.filter(i => !(i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null))),
        updatedAt: Date.now(),
      };
    }
    case 'UPDATE_QTY': {
      const newItems = state.items.map(i => {
        if (i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null)) {
          let q = action.payload.quantity;
          if (q < 1) q = 1;
          if (i.max_quantity) q = Math.min(q, i.max_quantity);
          return { ...i, quantity: q };
        }
        return i;
      });
      return { items: newItems, updatedAt: Date.now() };
    }
    case 'SET_QTY': {
      const newItems = state.items.map(i => {
        if (i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null)) {
          let q = action.payload.quantity;
          if (q < 1) q = 1;
          if (i.max_quantity) q = Math.min(q, i.max_quantity);
          return { ...i, quantity: q };
        }
        return i;
      });
      return { items: newItems, updatedAt: Date.now() };
    }
    case 'MERGE': {
      // Merge items from payload with existing items
      const merged = [...state.items];
      for (const newItem of action.payload) {
        const existingIndex = merged.findIndex(
          i => i.id === newItem.id && (i.color_id || null) === (newItem.color_id || null)
        );
        if (existingIndex >= 0) {
          const existing = merged[existingIndex];
          const totalQty = existing.quantity + newItem.quantity;
          merged[existingIndex] = {
            ...existing,
            quantity: existing.max_quantity ? Math.min(totalQty, existing.max_quantity) : totalQty,
          };
        } else {
          merged.push(newItem);
        }
      }
      return { items: merged, updatedAt: Date.now() };
    }
    case 'CLEAR':
      return { items: [], updatedAt: Date.now() };
    case 'SET':
      return action.payload;
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;          // number of distinct items
  totalQuantity: number;      // sum of quantities
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: number, color_id?: number | null) => void;
  updateQuantity: (id: number, quantity: number, color_id?: number | null) => void;
  setQuantity: (id: number, quantity: number, color_id?: number | null) => void; // exact set (for "Buy Now")
  clearCart: () => void;
  formatSubtotal: () => string;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { currentUser } = useAuth();

  // Helper to get storage key based on user
  const getStorageKey = (userId?: string) => {
    return userId ? `${STORAGE_KEY_USER}${userId}` : STORAGE_KEY_ANON;
  };

  // Load persisted cart on mount
  useEffect(() => {
    try {
      const key = getStorageKey(currentUser?.uid);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: CartState = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          dispatch({ type: 'SET', payload: parsed });
        }
      }
    } catch (e) {
      console.warn('Falha ao carregar carrinho', e);
    }
  }, []); // Only on mount

  // Handle user login/logout - merge carts
  useEffect(() => {
    if (currentUser?.uid) {
      // User just logged in, merge anonymous cart with user cart
      try {
        const anonRaw = localStorage.getItem(STORAGE_KEY_ANON);
        const userRaw = localStorage.getItem(getStorageKey(currentUser.uid));
        
        const anonCart: CartState = anonRaw ? JSON.parse(anonRaw) : { items: [], updatedAt: null };
        const userCart: CartState = userRaw ? JSON.parse(userRaw) : { items: [], updatedAt: null };
        
        if (anonCart.items.length > 0) {
          // Merge anonymous cart into user cart
          dispatch({ type: 'SET', payload: userCart });
          dispatch({ type: 'MERGE', payload: anonCart.items });
          
          // Clear anonymous cart
          localStorage.removeItem(STORAGE_KEY_ANON);
          
          if (anonCart.items.length > 0) {
            toast({
              title: 'Carrinho sincronizado',
              description: `${anonCart.items.length} item(s) foram mesclados com sua conta.`,
            });
          }
        } else {
          // Just load user cart
          dispatch({ type: 'SET', payload: userCart });
        }
      } catch (e) {
        console.warn('Falha ao sincronizar carrinho', e);
      }
    }
  }, [currentUser?.uid]);

  // Persist changes
  useEffect(() => {
    try {
      const key = getStorageKey(currentUser?.uid);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn('Falha ao salvar carrinho', e);
    }
  }, [state, currentUser?.uid]);

  const value: CartContextValue = useMemo(() => {
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items: state.items,
      itemCount: state.items.length,
      totalQuantity: state.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      addItem: (item) => {
        const quantity = item.quantity ?? 1;
        const newItem = { ...item, quantity };
        
        // Check stock limit
        if (newItem.max_quantity && quantity > newItem.max_quantity) {
          toast({
            title: 'Estoque insuficiente',
            description: `Apenas ${newItem.max_quantity} unidades disponíveis.`,
            variant: 'destructive',
          });
          return;
        }
        
        dispatch({ type: 'ADD_ITEM', payload: newItem });
      },
      removeItem: (id, color_id) => dispatch({ type: 'REMOVE_ITEM', payload: { id, color_id } }),
      updateQuantity: (id, quantity, color_id) => {
        const item = state.items.find(i => i.id === id && (i.color_id || null) === (color_id || null));
        if (item?.max_quantity && quantity > item.max_quantity) {
          toast({
            title: 'Quantidade máxima atingida',
            description: `Apenas ${item.max_quantity} unidades em estoque.`,
            variant: 'destructive',
          });
          return;
        }
        dispatch({ type: 'UPDATE_QTY', payload: { id, quantity, color_id } });
      },
      setQuantity: (id, quantity, color_id) => {
        const item = state.items.find(i => i.id === id && (i.color_id || null) === (color_id || null));
        if (item?.max_quantity && quantity > item.max_quantity) {
          toast({
            title: 'Estoque insuficiente',
            description: `Apenas ${item.max_quantity} unidades disponíveis.`,
            variant: 'destructive',
          });
          return;
        }
        dispatch({ type: 'SET_QTY', payload: { id, quantity, color_id } });
      },
      clearCart: () => dispatch({ type: 'CLEAR' }),
      formatSubtotal: () => formatPrice(subtotal),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart deve ser usado dentro de CartProvider');
  }
  return ctx;
}

export default CartContext;