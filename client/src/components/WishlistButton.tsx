'use client';

// ═══════════════════════════════════════════════════════════
// 📁 REMPLACER : src/components/WishlistButton.tsx
// 🎯 Utilise le Context - ZÉRO requête API au montage !
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useWishlist } from '@/contexts/WishlistContext';

interface WishlistButtonProps {
  listingId: string;
  initialSaved?: boolean;  // Ignoré maintenant, on utilise le Context
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onToggle?: (isSaved: boolean) => void;
}

export default function WishlistButton({
  listingId,
  className = '',
  size = 'md',
  showTooltip = true,
  onToggle
}: WishlistButtonProps) {
  const { state } = useApp();
  const router = useRouter();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltipText, setShowTooltipText] = useState(false);

  // ✅ INSTANTANÉ - Pas d'API call, juste une vérification dans le Set
  const isSaved = isInWishlist(listingId);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Vérifier l'authentification
    if (!state.user) {
      toast('Please login to save listings', {
        icon: '🔒',
        style: {
          background: '#FEF2F2',
          color: '#991B1B',
        },
      });
      router.push('/login');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      // ✅ UNE SEULE requête API pour toggle
      const newSavedState = await toggleWishlist(listingId);

      // Callback si fourni
      if (onToggle) {
        onToggle(newSavedState);
      }

      // Toast de confirmation
      toast.success(
        newSavedState
          ? 'Added to wishlist'
          : 'Removed from wishlist',
        {
          icon: newSavedState ? '❤️' : '💔',
          duration: 2000,
        }
      );
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        toast.error('Failed to update wishlist');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-10 h-10';
    }
  };

  const getHeartSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggleWishlist}
        onMouseEnter={() => setShowTooltipText(true)}
        onMouseLeave={() => setShowTooltipText(false)}
        disabled={isLoading}
        className={`
          ${getSizeClasses()}
          bg-white/95 backdrop-blur-sm rounded-full
          flex items-center justify-center shadow-sm
          hover:scale-110 transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`
            ${getHeartSize()}
            transition-all duration-200
            ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-700 hover:text-red-500'}
            ${isLoading ? 'animate-pulse' : ''}
          `}
        />
      </button>

      {/* Tooltip */}
      {showTooltip && showTooltipText && !isLoading && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap pointer-events-none z-10">
          {isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}