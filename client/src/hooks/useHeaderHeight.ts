import { useState, useEffect } from 'react';

/**
 * Custom hook to track the header height dynamically
 * Returns the current header height which changes based on scroll position
 */
export function useHeaderHeight() {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    // Function to measure and update header height
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        setHeaderHeight(height);
      }
    };

    // Initial measurement
    updateHeaderHeight();

    // Create a ResizeObserver to watch for header size changes
    const header = document.querySelector('header');
    let resizeObserver: ResizeObserver | null = null;

    if (header && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect.height;
          setHeaderHeight(height);
        }
      });

      resizeObserver.observe(header);
    }

    // Fallback: listen to scroll events (in case ResizeObserver is not supported)
    const handleScroll = () => {
      updateHeaderHeight();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also listen to resize events
    window.addEventListener('resize', updateHeaderHeight, { passive: true });

    // Cleanup
    return () => {
      if (resizeObserver && header) {
        resizeObserver.unobserve(header);
        resizeObserver.disconnect();
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  return headerHeight;
}
