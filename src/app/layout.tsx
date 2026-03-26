import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";
import Head from "next/head";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CannaLog v1.1 - Ultimate Edition",
  description: "Premium Cannabis Tracking & Trading Cards",
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
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className="h-full bg-white text-black overflow-x-hidden">
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
