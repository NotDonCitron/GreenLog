"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Users, Compass, Loader2, Search, Building2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { ActivityFeed } from "@/components/social/activity-feed";
import { SuggestedUsers } from "@/components/social/suggested-users";
import { FollowButton } from "@/components/social/follow-button";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";

type FeedTab = "foryou" | "following" | "discover";
type FollowingFilter = "users" | "communities";
type DiscoverView = "friends" | "browse";
type FriendFilter = "friends" | "communities" | null;

interface ProfileStub {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface FriendProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  strainCount: number;
  topStrains: StrainStub[];
}

interface StrainStub {
  id?: string;
  name?: string;
  slug?: string;
  image_url?: string | null;
}

interface CommunityOrg {
  id: string;
  name: string;
  logo_url?: string | null;
  organization_type?: string;
  role?: string;
}

interface FavoriteRelation {
  user_id: string;
  strains: StrainStub | null;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [followingFilter, setFollowingFilter] = useState<FollowingFilter>("users");
  const [communities, setCommunities] = useState<CommunityOrg[]>([]);
  const [otherCommunities, setOtherCommunities] = useState<CommunityOrg[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  // Discover tab state
  const [discoverView, setDiscoverView] = useState<DiscoverView>("friends");
  const [friendFilter, setFriendFilter] = useState<FriendFilter>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [browseUsers, setBrowseUsers] = useState<ProfileStub[]>([]);
  const [loadingBrowseUsers, setLoadingBrowseUsers] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const tabs: { id: FeedTab; label: string; icon: typeof Sparkles }[] = [
    { id: "foryou", label: "Für dich", icon: Sparkles },
    { id: "following", label: "Following", icon: Users },
    { id: "discover", label: "Entdecken", icon: Compass },
  ];

  // Fetch communities for following + discover tabs
  useEffect(() => {
    if ((activeTab === "discover" || activeTab === "following") && user) {
      setLoadingCommunities(true);

      Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id, role, organizations(*)")
          .eq("user_id", user.id)
          .eq("membership_status", "active"),
        supabase
          .from("organizations")
          .select("*")
          .eq("status", "active")
          .order("name", { ascending: true })
      ]).then(([myCommunitiesRes, allCommunitiesRes]) => {
        type OrgMemberRow = { organizations: CommunityOrg | null; role: string };
        const myOrgs = ((myCommunitiesRes.data ?? []) as unknown as OrgMemberRow[]).map((m) => {
          const org = m.organizations;
          if (!org) return null;
          return {
            ...org,
            role: m.role || "member"
          } as CommunityOrg;
        }).filter((o): o is CommunityOrg => o !== null);
        setCommunities(myOrgs);

        const myOrgIds = new Set(myOrgs.map((o) => o.id));
        const otherOrgs = (allCommunitiesRes.data || []).filter((org) => !myOrgIds.has(org.id));
        setOtherCommunities(otherOrgs);

        setLoadingCommunities(false);
      }).catch(err => {
        console.error('Error fetching communities:', err);
        setLoadingCommunities(false);
      });
    }
  }, [activeTab, user]);

  // Fetch friends with stats + browse users for discover tab
  useEffect(() => {
    if (activeTab === "discover" && user) {
      // Fetch friends (followed users) with their strain stats
      setLoadingFriends(true);
      setLoadingBrowseUsers(true);

      (async () => {
        try {
          const { data: follows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id);

          const followedIds = new Set(follows?.map(f => f.following_id) ?? []);
          setFollowingIds(followedIds);

          // Fetch friend profiles with stats
          if (follows && follows.length > 0) {
            const friendIds = follows.map(f => f.following_id);

            const { data: profiles } = await supabase
              .from("profiles")
              .select("*")
              .in("id", friendIds);

            if (profiles) {
              const pIds = profiles.map(p => p.id);

              // Batch fetch ratings counts
              const { data: allRatings } = await supabase
                .from("ratings")
                .select("user_id")
                .in("user_id", pIds);

              const countMap: Record<string, number> = {};
              allRatings?.forEach(r => {
                countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
              });

              // Batch fetch favorites
              const { data: allFavoriteRelations } = await supabase
                .from("user_strain_relations")
                .select("user_id, strains(*)")
                .in("user_id", pIds)
                .eq("is_favorite", true);

              const favoritesMap: Record<string, StrainStub[]> = {};
              (allFavoriteRelations ?? []).forEach((rel) => {
                if (!favoritesMap[rel.user_id]) favoritesMap[rel.user_id] = [];
                if (favoritesMap[rel.user_id].length < 5) {
                  favoritesMap[rel.user_id].push(rel.strains as StrainStub);
                }
              });

              // Fallback: recent ratings for friends without favorites
              const friendsNeedingFallback = pIds.filter(
                id => !favoritesMap[id] || favoritesMap[id].length === 0
              );

              if (friendsNeedingFallback.length > 0) {
                const { data: recentRatings } = await supabase
                  .from("ratings")
                  .select("user_id, strains(*)")
                  .in("user_id", friendsNeedingFallback)
                  .order("created_at", { ascending: false });

              (recentRatings ?? []).forEach((r) => {
                if (!favoritesMap[r.user_id]) favoritesMap[r.user_id] = [];
                if (favoritesMap[r.user_id].length < 5) {
                  favoritesMap[r.user_id].push(r.strains as StrainStub);
                }
              });
              }

              const friendsWithStats = profiles.map(p => ({
                ...p,
                strainCount: countMap[p.id] || 0,
                topStrains: (favoritesMap[p.id] || []).filter(Boolean)
              }));
              setFriends(friendsWithStats as FriendProfile[]);
            }
          }

          // Fetch browse users
          const { data: allUsers } = await supabase
            .from("profiles")
            .select("*")
            .neq("id", user.id)
            .limit(20);
          setBrowseUsers(allUsers || []);

        } catch (err) {
          console.error("Discover data fetch error:", err);
        } finally {
          setLoadingFriends(false);
          setLoadingBrowseUsers(false);
        }
      })();
    }
  }, [activeTab, user]);

  const handleFriendFilter = (filter: "friends" | "communities") => {
    setFriendFilter(friendFilter === filter ? null : filter);
  };

  return (
    <main className="pull-refresh min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 overflow-y-auto">
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.id
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
        {activeTab === "foryou" && !user && (
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
        {activeTab === "foryou" && user && (
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
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex gap-2 p-1 bg-[var(--muted)] rounded-xl">
              <button
                onClick={() => setFollowingFilter("users")}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${followingFilter === "users"
                  ? "bg-[#00F5FF] text-black"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
              >
                Following
              </button>
              <button
                onClick={() => setFollowingFilter("communities")}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${followingFilter === "communities"
                  ? "bg-[#2FF801] text-black"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
              >
                Communities
              </button>
            </div>

            {/* Following users feed */}
            {followingFilter === "users" && (
              <>
                <ActivityFeed showDiscover={false} />
                {/* Empty state */}
                <div className="text-center py-8 px-6 bg-[var(--card)] rounded-3xl border border-[var(--border)]">
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

            {/* Following communities */}
            {followingFilter === "communities" && (
              <>
                {loadingCommunities ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
                  </div>
                ) : communities.length > 0 ? (
                  <div className="space-y-2">
                    {communities.map((org) => (
                      <Link
                        key={org.id}
                        href={`/community/${org.id}`}
                        className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[#00F5FF]/50 transition-colors"
                      >
                        <div className="relative w-12 h-12 rounded-full bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                          {org.logo_url ? (
                            <Image src={org.logo_url} alt={org.name} fill className="object-cover" sizes="40px" />
                          ) : (
                            <span className="text-[#2FF801] font-bold text-lg">{org.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[var(--foreground)]">{org.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)] uppercase">
                            {org.organization_type}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6 bg-[var(--card)] rounded-3xl border border-[var(--border)]">
                    <div className="w-12 h-12 rounded-full bg-[#2FF801]/10 flex items-center justify-center mx-auto mb-3">
                      <Users size={20} className="text-[#2FF801]" />
                    </div>
                    <p className="text-sm font-bold text-[var(--foreground)] mb-1">Noch keine Communities</p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-4">
                      Finde oder erstelle Communities!
                    </p>
                    <button
                      onClick={() => setActiveTab("discover")}
                      className="inline-block px-5 py-2 bg-[#2FF801] text-black font-bold rounded-full text-xs"
                    >
                      Communities entdecken
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Discover - Enhanced with friends view from /discover */}
        {activeTab === "discover" && !user && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto">
              <Compass size={24} className="text-[var(--muted-foreground)]" />
            </div>
            <p className="text-[var(--muted-foreground)]">Melde dich an um zu entdecken</p>
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 bg-[#00F5FF] text-black font-bold rounded-full text-sm"
            >
              Login
            </Link>
          </div>
        )}
        {activeTab === "discover" && user && (
          <div className="space-y-4">
            {/* View toggle: Freunde & Communities / Entdecken */}
            <div className="flex gap-6 border-b border-[var(--border)]/50 mb-4">
              <button
                onClick={() => setDiscoverView("friends")}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${discoverView === "friends" ? "text-[#2FF801] border-b-2 border-[#2FF801]" : "text-[#484849]"}`}
              >
                Freunde & Communities
              </button>
              <button
                onClick={() => setDiscoverView("browse")}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${discoverView === "browse" ? "text-[#00F5FF] border-b-2 border-[#00F5FF]" : "text-[#484849]"}`}
              >
                Entdecken
              </button>
            </div>

            {/* Friends & Communities View */}
            {discoverView === "friends" && (
              <div>
                {/* Filter Buttons */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => handleFriendFilter("friends")}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${friendFilter === "friends"
                      ? "bg-[#2FF801] text-black border-[#2FF801]"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]/50 hover:border-[#00F5FF]/50"
                      }`}
                  >
                    Freunde
                  </button>
                  <button
                    onClick={() => handleFriendFilter("communities")}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${friendFilter === "communities"
                      ? "bg-[#00F5FF] text-black border-[#00F5FF]"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]/50 hover:border-[#00F5FF]/50"
                      }`}
                  >
                    Communities
                  </button>
                </div>

                {loadingFriends ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 animate-spin text-[#00F5FF]" />
                      <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20" />
                    </div>
                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Lade Social Data...</p>
                  </div>
                ) : (
                  <>
                    {/* Friends List */}
                    {friendFilter !== "communities" && (
                      <div>
                        {friends.length > 0 ? (
                          <div className="space-y-4">
                            {friends.map((friend) => (
                              <Link key={friend.id} href={`/user/${friend.username || friend.id}`}>
                                <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-[2rem] p-5 flex flex-col gap-4 hover:border-[#00F5FF]/50 transition-all">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[var(--muted)] border-2 border-[var(--border)] flex-shrink-0 flex items-center justify-center">
                                        {friend.avatar_url ? (
                                          <Image src={friend.avatar_url} alt={friend.username || "User"} fill className="object-cover" sizes="64px" />
                                        ) : (
                                          <span className="text-xl font-black text-[#00F5FF]">{(friend.username || "U")[0].toUpperCase()}</span>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="font-black text-[var(--foreground)] uppercase tracking-tight truncate text-xl leading-none font-display">
                                          {friend.display_name || friend.username || "User"}
                                        </h3>
                                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">@{friend.username}</p>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex flex-col items-center justify-center bg-[var(--muted)] px-4 py-2 rounded-2xl border border-[var(--border)]/50">
                                      <span className="text-3xl font-black text-[#2FF801] leading-none italic font-display">{friend.strainCount}</span>
                                      <p className="text-[7px] text-[var(--muted-foreground)] font-semibold uppercase tracking-tighter mt-1 whitespace-nowrap">strains</p>
                                    </div>
                                  </div>
                                  <div className="bg-[var(--input)] rounded-2xl p-3 flex flex-col gap-2">
                                    <p className="text-[8px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Top Strains</p>
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                      {friend.topStrains.map((s: StrainStub, idx: number) => (
                                        <div key={idx} className="flex flex-col items-center gap-1.5 w-14 flex-shrink-0">
                                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border)]/50 bg-[var(--card)]">
                                            <img
                                              src={s.image_url || "/strains/placeholder-1.svg"}
                                              alt={s.name || "Strain"}
                                              className="w-full h-full object-cover opacity-80"
                                            />
                                          </div>
                                          <p className="text-[7px] text-[var(--muted-foreground)] font-semibold uppercase tracking-tighter truncate w-full text-center leading-none">
                                            {s.name || "Strain"}
                                          </p>
                                        </div>
                                      ))}
                                      {friend.topStrains.length === 0 && (
                                        <p className="text-[8px] text-[#484849] italic">Noch keine Sorten</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : friendFilter === "friends" ? (
                          <div className="text-center py-20 bg-[var(--card)] rounded-[2.5rem] border border-dashed border-[var(--border)]/50 text-[#484849] text-[10px] font-bold uppercase tracking-widest px-10">
                            Noch keine Freunde hinzugefügt.
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Communities List */}
                    {friendFilter !== "friends" && (
                      <div>
                        {loadingCommunities ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
                          </div>
                        ) : communities.length > 0 ? (
                          <div className="space-y-4 mt-4">
                            {communities.map((comm) => (
                              <Link key={comm.id} href={`/community/${comm.id}`}>
                                <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-[2rem] p-5 flex flex-col gap-4 hover:border-[#00F5FF]/50 transition-all">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[var(--muted)] border-2 border-[var(--border)] flex-shrink-0 flex items-center justify-center">
                                        {comm.logo_url ? (
                                          <Image src={comm.logo_url} alt={comm.name} fill className="object-cover" sizes="64px" />
                                        ) : (
                                          <Building2 size={24} className="text-[#00F5FF]" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="font-black text-[var(--foreground)] uppercase tracking-tight truncate text-xl leading-none font-display">
                                          {comm.name}
                                        </h3>
                                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
                                          {comm.organization_type === "club" ? "Club" : comm.organization_type === "pharmacy" ? "Apotheke" : comm.organization_type || "Community"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex flex-col items-center justify-center bg-[var(--muted)] px-4 py-2 rounded-2xl border border-[var(--border)]/50">
                                      <span className={`text-lg font-black leading-none italic ${comm.role === "gründer" ? "text-[#ffd76a]" : comm.role === "admin" ? "text-[#ff716c]" : "text-[var(--muted-foreground)]"}`}>
                                        {comm.role === "gründer" ? "Gründer" : comm.role === "admin" ? "Admin" : "Member"}
                                      </span>
                                      <p className="text-[7px] text-[var(--muted-foreground)] font-semibold uppercase tracking-tighter mt-1 whitespace-nowrap">rolle</p>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : friendFilter === "communities" ? (
                          <div className="text-center py-20 bg-[var(--card)] rounded-[2.5rem] border border-dashed border-[var(--border)]/50 text-[#484849] text-[10px] font-bold uppercase tracking-widest px-10">
                            Du bist in keiner Community.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Browse / Entdecken View */}
            {discoverView === "browse" && (
              <div>
                {/* Suggested Users */}
                <SuggestedUsers
                  limit={8}
                  showViewAll={false}
                  showCommunities={true}
                  className="mb-6"
                />

                {/* Search Field */}
                <div className="relative mb-6">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#484849] pointer-events-none" />
                  <input
                    type="text"
                    value={discoverSearch}
                    onChange={(e) => setDiscoverSearch(e.target.value)}
                    placeholder="Nutzer suchen..."
                    className="w-full h-12 pl-11 pr-4 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl text-[var(--foreground)] placeholder:text-[#484849] text-sm font-medium focus:outline-none focus:border-[#00F5FF]/50 transition-colors"
                  />
                </div>

                {/* Browse Users Grid */}
                {loadingBrowseUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {browseUsers
                      .filter((profile) => {
                        if (!discoverSearch.trim()) return true;
                        const q = discoverSearch.toLowerCase();
                        return (
                          (profile.display_name || "").toLowerCase().includes(q) ||
                          (profile.username || "").toLowerCase().includes(q)
                        );
                      })
                      .map((profile) => (
                        <div key={profile.id} className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:border-[#00F5FF]/50 transition-all">
                          <Link href={`/user/${profile.username}`} className="flex flex-col items-center gap-2">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                              {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt={profile.username || "User"} fill className="object-cover" sizes="64px" />
                              ) : (
                                <span className="text-xl font-black text-[#00F5FF]">{profile.username?.[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[var(--foreground)] uppercase truncate max-w-[120px] font-display">{profile.display_name || profile.username}</p>
                              <p className="text-[9px] text-[var(--muted-foreground)]">@{profile.username}</p>
                            </div>
                          </Link>
                          <FollowButton
                            userId={profile.id}
                            size="sm"
                            className="text-xs px-3 py-1"
                            initialStatus={{
                              is_following: followingIds.has(profile.id),
                              is_following_me: false,
                              has_pending_request: false,
                            }}
                            onFollowChange={() => {
                              setFollowingIds(prev => {
                                const next = new Set(prev);
                                if (next.has(profile.id)) {
                                  next.delete(profile.id);
                                } else {
                                  next.add(profile.id);
                                }
                                return next;
                              });
                            }}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
