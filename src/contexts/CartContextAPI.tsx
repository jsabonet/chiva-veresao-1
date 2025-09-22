import React, { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from 'react';
import { formatPrice } from '@/lib/formatPrice';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useCartAPI, Cart as APICart, CartItem as APICartItem } from '@/hooks/useCartAPI';

// Enhanced types that work with both local and server cart
export interface CartItem {
  id: number;            // product id for local, cart item id for server
  product_id?: number;   // actual product id when using server
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
  total_price?: number;  // for server cart items
}

interface CartState {
  items: CartItem[];
  updatedAt: number | null;
  // Server cart data
  server_cart?: APICart;
  subtotal?: number;
  discount_amount?: number;
  total?: number;
  applied_coupon_code?: string;
  synced_with_server: boolean;
}

type Action =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: number; color_id?: number | null } }
  | { type: 'UPDATE_QTY'; payload: { id: number; quantity: number; color_id?: number | null } }
  | { type: 'SET_QTY'; payload: { id: number; quantity: number; color_id?: number | null } }
  | { type: 'CLEAR' }
  | { type: 'SET'; payload: Partial<CartState> }
  | { type: 'MERGE'; payload: CartItem[] }
  | { type: 'SYNC_SERVER'; payload: APICart }
  | { type: 'SET_COUPON'; payload: { code: string; discount_amount: number } }
  | { type: 'REMOVE_COUPON' };

interface CartContextValue {
  // Local cart data (for compatibility)
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  
  // Enhanced server cart data
  server_cart?: APICart;
  discount_amount: number;
  total: number;
  applied_coupon_code?: string;
  synced_with_server: boolean;
  loading: boolean;
  
  // Actions
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: number, color_id?: number | null) => Promise<void>;
  updateQuantity: (id: number, quantity: number, color_id?: number | null) => Promise<void>;
  setQuantity: (id: number, quantity: number, color_id?: number | null) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Server-specific actions
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  
  // Formatting helpers
  formatSubtotal: () => string;
  formatTotal: () => string;
  formatDiscount: () => string;
}

const STORAGE_KEY_ANON = 'chiva_cart_v1';
const STORAGE_KEY_USER = 'chiva_cart_user_';

const initialState: CartState = {
  items: [],
  updatedAt: null,
  subtotal: 0,
  discount_amount: 0,
  total: 0,
  synced_with_server: false,
};

function cartReducer(state: CartState, action: Action): CartState {
  const now = Date.now();
  
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        i => i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null)
      );
      let newItems = [...state.items];
      
      if (existingIndex >= 0) {
        const existing = newItems[existingIndex];
        newItems[existingIndex] = {
          ...existing,
          quantity: existing.quantity + (action.payload.quantity || 1),
        };
      } else {
        newItems.push({ ...action.payload, quantity: action.payload.quantity || 1 });
      }
      
      return {
        ...state,
        items: newItems,
        updatedAt: now,
        synced_with_server: false, // Mark as needing sync
      };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(
        i => !(i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null))
      );
      return {
        ...state,
        items: newItems,
        updatedAt: now,
        synced_with_server: false,
      };
    }
    
    case 'UPDATE_QTY':
    case 'SET_QTY': {
      const newItems = state.items.map(i => {
        if (i.id === action.payload.id && (i.color_id || null) === (action.payload.color_id || null)) {
          const newQuantity = action.type === 'UPDATE_QTY' 
            ? i.quantity + action.payload.quantity 
            : action.payload.quantity;
          return { ...i, quantity: Math.max(0, newQuantity) };
        }
        return i;
      }).filter(i => i.quantity > 0);
      
      return {
        ...state,
        items: newItems,
        updatedAt: now,
        synced_with_server: false,
      };
    }
    
    case 'CLEAR': {
      return {
        ...initialState,
        updatedAt: now,
      };
    }
    
    case 'SET': {
      return {
        ...state,
        ...action.payload,
        updatedAt: now,
      };
    }
    
    case 'MERGE': {
      // Merge items from server with local items
      const mergedItems = [...state.items];
      
      action.payload.forEach(serverItem => {
        const existingIndex = mergedItems.findIndex(
          i => i.id === serverItem.id && (i.color_id || null) === (serverItem.color_id || null)
        );
        
        if (existingIndex >= 0) {
          mergedItems[existingIndex].quantity += serverItem.quantity;
        } else {
          mergedItems.push(serverItem);
        }
      });
      
      return {
        ...state,
        items: mergedItems,
        updatedAt: now,
        synced_with_server: false,
      };
    }
    
    case 'SYNC_SERVER': {
      // Convert server cart items to local format
      const localItems: CartItem[] = action.payload.items.map(serverItem => ({
        id: serverItem.product.id, // Use product ID for local compatibility
        product_id: serverItem.product.id,
        name: serverItem.product.name,
        slug: serverItem.product.slug,
        price: serverItem.product.price,
        quantity: serverItem.quantity,
        image: serverItem.product.image,
        color_id: serverItem.color?.id || null,
        color_name: serverItem.color?.name || null,
        max_quantity: serverItem.product.stock,
        total_price: serverItem.total_price,
      }));
      
      return {
        ...state,
        items: localItems,
        server_cart: action.payload,
        subtotal: action.payload.subtotal,
        discount_amount: action.payload.discount_amount,
        total: action.payload.total,
        applied_coupon_code: action.payload.applied_coupon_code,
        synced_with_server: true,
        updatedAt: now,
      };
    }
    
    case 'SET_COUPON': {
      return {
        ...state,
        applied_coupon_code: action.payload.code,
        discount_amount: action.payload.discount_amount,
        total: (state.subtotal || 0) - action.payload.discount_amount,
        updatedAt: now,
      };
    }
    
    case 'REMOVE_COUPON': {
      return {
        ...state,
        applied_coupon_code: undefined,
        discount_amount: 0,
        total: state.subtotal || 0,
        updatedAt: now,
      };
    }
    
    default:
      return state;
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { currentUser } = useAuth();
  const cartAPI = useCartAPI();

  const getStorageKey = (uid?: string) => uid ? `${STORAGE_KEY_USER}${uid}` : STORAGE_KEY_ANON;

  // Load cart from localStorage on mount and user change
  useEffect(() => {
    const loadCart = async () => {
      try {
        const key = getStorageKey(currentUser?.uid);
        const stored = localStorage.getItem(key);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          dispatch({ type: 'SET', payload: parsed });
        }

        // If user is authenticated, sync with server
        if (currentUser) {
          try {
            const serverCart = await cartAPI.getCart();
            dispatch({ type: 'SYNC_SERVER', payload: serverCart });
          } catch (error) {
            console.warn('Failed to sync with server cart:', error);
          }
        }
      } catch (e) {
        console.warn('Failed to load cart:', e);
      }
    };

    loadCart();
  }, [currentUser?.uid, cartAPI]);

  // Persist changes to localStorage
  useEffect(() => {
    try {
      const key = getStorageKey(currentUser?.uid);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save cart:', e);
    }
  }, [state, currentUser?.uid]);

  // Sync with server when user logs in
  const syncWithServer = useCallback(async () => {
    if (!currentUser || state.synced_with_server) return;

    try {
      // Prepare local cart data for merge
      const localCartData = state.items.map(item => ({
        product_id: item.product_id || item.id,
        quantity: item.quantity,
        color_id: item.color_id,
      }));

      if (localCartData.length > 0) {
        const mergedCart = await cartAPI.mergeCart(localCartData);
        dispatch({ type: 'SYNC_SERVER', payload: mergedCart });
      } else {
        const serverCart = await cartAPI.getCart();
        dispatch({ type: 'SYNC_SERVER', payload: serverCart });
      }
    } catch (error) {
      console.warn('Failed to sync with server:', error);
    }
  }, [currentUser, state.synced_with_server, state.items, cartAPI]);

  // Enhanced actions that work with server
  const addItem = useCallback(async (item: CartItem) => {
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
    
    // Add locally first for immediate feedback
    dispatch({ type: 'ADD_ITEM', payload: newItem });
    
    // Sync with server if user is authenticated
    if (currentUser) {
      try {
        const updatedCart = await cartAPI.addToCart(
          newItem.product_id || newItem.id,
          quantity,
          newItem.color_id || undefined
        );
        dispatch({ type: 'SYNC_SERVER', payload: updatedCart });
      } catch (error) {
        // Revert local change on server error
        dispatch({ type: 'REMOVE_ITEM', payload: { id: newItem.id, color_id: newItem.color_id } });
        console.error('Failed to add item to server cart:', error);
      }
    }
  }, [currentUser, cartAPI]);

  const removeItem = useCallback(async (id: number, color_id?: number | null) => {
    // Remove locally first
    dispatch({ type: 'REMOVE_ITEM', payload: { id, color_id } });
    
    // Sync with server if user is authenticated
    if (currentUser && state.server_cart) {
      try {
        const cartItem = state.server_cart.items.find(
          item => item.product.id === id && (item.color?.id || null) === (color_id || null)
        );
        
        if (cartItem) {
          const updatedCart = await cartAPI.removeFromCart(cartItem.id);
          dispatch({ type: 'SYNC_SERVER', payload: updatedCart });
        }
      } catch (error) {
        console.error('Failed to remove item from server cart:', error);
      }
    }
  }, [currentUser, state.server_cart, cartAPI]);

  const updateQuantity = useCallback(async (id: number, quantity: number, color_id?: number | null) => {
    const item = state.items.find(i => i.id === id && (i.color_id || null) === (color_id || null));
    if (item?.max_quantity && item.quantity + quantity > item.max_quantity) {
      toast({
        title: 'Quantidade máxima atingida',
        description: `Apenas ${item.max_quantity} unidades em estoque.`,
        variant: 'destructive',
      });
      return;
    }
    
    dispatch({ type: 'UPDATE_QTY', payload: { id, quantity, color_id } });
    
    // Sync with server if authenticated
    if (currentUser && state.server_cart) {
      try {
        const cartItem = state.server_cart.items.find(
          item => item.product.id === id && (item.color?.id || null) === (color_id || null)
        );
        
        if (cartItem) {
          const newQuantity = cartItem.quantity + quantity;
          const updatedCart = await cartAPI.updateCartItem(cartItem.id, newQuantity);
          dispatch({ type: 'SYNC_SERVER', payload: updatedCart });
        }
      } catch (error) {
        console.error('Failed to update item in server cart:', error);
      }
    }
  }, [currentUser, state.items, state.server_cart, cartAPI]);

  const setQuantity = useCallback(async (id: number, quantity: number, color_id?: number | null) => {
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
    
    // Sync with server if authenticated
    if (currentUser && state.server_cart) {
      try {
        const cartItem = state.server_cart.items.find(
          item => item.product.id === id && (item.color?.id || null) === (color_id || null)
        );
        
        if (cartItem) {
          const updatedCart = await cartAPI.updateCartItem(cartItem.id, quantity);
          dispatch({ type: 'SYNC_SERVER', payload: updatedCart });
        }
      } catch (error) {
        console.error('Failed to set item quantity in server cart:', error);
      }
    }
  }, [currentUser, state.items, state.server_cart, cartAPI]);

  const clearCart = useCallback(async () => {
    dispatch({ type: 'CLEAR' });
    
    if (currentUser) {
      try {
        await cartAPI.clearCart();
      } catch (error) {
        console.error('Failed to clear server cart:', error);
      }
    }
  }, [currentUser, cartAPI]);

  const applyCoupon = useCallback(async (code: string) => {
    if (!currentUser) {
      toast({
        title: 'Login necessário',
        description: 'Você precisa estar logado para usar cupons.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const result = await cartAPI.applyCoupon(code);
      dispatch({ type: 'SYNC_SERVER', payload: result.cart });
    } catch (error) {
      console.error('Failed to apply coupon:', error);
    }
  }, [currentUser, cartAPI]);

  const removeCoupon = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const updatedCart = await cartAPI.removeCoupon();
      dispatch({ type: 'SYNC_SERVER', payload: updatedCart });
    } catch (error) {
      console.error('Failed to remove coupon:', error);
    }
  }, [currentUser, cartAPI]);

  const value: CartContextValue = useMemo(() => {
    const localSubtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const subtotal = state.synced_with_server ? (state.subtotal || 0) : localSubtotal;
    const discount_amount = state.discount_amount || 0;
    const total = state.synced_with_server ? (state.total || 0) : subtotal;
    
    return {
      items: state.items,
      itemCount: state.items.length,
      totalQuantity: state.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      server_cart: state.server_cart,
      discount_amount,
      total,
      applied_coupon_code: state.applied_coupon_code,
      synced_with_server: state.synced_with_server,
      loading: cartAPI.loading,
      
      addItem,
      removeItem,
      updateQuantity,
      setQuantity,
      clearCart,
      applyCoupon,
      removeCoupon,
      syncWithServer,
      
      formatSubtotal: () => formatPrice(subtotal),
      formatTotal: () => formatPrice(total),
      formatDiscount: () => formatPrice(discount_amount),
    };
  }, [
    state, 
    cartAPI.loading,
    addItem,
    removeItem, 
    updateQuantity, 
    setQuantity, 
    clearCart,
    applyCoupon,
    removeCoupon,
    syncWithServer
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}

export default CartContext;