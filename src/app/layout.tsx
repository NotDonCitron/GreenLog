import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CannaLog v2.0 - Neon Vault Edition",
  description: "Premium Cannabis Strain Tracking & Collection",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CannaLog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0e0e0f",
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
            __html: `
              (function() {
                var theme = localStorage.getItem('cannalog_theme');
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="h-full bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden font-body">
        <AuthProvider>
          <div className="flex h-full flex-col">
            <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
          </div>
          <OnboardingGuide />
        </AuthProvider>
      </body>
    </html>
  );
}
