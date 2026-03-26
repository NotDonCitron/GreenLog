import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";
import { FeedbackButton } from "@/components/feedback/feedback-button";
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: 'dark' }}
    >
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="h-full bg-[#355E3B] text-white overflow-x-hidden">
        <AuthProvider>
          <div className="flex h-full flex-col">
            <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
          </div>
          <OnboardingGuide />
          <FeedbackButton />
        </AuthProvider>
      </body>
    </html>
  );
}
