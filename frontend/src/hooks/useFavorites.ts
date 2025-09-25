import { useState, useEffect } from 'react';
import { toast } from './use-toast';
import { auth } from '@/lib/firebase';

export interface Favorite {
  id: number;
  product: {
    id: number;
    name: string;
    slug: string;
    price: string;
    original_price?: string;
    main_image_url?: string;
    brand: string;
    category_name: string;
    is_in_stock: boolean;
  };
  created_at: string;
}

const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api` : 'http://localhost:8000/api');

// Helper function to get auth headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return {
        ...headers,
        'Authorization': `Bearer ${token}`,
      };
    }
  } catch (error) {
    console.warn('Could not get Firebase token:', error);
  }
  
  return headers;
};

const favoritesApi = {
  // Get user favorites
  getFavorites: async (): Promise<Favorite[]> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/favorites/`, {
      credentials: 'include',
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch favorites');
    }
    
    const data = await response.json();
    // API returns paginated results, extract the results array
    return Array.isArray(data) ? data : (data.results || []);
  },

  // Add product to favorites
  addFavorite: async (productId: number): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/favorites/toggle/${productId}/`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add favorite');
    }
    
    return response.json();
  },

  // Remove product from favorites
  removeFavorite: async (productId: number): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/favorites/toggle/${productId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove favorite');
    }
    
    return response.json();
  },

  // Check if product is favorited
  checkFavorite: async (productId: number): Promise<{ is_favorite: boolean }> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/favorites/check/${productId}/`, {
      credentials: 'include',
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to check favorite status');
    }
    
    return response.json();
  },
};

// Hook for managing favorites
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const favoritesData = await favoritesApi.getFavorites();
      // Ensure we always have an array
      setFavorites(Array.isArray(favoritesData) ? favoritesData : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch favorites';
      setError(errorMessage);
      // Set empty array on error
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (productId: number) => {
    try {
      await favoritesApi.addFavorite(productId);
      await fetchFavorites(); // Refresh favorites list
      toast({
        title: 'Adicionado aos favoritos',
        description: 'Produto adicionado à sua lista de favoritos.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add favorite';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const removeFromFavorites = async (productId: number) => {
    try {
      await favoritesApi.removeFavorite(productId);
      await fetchFavorites(); // Refresh favorites list
      toast({
        title: 'Removido dos favoritos',
        description: 'Produto removido da sua lista de favoritos.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove favorite';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const isFavorite = (productId: number): boolean => {
    return Array.isArray(favorites) && favorites.some(fav => fav.product.id === productId);
  };

  const toggleFavorite = async (productId: number) => {
    if (isFavorite(productId)) {
      await removeFromFavorites(productId);
    } else {
      await addToFavorites(productId);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  return {
    favorites,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    refreshFavorites: fetchFavorites,
  };
};

// Hook for checking individual product favorite status
export const useFavoriteStatus = (productId?: number) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = async (id: number) => {
    try {
      setLoading(true);
      const result = await favoritesApi.checkFavorite(id);
      setIsFavorite(result.is_favorite);
    } catch (err) {
      console.error('Failed to check favorite status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      checkStatus(productId);
    }
  }, [productId]);

  return {
    isFavorite,
    loading,
    refreshStatus: () => productId && checkStatus(productId),
  };
};