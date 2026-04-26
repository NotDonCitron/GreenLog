import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interne Updates",
  description: "Interne, nicht indexierte Aktivitaets- und Organisationsansicht.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FeedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
