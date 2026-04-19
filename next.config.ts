import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.greenlog-prod.app https://clerk.greenlog.app https://*.clerk.accounts.dev; connect-src 'self' https://clerk.greenlog-prod.app https://clerk.greenlog.app https://*.clerk.accounts.dev https://uwjyvvvykyueuxtdkscs.supabase.co; img-src 'self' data: blob: https://*.clerk.com https://uwjyvvvykyueuxtdkscs.supabase.co https://www.leafly.com https://images.leafly.com https://pollinations.ai; worker-src 'self' blob:; frame-src https://*.clerk.com https://clerk.greenlog-prod.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['127.0.0.1'],
  outputFileTracingRoot: __dirname,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uwjyvvvykyueuxtdkscs.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.leafly.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.leafly.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pollinations.ai',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'greenlog.app',
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      'date-fns',
      'framer-motion',
    ],
  },
};

export default nextConfig;
