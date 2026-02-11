/** @type {import('next').NextConfig} */

// Bundle analyzer - run: ANALYZE=true npm run build
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const isProd = process.env.NODE_ENV === 'production';
const BACKEND_URL = isProd ? 'https://baytup.fr' : 'http://localhost:5000';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      ...(!isProd ? [{
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      }] : []),
      {
        protocol: 'https',
        hostname: 'baytup.fr',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Image optimization enabled for production (removed unoptimized: true)
    minimumCacheTTL: 86400, // 24 hours cache
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  i18n: {
    locales: ['en', 'fr', 'ar'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_UPLOADS_URL: process.env.NEXT_PUBLIC_UPLOADS_URL,
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ]
  },
  // Fix webpack 5 issues and static file serving
  webpack: (config, { isServer }) => {
    // Fix for webpack 5 issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    // Fix for missing modules
    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    });
    return config;
  },
  // Ensure proper type checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // Ensure proper linting
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcrypt'],
  },
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable compression
  compress: true,
  // Generate unique build ID
  generateBuildId: async () => {
    return 'baytup-build-' + Date.now();
  },
  // Optimize for production
  productionBrowserSourceMaps: false,
}

module.exports = withBundleAnalyzer(nextConfig)