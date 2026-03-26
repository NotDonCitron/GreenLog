"use client";

import { useState } from "react";
import { Loader2, TrendingUp, Users, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { ActivityFeed } from "@/components/social/activity-feed";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

type FeedTab = "foryou" | "following" | "top";

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");

  const tabs: { id: FeedTab; label: string; icon: typeof Sparkles }[] = [
    { id: "foryou", label: "Für dich", icon: Sparkles },
    { id: "following", label: "Following", icon: Users },
    { id: "top", label: "Top", icon: TrendingUp },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 overflow-y-auto">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 relative z-10">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
          Feed
        </h1>
      </header>

      {/* Tabs */}
      <div className="px-6 relative z-10">
        <div className="flex gap-2 p-1 bg-[var(--muted)] rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-[#00F5FF] text-black shadow-lg shadow-[#00F5FF]/20"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Content */}
      <div className="px-4 mt-6 relative z-10">
        {activeTab === "following" && !user ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto">
              <Users size={24} className="text-[var(--muted-foreground)]" />
            </div>
            <p className="text-[var(--muted-foreground)]">Melde dich an um deinen Feed zu sehen</p>
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 bg-[#00F5FF] text-black font-bold rounded-full text-sm"
            >
              Login
            </Link>
          </div>
        ) : activeTab === "following" ? (
          <ActivityFeed showDiscover={false} />
        ) : (
          <ActivityFeed showDiscover={true} />
        )}
      </div>

      {/* Empty state for new users in Following tab */}
      {activeTab === "following" && user && (
        <div className="px-4 mt-4 relative z-10">
          <div className="text-center py-8 px-6 bg-[var(--card)] rounded-3xl border border-[var(--border)]">
            <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-[#00F5FF]" />
            </div>
            <p className="text-sm font-bold text-[var(--foreground)] mb-1">Noch niemanden folgen?</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Finde neue Leute und sieh was sie sammeln!
            </p>
            <Link
              href="/discover"
              className="inline-block px-5 py-2 bg-[#00F5FF] text-black font-bold rounded-full text-xs"
            >
              User entdecken
            </Link>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
