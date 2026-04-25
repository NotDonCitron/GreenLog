import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { OfflineIndicator } from "@/components/offline-indicator";
import OnboardingGuide from "@/components/onboarding";
import { ErrorBoundary } from "@/components/error-boundary";
import { PUBLIC_SITE_URL } from "@/lib/site-config";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: {
    default: 'CannaLog',
    template: '%s | CannaLog',
  },
  description: 'Dokumentations- und Verwaltungssoftware für volljährige Nutzer und Organisationen',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CannaLog',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: PUBLIC_SITE_URL,
    siteName: 'CannaLog',
    title: 'CannaLog',
    description: 'Dokumentations- und Verwaltungssoftware für volljährige Nutzer und Organisationen',
    images: [
      {
        url: '/api/og?title=CannaLog%20%E2%80%93%20Strain%20Tracking',
        width: 1200,
        height: 630,
        alt: 'CannaLog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CannaLog',
    description: 'Dokumentations- und Verwaltungssoftware für volljährige Nutzer und Organisationen',
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#22c55e",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("cannalog_theme");"light"===t&&(document.documentElement.classList.add("light"),document.documentElement.style.colorScheme="light")}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "CannaLog",
              "alternateName": "GreenLog",
              "description": "Dokumentations- und Verwaltungssoftware für volljährige Nutzer, Organisationen und medizinische Cannabis-Kontexte.",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web, iOS, Android",
              "url": PUBLIC_SITE_URL,
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR",
              },
              "author": {
                "@type": "Organization",
                "name": "CannaLog",
                "url": PUBLIC_SITE_URL,
              },
            }),
          }}
        />
      </head>
      <body className="h-full bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden font-body">
        <ServiceWorkerRegister />
        <OfflineIndicator />
        <Providers>
          <ErrorBoundary name="app">
            <div className="flex h-full flex-col">
              <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
            </div>
            <OnboardingGuide />
            <CookieConsentBanner />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
