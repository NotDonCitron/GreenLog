"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus, Building2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { SuggestedUsers } from "@/components/social/suggested-users";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/types";

interface FriendProfile extends ProfileRow {
    strainCount: number;
    topStrains: any[];
}

interface Community {
    id: string;
    name: string;
    organization_type: string | null;
    role: string;
}

export default function DiscoverPage() {
    const { user } = useAuth();
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [browseUsers, setBrowseUsers] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"friends" | "browse">("friends");
    const [friendFilter, setFriendFilter] = useState<"friends" | "communities" | null>(null);

    const handleFilterToggle = (filter: "friends" | "communities") => {
        setFriendFilter(friendFilter === filter ? null : filter);
    };
    const [discoverSearch, setDiscoverSearch] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const { data: follows } = await supabase
                    .from("follows")
                    .select("following_id")
                    .eq("follower_id", user.id);

                if (follows && follows.length > 0) {
                    const friendIds = follows.map(f => f.following_id);

                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("*")
                        .in("id", friendIds);

                    if (profiles) {
                        const friendIds = profiles.map(p => p.id);

                        // Batch fetch all ratings counts (N+1 fix)
                        const { data: allRatings } = await supabase
                            .from("ratings")
                            .select("user_id")
                            .in("user_id", friendIds);

                        const countMap: Record<string, number> = {};
                        allRatings?.forEach(r => {
                            countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
                        });

                        // Batch fetch all favorite relations for all friends
                        const { data: allFavoriteRelations } = await supabase
                            .from("user_strain_relations")
                            .select("user_id, strains(*)")
                            .in("user_id", friendIds)
                            .eq("is_favorite", true);

                        // Group favorites by user_id (keep top 5 per user)
                        const favoritesMap: Record<string, any[]> = {};
                        allFavoriteRelations?.forEach((rel: any) => {
                            if (!favoritesMap[rel.user_id]) favoritesMap[rel.user_id] = [];
                            if (favoritesMap[rel.user_id].length < 5) {
                                favoritesMap[rel.user_id].push(rel.strains);
                            }
                        });

                        // For friends with no favorites, fetch recent ratings
                        const friendsNeedingFallback = friendIds.filter(
                            id => !favoritesMap[id] || favoritesMap[id].length === 0
                        );

                        if (friendsNeedingFallback.length > 0) {
                            const { data: recentRatings } = await supabase
                                .from("ratings")
                                .select("user_id, strains(*)")
                                .in("user_id", friendsNeedingFallback)
                                .order("created_at", { ascending: false });

                            recentRatings?.forEach((r: any) => {
                                if (!favoritesMap[r.user_id]) favoritesMap[r.user_id] = [];
                                if (favoritesMap[r.user_id].length < 5) {
                                    favoritesMap[r.user_id].push(r.strains);
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

                const { data: memberships } = await supabase
                    .from("organization_members")
                    .select("organization_id, role")
                    .eq("user_id", user.id)
                    .eq("membership_status", "active");

                if (memberships && memberships.length > 0) {
                    const orgIds = memberships.map(m => m.organization_id);
                    const { data: orgs } = await supabase
                        .from("organizations")
                        .select("id, name, organization_type")
                        .in("id", orgIds);

                    if (orgs) {
                        const communitiesWithRole = orgs.map(org => ({
                            id: org.id,
                            name: org.name,
                            organization_type: org.organization_type,
                            role: memberships.find(m => m.organization_id === org.id)?.role || "member"
                        }));
                        setCommunities(communitiesWithRole);
                    }
                }

                const { data: allUsers } = await supabase
                    .from("profiles")
                    .select("*")
                    .neq("id", user.id)
                    .limit(20);
                setBrowseUsers(allUsers || []);

            } catch (err) {
                console.error("Social data fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    return (
        <div className="pull-refresh min-h-screen bg-[var(--background)] pb-24">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
            </div>

            <div className="sticky top-0 z-20 glass-surface border-b border-[var(--border)]/50">
                <div className="max-w-lg mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-black italic uppercase tracking-tight font-display text-[var(--foreground)]">Social</h1>
                        <button className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center">
                            <UserPlus size={20} className="text-[#00F5FF]" />
                        </button>
                    </div>

                    <div className="flex gap-6 border-b border-[var(--border)]/50 -mb-6">
                        <button
                            onClick={() => setActiveTab("friends")}
                            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "friends" ? "text-[#2FF801] border-b-2 border-[#2FF801]" : "text-[#484849]"}`}
                        >
                            Freunde & Communities
                        </button>
                        <button
                            onClick={() => setActiveTab("browse")}
                            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "browse" ? "text-[#00F5FF] border-b-2 border-[#00F5FF]" : "text-[#484849]"}`}
                        >
                            Entdecken
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-6 py-10 relative z-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <Loader2 className="h-10 w-10 animate-spin text-[#00F5FF]" />
                            <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20" />
                        </div>
                        <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">Lade Social Data...</p>
                    </div>
                ) : activeTab === "friends" ? (
                    <div>
                        {/* Filter Buttons */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => handleFilterToggle("friends")}
                                className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                                    friendFilter === "friends"
                                        ? "bg-[#2FF801] text-black border-[#2FF801]"
                                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]/50 hover:border-[#00F5FF]/50"
                                }`}
                            >
                                Freunde
                            </button>
                            <button
                                onClick={() => handleFilterToggle("communities")}
                                className={`flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                                    friendFilter === "communities"
                                        ? "bg-[#00F5FF] text-black border-[#00F5FF]"
                                        : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)]/50 hover:border-[#00F5FF]/50"
                                }`}
                            >
                                Communities
                            </button>
                        </div>

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
                                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--muted)] border-2 border-[var(--border)] flex-shrink-0 flex items-center justify-center">
                                                                {friend.avatar_url ? (
                                                                    <img src={friend.avatar_url} alt={friend.username || "User"} className="w-full h-full object-cover" />
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
                                                            {friend.topStrains.map((s, idx) => (
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
                                {communities.length > 0 ? (
                                    <div className="space-y-4 mt-4">
                                        {communities.map((comm) => (
                                            <Link key={comm.id} href="/community">
                                                <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-[2rem] p-5 flex flex-col gap-4 hover:border-[#00F5FF]/50 transition-all">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--muted)] border-2 border-[var(--border)] flex-shrink-0 flex items-center justify-center">
                                                                <Building2 size={24} className="text-[#00F5FF]" />
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
                    </div>
                ) : (
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
                                    <Link key={profile.id} href={`/user/${profile.username}`}>
                                        <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:border-[#00F5FF]/50 transition-all">
                                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xl font-black text-[#00F5FF]">{profile.username?.[0]?.toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--foreground)] uppercase truncate max-w-[120px] font-display">{profile.display_name || profile.username}</p>
                                                <p className="text-[9px] text-[var(--muted-foreground)]">@{profile.username}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
