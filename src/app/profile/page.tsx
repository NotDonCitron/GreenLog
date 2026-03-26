"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ProfileView = dynamic(() => import("./profile-view").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="animate-spin text-black/40" size={32} />
    </main>
  ),
});

export default function ProfilePage() {
  return <ProfileView />;
}
