import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import '../styles/globals.css'
import '../styles/variables.css'
import 'leaflet/dist/leaflet.css' // ✅ Leaflet CSS - 100% FREE Maps
import '../utils/consoleFilter' // Filter third-party extension errors in development
import { AppProvider } from '@/contexts/AppContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext' // ✅ Feature Flags
import LayoutContent from '@/components/LayoutContent'

const GTM_ID = 'GTM-KJX6VTC9';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Baytup - Algerian Rental Marketplace',
  description: 'Find and rent properties, vehicles, and more in Algeria',
  keywords: 'Algeria, rental, marketplace, properties, vehicles, Baytup',
  authors: [{ name: 'Baytup Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Baytup - Algerian Rental Marketplace',
    description: 'Find and rent properties, vehicles, and more in Algeria',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName: 'Baytup',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AppProvider>
        <FeatureFlagsProvider> {/* ✅ Feature flags disponibles dès le début */}
          <SocketProvider>
            <WishlistProvider>
              <LayoutContent>{children}</LayoutContent>
            </WishlistProvider>
          </SocketProvider>
        </FeatureFlagsProvider>
      </AppProvider>
    </LanguageProvider>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <div id="root">
          <ClientLayout>{children}</ClientLayout>
        </div>
      </body>
    </html>
  )
}