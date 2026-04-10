import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// WARNING: Sentry instrumentation causes NFT manifest errors with Vercel builds.
// Disabling all instrumentation until upstream conflict is resolved.
const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  typescript: {
    ignoreBuildErrors: true,
  },
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

// Minimal Sentry config — no instrumentation to avoid NFT manifest conflicts
const sentryOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: true,
  },
  webpack: (config: any) => {
    // Remove all Sentry webpack plugins to prevent NFT manifest generation errors
    config.plugins = config.plugins.filter(
      (plugin: any) =>
        !plugin ||
        (plugin.constructor && plugin.constructor.name !== 'SentryPlugin' &&
         plugin.constructor.name !== 'DefaultWebpackSentryPlugin')
    );
    return config;
  },
};

export default withSentryConfig(nextConfig, sentryOptions);
