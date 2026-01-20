import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import '../styles/variables.css'
import '../utils/consoleFilter' // Filter third-party extension errors in development
import { AppProvider } from '@/contexts/AppContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { GoogleMapsProvider } from '@/contexts/GoogleMapsContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { WishlistProvider } from '@/contexts/WishlistContext' // ✅ NOUVEAU
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext' // ✅ Feature Flags
import LayoutContent from '@/components/LayoutContent'

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
            <GoogleMapsProvider>
              <WishlistProvider>
                <LayoutContent>{children}</LayoutContent>
              </WishlistProvider>
            </GoogleMapsProvider>
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
      <body className={inter.className} suppressHydrationWarning>
        <div id="root">
          <ClientLayout>{children}</ClientLayout>
        </div>
      </body>
    </html>
  )
}