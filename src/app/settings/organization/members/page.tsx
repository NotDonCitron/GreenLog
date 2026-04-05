"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import {
  ChevronLeft,
  Loader2,
  Users,
  UserRound,
  ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

interface FollowerUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Follower {
  id: string;
  user_id: string;
  created_at: string;
  profile: FollowerUser | null;
}

function formatFollowDate(dateStr: string | null) {
  if (!dateStr) return "Unbekannt";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function FollowersPage() {
  const { user, session, activeOrganization } = useAuth();
  const router = useRouter();

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrganization) {
      router.push("/profile");
      return;
    }

    const fetchFollowers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: followersData, error: followersError } = await supabase
          .from("community_followers")
          .select("id, user_id, created_at")
          .eq("organization_id", activeOrganization.organization_id)
          .order("created_at", { ascending: false });

        if (followersError) throw followersError;

        type RawFollower = { id: string; user_id: string; created_at: string };
        const userIds = (followersData || []).map((f: RawFollower) => f.user_id).filter(Boolean);
        let profilesMap = new Map<string, FollowerUser>();

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", userIds);

          if (profilesData) {
            profilesMap = new Map(profilesData.map((p: FollowerUser) => [p.id, p]));
          }
        }

        const followersWithProfiles = (followersData || []).map((f: RawFollower) => ({
          id: f.id,
          user_id: f.user_id,
          created_at: f.created_at,
          profile: profilesMap.get(f.user_id) || null,
        }));

        setFollowers(followersWithProfiles);
        setFollowerCount(followersWithProfiles.length);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchFollowers();
  }, [activeOrganization, router]);

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
        >
          <ChevronLeft size={20} className="text-[var(--foreground)]" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
            Follower
          </h1>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10">
        {/* Follower count summary */}
        {!loading && !error && (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-4 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center">
                  <Users size={18} className="text-[#00F5FF]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--foreground)]">{followerCount} Follower</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">dieser Community</p>
                </div>
              </div>
              <Link
                href={`/community/${activeOrganization.organization_id}`}
                className="flex items-center gap-1 text-[10px] font-bold text-[#00F5FF] hover:text-[#00F5FF]/80 transition-colors"
              >
                <ExternalLink size={10} />
                Community ansehen
              </Link>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
          </div>
        ) : error ? (
          <Card className="bg-[#ff716c]/10 border-[#ff716c]/20 p-6 rounded-3xl">
            <p className="text-[#ff716c] font-bold text-center">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-[var(--muted)] border border-[var(--border)]/50"
            >
              Erneut versuchen
            </Button>
          </Card>
        ) : followers.length === 0 ? (
          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-8 rounded-3xl text-center">
            <Users size={32} className="mx-auto text-[#484849] mb-3" />
            <p className="text-[var(--muted-foreground)] font-bold">Noch keine Follower</p>
            <p className="text-[10px] text-[#484849] mt-1">
              Alle, die dieser Community folgen, werden hier angezeigt.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {followers.map((follower) => {
              const isSelf = follower.profile?.id === user?.id;

              return (
                <Card
                  key={follower.id}
                  className={`bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl ${
                    isSelf ? "border-[#00F5FF]/30 bg-[#00F5FF]/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {follower.profile?.avatar_url ? (
                          <img
                            src={follower.profile.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserRound size={18} className="text-[#00F5FF]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm truncate text-[var(--foreground)]">
                            {follower.profile?.display_name || follower.profile?.username || "Unbekannt"}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded-full">
                              Du
                            </span>
                          )}
                        </div>
                        {follower.profile?.username && (
                          <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate">
                            @{follower.profile.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-[10px] text-[#484849] font-mono">
                        seit {formatFollowDate(follower.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
