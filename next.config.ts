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

function parseOrigin(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return null;
    }
  }
}

const siteOrigin = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);
const vercelOrigin = parseOrigin(process.env.VERCEL_URL);
const minioOrigin = parseOrigin(process.env.MINIO_ENDPOINT);

const connectSrc = [
  "'self'",
  "https://uwjyvvvykyueuxtdkscs.supabase.co",
  "https://*.ingest.sentry.io",
  "https://*.ingest.us.sentry.io",
  "https://greenlog.app",
  "https://*.greenlog.app",
  "https://green-log-two.vercel.app",
  "https://*.vercel.app",
  siteOrigin,
  vercelOrigin,
  minioOrigin,
].filter(Boolean);

const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  "https://uwjyvvvykyueuxtdkscs.supabase.co",
  "https://www.leafly.com",
  "https://images.leafly.com",
  "https://leafly-public.imgix.net",
  "https://allbud.com",
  "https://www.allbud.com",
  "https://pollinations.ai",
  "https://greenlog.app",
  "https://*.greenlog.app",
  "https://green-log-two.vercel.app",
  "https://*.vercel.app",
  "https://storage.cannalog.fun", // TODO: remove after confirming all DB URLs migrated to /media/ paths
  siteOrigin,
  vercelOrigin,
  minioOrigin,
].filter(Boolean);

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  `connect-src ${connectSrc.join(" ")}`,
  `img-src ${imgSrc.join(" ")}`,
  "worker-src 'self' blob:",
  "frame-src https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
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
        hostname: 'allbud.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.allbud.com',
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
      },
      // TODO: remove storage.cannalog.fun after confirming all DB URLs migrated to /media/ paths
      {
        protocol: 'https',
        hostname: 'storage.cannalog.fun',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
