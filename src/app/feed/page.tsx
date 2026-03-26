"use client";

import { useState } from "react";
import { Sparkles, Users, Compass, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { ActivityFeed } from "@/components/social/activity-feed";
import { SuggestedUsers } from "@/components/social/suggested-users";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";

type FeedTab = "foryou" | "following" | "discover";

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [communities, setCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const tabs: { id: FeedTab; label: string; icon: typeof Sparkles }[] = [
    { id: "foryou", label: "Für dich", icon: Sparkles },
    { id: "following", label: "Following", icon: Users },
    { id: "discover", label: "Entdecken", icon: Compass },
  ];

  useEffect(() => {
    if (activeTab === "discover" && user) {
      setLoadingCommunities(true);
      // Fetch user's communities
      supabase
        .from("organization_members")
        .select("organization_id, role, organizations(*)")
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .then(({ data }) => {
          const orgs = (data || []).map((m: any) => m.organizations).filter(Boolean);
          setCommunities(orgs);
          setLoadingCommunities(false);
        });
    }
  }, [activeTab, user]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 overflow-y-auto">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 relative z-10">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
          Social
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
        {/* Für dich - All public activities */}
        {activeTab === "foryou" && (
          <ActivityFeed showDiscover={true} />
        )}

        {/* Following - Only followed users */}
        {activeTab === "following" && !user && (
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
        )}
        {activeTab === "following" && user && (
          <>
            <ActivityFeed showDiscover={false} />
            {/* Empty state */}
            <div className="mt-4 text-center py-8 px-6 bg-[var(--card)] rounded-3xl border border-[var(--border)]">
              <div className="w-12 h-12 rounded-full bg-[#00F5FF]/10 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-[#00F5FF]" />
              </div>
              <p className="text-sm font-bold text-[var(--foreground)] mb-1">Noch niemanden folgen?</p>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Finde neue Leute und sieh was sie sammeln!
              </p>
              <button
                onClick={() => setActiveTab("discover")}
                className="inline-block px-5 py-2 bg-[#00F5FF] text-black font-bold rounded-full text-xs"
              >
                User entdecken
              </button>
            </div>
          </>
        )}

        {/* Discover - Suggested Users & Communities */}
        {activeTab === "discover" && (
          <div className="space-y-6">
            {/* Suggested Users */}
            <section>
              <SuggestedUsers limit={10} showViewAll={false} showCommunities={false} />
            </section>

            {/* My Communities */}
            {user && (
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                  Meine Communities
                </h3>
                {loadingCommunities ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[#00F5FF]" />
                  </div>
                ) : communities.length > 0 ? (
                  <div className="space-y-2">
                    {communities.map((org: any) => (
                      <Link
                        key={org.id}
                        href={`/community/${org.id}`}
                        className="flex items-center gap-3 p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[#00F5FF]/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[#2FF801] font-bold text-sm">{org.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[var(--foreground)] truncate">{org.name}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] uppercase">
                            {org.organization_type}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)]">Noch keine Communities</p>
                    <Link
                      href="/community/new"
                      className="inline-block mt-2 px-4 py-1.5 bg-[#2FF801]/10 text-[#2FF801] text-xs font-bold rounded-full"
                    >
                      Erstelle eine
                    </Link>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
