import type { NextConfig } from "next";

type SentryWrapper = (config: NextConfig, options?: Record<string, unknown>) => NextConfig;

const withSentryConfig: SentryWrapper = (() => {
  try {
    // Keep build resilient when Sentry package is not installed in this branch.
    const sentry = require("@sentry/nextjs");
    if (typeof sentry?.withSentryConfig === "function") {
      return sentry.withSentryConfig as SentryWrapper;
    }
  } catch {
    // No-op fallback when @sentry/nextjs is unavailable.
  }

  return (config: NextConfig) => config;
})();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.greenlog-prod.app https://clerk.greenlog.app https://*.clerk.accounts.dev; connect-src 'self' https://clerk.greenlog-prod.app https://clerk.greenlog.app https://*.clerk.accounts.dev https://uwjyvvvykyueuxtdkscs.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io http://31.97.77.89:9000; img-src 'self' data: blob: https://*.clerk.com https://uwjyvvvykyueuxtdkscs.supabase.co https://www.leafly.com https://images.leafly.com https://leafly-public.imgix.net https://pollinations.ai http://31.97.77.89:9000; worker-src 'self' blob:; frame-src https://*.clerk.com https://clerk.greenlog-prod.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
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
        hostname: 'leafly-public.imgix.net',
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
