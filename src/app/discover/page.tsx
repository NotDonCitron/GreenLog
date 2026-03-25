"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus, Building2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
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
    const [friendFilter, setFriendFilter] = useState<"all" | "friends" | "communities">("all");
    const [discoverSearch, setDiscoverSearch] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // 1. Freunde finden (Leute denen ich folge)
                const { data: follows } = await supabase
                    .from("follows")
                    .select("following_id")
                    .eq("follower_id", user.id);

                if (follows && follows.length > 0) {
                    const friendIds = follows.map(f => f.following_id);

                    // 2. Profile laden
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("*")
                        .in("id", friendIds);

                    if (profiles) {
                        const friendsWithStats = await Promise.all(profiles.map(async (p) => {
                            const { count } = await supabase
                                .from("ratings")
                                .select("*", { count: "exact", head: true })
                                .eq("user_id", p.id);

                            let { data: topData } = await supabase
                                .from("user_strain_relations")
                                .select("strains(*)")
                                .eq("user_id", p.id)
                                .eq("is_favorite", true)
                                .limit(5);

                            if (!topData || topData.length === 0) {
                                const { data: ratedData } = await supabase
                                    .from("ratings")
                                    .select("strains(*)")
                                    .eq("user_id", p.id)
                                    .order("created_at", { ascending: false })
                                    .limit(5);
                                topData = ratedData;
                            }

                            const topStrains = (topData || [])
                                .map(entry => (entry as any).strains)
                                .filter(Boolean);

                            return {
                                ...p,
                                strainCount: count || 0,
                                topStrains: topStrains
                            };
                        }));
                        setFriends(friendsWithStats as FriendProfile[]);
                    }
                }

                // 2. Communities laden
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

                // 3. Entdecken (Andere User)
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
        <div className="min-h-screen bg-[#355E3B] pb-24">
            <div className="sticky top-0 z-20 bg-[#355E3B]/95 backdrop-blur-md border-b border-white/10">
                <div className="max-w-lg mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">Social</h1>
                        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                            <UserPlus size={20} className="text-[#00F5FF]" />
                        </button>
                    </div>

                    <div className="flex gap-6 border-b border-white/10 -mb-6">
                        <button
                            onClick={() => setActiveTab("friends")}
                            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === "friends" ? "text-[#2FF801] border-b-2 border-[#2FF801]" : "text-white/40"}`}
                        >
                            Deine Freunde & Communities
                        </button>
                        <button
                            onClick={() => setActiveTab("browse")}
                            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === "browse" ? "text-[#2FF801] border-b-2 border-[#2FF801]" : "text-white/40"}`}
                        >
                            Entdecken
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-6 py-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-[#00F5FF]" />
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Lade Social Data...</p>
                    </div>
                ) : activeTab === "friends" ? (
                    <div>
                        {/* Filter Buttons */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setFriendFilter("all")}
                                className={`flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    friendFilter === "all"
                                        ? "bg-[#00F5FF] text-black border-[#00F5FF]"
                                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                }`}
                            >
                                Alle
                            </button>
                            <button
                                onClick={() => setFriendFilter("friends")}
                                className={`flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    friendFilter === "friends"
                                        ? "bg-[#00F5FF] text-black border-[#00F5FF]"
                                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                }`}
                            >
                                Freunde
                            </button>
                            <button
                                onClick={() => setFriendFilter("communities")}
                                className={`flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                    friendFilter === "communities"
                                        ? "bg-[#00F5FF] text-black border-[#00F5FF]"
                                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
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
                                                <div className="bg-[#1e3a24] border border-white/10 rounded-[2rem] p-5 flex flex-col gap-4 shadow-xl hover:border-[#00F5FF]/30 transition-all">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-black/20 border-2 border-white/10 flex-shrink-0 flex items-center justify-center">
                                                                {friend.avatar_url ? (
                                                                    <img src={friend.avatar_url} alt={friend.username || "User"} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xl font-bold text-white/20">{(friend.username || "U")[0].toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="font-black text-white uppercase tracking-tight truncate text-xl leading-none">
                                                                    {friend.display_name || friend.username || "User"}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 flex flex-col items-center justify-center bg-black/20 px-4 py-2 rounded-2xl border border-white/5">
                                                            <span className="text-3xl font-black text-[#2FF801] leading-none italic">{friend.strainCount}</span>
                                                            <p className="text-[7px] text-white/40 font-black uppercase tracking-tighter mt-1 whitespace-nowrap">strains in der sammlung</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/20 rounded-2xl p-3 flex flex-col gap-2">
                                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Top Strains</p>
                                                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                                            {friend.topStrains.map((s, idx) => (
                                                                <div key={idx} className="flex flex-col items-center gap-1.5 w-14 flex-shrink-0">
                                                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-white/5 shadow-inner">
                                                                        <img
                                                                            src={s.image_url || "/strains/placeholder-1.svg"}
                                                                            alt={s.name || "Strain"}
                                                                            className="w-full h-full object-cover opacity-80"
                                                                        />
                                                                    </div>
                                                                    <p className="text-[7px] text-white/40 font-black uppercase tracking-tighter truncate w-full text-center leading-none">
                                                                        {s.name || "Strain"}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                            {friend.topStrains.length === 0 && (
                                                                <p className="text-[8px] text-white/10 italic">Noch keine Sorten bewertet</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : friendFilter === "friends" ? (
                                    <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 text-white/20 text-[10px] font-bold uppercase tracking-widest px-10">
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
                                                <div className="bg-[#1e3a24] border border-white/10 rounded-[2rem] p-5 flex flex-col gap-4 shadow-xl hover:border-[#00F5FF]/30 transition-all">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-black/20 border-2 border-white/10 flex-shrink-0 flex items-center justify-center">
                                                                <Building2 size={24} className="text-[#00F5FF]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="font-black text-white uppercase tracking-tight truncate text-xl leading-none">
                                                                    {comm.name}
                                                                </h3>
                                                                <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                                                                    {comm.organization_type === "club" ? "Club" : comm.organization_type === "pharmacy" ? "Apotheke" : comm.organization_type || "Community"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 flex flex-col items-center justify-center bg-black/20 px-4 py-2 rounded-2xl border border-white/5">
                                                            <span className={`text-xl font-black leading-none italic ${comm.role === "owner" ? "text-yellow-400" : comm.role === "admin" ? "text-red-400" : "text-white/40"}`}>
                                                                {comm.role === "owner" ? "Owner" : comm.role === "admin" ? "Admin" : "Member"}
                                                            </span>
                                                            <p className="text-[7px] text-white/40 font-black uppercase tracking-tighter mt-1 whitespace-nowrap">rolle</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : friendFilter === "communities" ? (
                                    <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 text-white/20 text-[10px] font-bold uppercase tracking-widest px-10">
                                        Du bist in keiner Community.
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* Search Field */}
                        <div className="relative mb-6">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                            <input
                                type="text"
                                value={discoverSearch}
                                onChange={(e) => setDiscoverSearch(e.target.value)}
                                placeholder="Nutzer suchen..."
                                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm font-medium focus:outline-none focus:border-[#00F5FF]/50 transition-colors"
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
                                        <div className="bg-[#1e3a24] border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:border-[#00F5FF]/30 transition-all">
                                            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xl font-bold text-white/20">{profile.username?.[0]?.toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase truncate max-w-[120px]">{profile.display_name || profile.username}</p>
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
