/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable strict type checking
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during builds
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost'],
  },
  // Improve chunk loading and cross-browser compatibility
  experimental: {
    // Remove optimizeCss temporarily due to critters module issue
  },
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Improve static asset handling
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  // Better browser support
  swcMinify: true,
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Improve performance and compatibility
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Better caching for static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;