import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SafeScreenshot } from "@/components/marketing/safe-screenshot";
import { MARKETING_SCREENS } from "@/lib/marketing-screenshots.mjs";
import type { ScreenshotKind } from "@/components/marketing/safe-screenshot";

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

  if (process.env.MARKETING_SAFE_MODE !== "true") {
    notFound();
  }

  if (!isScreen(screen)) {
    notFound();
  }

  return <SafeScreenshot kind={screen} />;
}

function isScreen(screen: string): screen is ScreenshotKind {
  return MARKETING_SCREENS.includes(screen as ScreenshotKind);
}
