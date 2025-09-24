import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useFavorites, Favorite } from '@/hooks/useFavorites';

interface FavoritesContextType {
  favorites: Favorite[];
  loading: boolean;
  error: string | null;
  addToFavorites: (productId: number) => Promise<void>;
  removeFromFavorites: (productId: number) => Promise<void>;
  toggleFavorite: (productId: number) => Promise<void>;
  isFavorite: (productId: number) => boolean;
  refreshFavorites: () => Promise<void>;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const isAuthenticated = !!currentUser;
  const [localFavorites, setLocalFavorites] = useState<number[]>([]);
  
  const {
    favorites,
    loading,
    error,
    addToFavorites: apiAddToFavorites,
    removeFromFavorites: apiRemoveFromFavorites,
    toggleFavorite: apiToggleFavorite,
    isFavorite: apiIsFavorite,
    refreshFavorites,
  } = useFavorites();

  // Load local favorites from localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      const saved = localStorage.getItem('favorites');
      if (saved) {
        try {
          setLocalFavorites(JSON.parse(saved));
        } catch {
          setLocalFavorites([]);
        }
      }
    }
  }, [isAuthenticated]);

  // Save local favorites to localStorage
  const saveLocalFavorites = (favs: number[]) => {
    setLocalFavorites(favs);
    localStorage.setItem('favorites', JSON.stringify(favs));
  };

  // Add to favorites (local or API)
  const addToFavorites = async (productId: number) => {
    if (isAuthenticated) {
      await apiAddToFavorites(productId);
    } else {
      const updated = [...localFavorites.filter(id => id !== productId), productId];
      saveLocalFavorites(updated);
    }
  };

  // Remove from favorites (local or API)
  const removeFromFavorites = async (productId: number) => {
    if (isAuthenticated) {
      await apiRemoveFromFavorites(productId);
    } else {
      const updated = localFavorites.filter(id => id !== productId);
      saveLocalFavorites(updated);
    }
  };

  // Toggle favorite (local or API)
  const toggleFavorite = async (productId: number) => {
    if (isAuthenticated) {
      await apiToggleFavorite(productId);
    } else {
      if (localFavorites.includes(productId)) {
        await removeFromFavorites(productId);
      } else {
        await addToFavorites(productId);
      }
    }
  };

  // Check if product is favorite (local or API)
  const isFavorite = (productId: number): boolean => {
    if (isAuthenticated) {
      return apiIsFavorite(productId);
    } else {
      return localFavorites.includes(productId);
    }
  };

  // Get favorite count
  const favoriteCount = isAuthenticated 
    ? (Array.isArray(favorites) ? favorites.length : 0) 
    : (Array.isArray(localFavorites) ? localFavorites.length : 0);

  // Sync local favorites with server when user logs in
  useEffect(() => {
    if (isAuthenticated && localFavorites.length > 0) {
      // TODO: Implement sync logic to merge local favorites with server favorites
      // For now, we'll just clear local favorites after login
      setLocalFavorites([]);
      localStorage.removeItem('favorites');
    }
  }, [isAuthenticated, localFavorites]);

  const value: FavoritesContextType = {
    favorites,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    refreshFavorites,
    favoriteCount,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavoritesContext = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
};