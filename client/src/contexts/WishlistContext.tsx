'use client';

// ═══════════════════════════════════════════════════════════
// 📁 NOUVEAU FICHIER : src/contexts/WishlistContext.tsx
// 🎯 Charge TOUS les favoris en UNE SEULE requête
// ═══════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

interface WishlistContextType {
  wishlistIds: Set<string>;
  isLoading: boolean;
  addToWishlist: (listingId: string) => Promise<boolean>;
  removeFromWishlist: (listingId: string) => Promise<boolean>;
  toggleWishlist: (listingId: string) => Promise<boolean>;
  isInWishlist: (listingId: string) => boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier l'authentification au montage
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // 🚀 BATCH LOADING : Charger TOUS les favoris en UNE SEULE requête
  const loadWishlist = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsLoading(false);
      setWishlistIds(new Set());
      return;
    }

    try {
      // Votre API actuelle pour obtenir la wishlist complète
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success' && response.data.data) {
        // Extraire tous les IDs des listings
        const ids = new Set<string>(
          response.data.data.map((item: any) => 
            item.listing?._id || item.listing || item._id
          ).filter(Boolean)
        );
        
        setWishlistIds(ids);
        console.log(`✅ Wishlist loaded: ${ids.size} items`);
      } else {
        setWishlistIds(new Set());
      }
    } catch (error: any) {
      console.error('Error loading wishlist:', error);

      // Don't remove token here - only AppContext should manage auth token lifecycle
      // Just clear wishlist data on error
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
      }

      setWishlistIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger au montage et quand l'authentification change
  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist();
    } else {
      setWishlistIds(new Set());
      setIsLoading(false);
    }
  }, [isAuthenticated, loadWishlist]);

  // Ajouter aux favoris
  const addToWishlist = async (listingId: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
        { listingId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mise à jour optimiste
      setWishlistIds(prev => {
        const newSet = new Set(prev);
        newSet.add(listingId);
        return newSet;
      });
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  };

  // Retirer des favoris
  const removeFromWishlist = async (listingId: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists/${listingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mise à jour optimiste
      setWishlistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  };

  // Toggle (utilise votre endpoint existant)
  const toggleWishlist = async (listingId: string): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const wasInWishlist = wishlistIds.has(listingId);

    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists/${listingId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        const isSaved = response.data.data.isSaved;
        
        // Mise à jour optimiste
        setWishlistIds(prev => {
          const newSet = new Set(prev);
          if (isSaved) {
            newSet.add(listingId);
          } else {
            newSet.delete(listingId);
          }
          return newSet;
        });

        return isSaved;
      }
      
      return !wasInWishlist;
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return wasInWishlist;
    }
  };

  // Vérifier si dans les favoris (INSTANTANÉ, pas d'API call)
  const isInWishlist = (listingId: string): boolean => {
    return wishlistIds.has(listingId);
  };

  // Rafraîchir la liste
  const refreshWishlist = async () => {
    setIsLoading(true);
    await loadWishlist();
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        isLoading,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        refreshWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}