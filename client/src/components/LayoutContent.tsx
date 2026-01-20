'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import HeaderWrapper from './HeaderWrapper';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const [headerHeight, setHeaderHeight] = React.useState(0);
  const pathname = usePathname();

  // ✅ Hide footer on search page (Airbnb-style)
  const hideFooter = pathname === '/search';

  React.useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.getBoundingClientRect().height);
      }
    };

    updateHeaderHeight();

    const header = document.querySelector('header');
    let resizeObserver: ResizeObserver | null = null;

    if (header && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateHeaderHeight();
      });
      resizeObserver.observe(header);
    }

    const handleScroll = () => updateHeaderHeight();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateHeaderHeight, { passive: true });

    return () => {
      if (resizeObserver && header) {
        resizeObserver.unobserve(header);
        resizeObserver.disconnect();
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  return (
    <>
      <HeaderWrapper />
      <main
        className={`transition-all duration-300 ${hideFooter ? '' : ''}`}
        style={{
          paddingTop: hideFooter ? '0' : (headerHeight ? `${headerHeight}px` : '96px')
        }}
      >
        {children}
      </main>
      {!hideFooter && <Footer />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        }}
      />
    </>
  );
}
