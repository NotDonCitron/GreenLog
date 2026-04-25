import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SafeScreenshot } from "@/components/marketing/safe-screenshot";

const screens = ["dashboard", "grow", "privacy", "age-gate", "pwa"] as const;

type Screen = (typeof screens)[number];

type PageProps = {
  params: Promise<{ screen: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketing Screenshot - GreenLog",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MarketingScreenshotPage({ params }: PageProps) {
  const { screen } = await params;

  if (process.env.NEXT_PUBLIC_MARKETING_SAFE_MODE !== "true") {
    notFound();
  }

  if (!isScreen(screen)) {
    notFound();
  }

  return <SafeScreenshot kind={screen} />;
}

function isScreen(screen: string): screen is Screen {
  return screens.includes(screen as Screen);
}

