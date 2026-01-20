import { useState, useEffect, useCallback } from 'react';
import { useThrottledCallback } from './useDebounce';

interface ScrollState {
  scrollY: number;
  scrollDirection: 'up' | 'down' | 'idle';
  isAtTop: boolean;
  hasScrolled: boolean;
}

export function useScrollDirection(threshold = 10) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollY: 0,
    scrollDirection: 'idle',
    isAtTop: true,
    hasScrolled: false
  });

  const updateScrollState = useCallback((newScrollY: number) => {
    setScrollState(prev => {
      const direction = newScrollY > prev.scrollY ? 'down' :
                      newScrollY < prev.scrollY ? 'up' : 'idle';

      return {
        scrollY: newScrollY,
        scrollDirection: Math.abs(newScrollY - prev.scrollY) > threshold ? direction : prev.scrollDirection,
        isAtTop: newScrollY < 10,
        hasScrolled: newScrollY > 0
      };
    });
  }, [threshold]);

  const throttledUpdateScrollState = useThrottledCallback(updateScrollState, 16); // ~60fps

  useEffect(() => {
    const handleScroll = () => {
      throttledUpdateScrollState(window.scrollY);
    };

    // Set initial state
    updateScrollState(window.scrollY);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [throttledUpdateScrollState, updateScrollState]);

  return scrollState;
}