import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import OnboardingGuide from "@/components/onboarding";
import { ThemeInit } from "@/components/theme-init";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'CannaLog',
    template: '%s | CannaLog',
  },
  description: 'Cannabis Strain Tracking & Collection',
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
    url: 'https://greenlog.app',
    siteName: 'CannaLog',
    title: 'CannaLog',
    description: 'Cannabis Strain Tracking & Collection',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'CannaLog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CannaLog',
    description: 'Cannabis Strain Tracking & Collection',
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
  maximumScale: 1,
  userScalable: false,
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
      </head>
      <body className="h-full bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden font-body">
        <ThemeInit />
        <Providers>
          <div className="flex h-full flex-col">
            <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
          </div>
          <OnboardingGuide />
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
