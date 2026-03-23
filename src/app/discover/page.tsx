"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search, Plus, UserPlus } from "lucide-react";
import { UserSearch } from "@/components/social/user-search";
import { UserCard } from "@/components/social/user-card";
import { SuggestedUsers } from "@/components/social/suggested-users";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/types";

export default function DiscoverPage() {
    const { user } = useAuth();
    const [browseUsers, setBrowseUsers] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<"for-you" | "browse">("for-you");

    useEffect(() => {
        const fetchBrowseUsers = async () => {
            setIsLoading(true);
            try {
                // Browse should show all profiles, including private ones.
                let query = supabase
                    .from("profiles")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(30);

                if (user) {
                    query = query.neq("id", user.id);
                }

                const { data, error } = await query;

                if (error) throw error;
                setBrowseUsers(data ?? []);
            } catch (err) {
                console.error("Error fetching browse users:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBrowseUsers();
    }, [user]);

    const handleSearch = async () => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Search: all profiles by username or display_name
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
                .limit(20);

            if (error) throw error;
            setSearchResults(data ?? []);
        } catch (err) {
            console.error("Error searching users:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
    };

    return (
        <div className="min-h-screen bg-[#355E3B] pb-24">
            {/* Header - Instagram Style */}
            <div className="sticky top-0 z-20 bg-[#355E3B]/95 backdrop-blur-md border-b border-white/10">
                <div className="max-w-lg mx-auto px-4 py-4">
                    {/* Title Row */}
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-black text-white tracking-tight">Discover</h1>
                        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Plus size={20} className="text-white" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="w-full bg-white/10 rounded-xl px-12 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5FF]/50"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto">
                {searchQuery.length >= 2 ? (
                    /* Search Results - Instagram Grid Style */
                    <div className="px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white/80">
                                {isSearching ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                                    </span>
                                ) : (
                                    `${searchResults.length} results`
                                )}
                            </h2>
                        </div>

                        {searchResults.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1">
                                {searchResults.map((profile) => (
                                    <Link key={profile.id} href={`/user/${profile.username}`}>
                                        <div className="aspect-square relative rounded-xl overflow-hidden bg-white/5">
                                            {profile.avatar_url ? (
                                                <img
                                                    src={profile.avatar_url}
                                                    alt={profile.username ?? ""}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/10">
                                                    <span className="text-2xl font-bold text-white/30">
                                                        {profile.username?.[0]?.toUpperCase() || "?"}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                                            <div className="absolute bottom-2 left-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                                                <p className="text-xs font-semibold text-white truncate">
                                                    {profile.display_name || profile.username}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : !isSearching ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search size={24} className="text-white/40" />
                                </div>
                                <p className="text-white/60 text-sm">No users found for "{searchQuery}"</p>
                            </div>
                        ) : null}

                        <button
                            onClick={clearSearch}
                            className="w-full mt-6 py-3 text-sm font-semibold text-white/60 hover:text-white bg-white/5 rounded-xl"
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    /* Main Content - Tab Style like Instagram */
                    <div className="px-4 py-4">
                        {/* Tab Bar */}
                        <div className="flex gap-6 border-b border-white/10 mb-6">
                            <button
                                onClick={() => setActiveTab("for-you")}
                                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "for-you"
                                    ? "text-white border-b-2 border-white"
                                    : "text-white/40"
                                    }`}
                            >
                                For You
                            </button>
                            <button
                                onClick={() => setActiveTab("browse")}
                                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "browse"
                                    ? "text-white border-b-2 border-white"
                                    : "text-white/40"
                                    }`}
                            >
                                Browse All
                            </button>
                        </div>

                        {activeTab === "for-you" ? (
                            /* Suggested Users - Instagram Reels Style */
                            <div>
                                {user ? (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-sm font-semibold text-white/80">Suggested for you</h2>
                                            <button className="text-xs font-semibold text-[#00F5FF]">See All</button>
                                        </div>
                                        <SuggestedUsers limit={8} showViewAll={false} />
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <UserPlus size={24} className="text-white/40" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">Sign in to see suggestions</h3>
                                        <p className="text-white/60 text-sm mb-6">
                                            Get personalized user recommendations based on your ratings and grows.
                                        </p>
                                        <Link href="/login">
                                            <button className="px-8 py-3 bg-[#00F5FF] text-black font-bold rounded-xl text-sm">
                                                Sign In
                                            </button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Browse All - Instagram Grid Style */
                            <div>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                                    </div>
                                ) : browseUsers.length > 0 ? (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-sm font-semibold text-white/80">Recent Members</h2>
                                            <span className="text-xs text-white/40">{browseUsers.length} users</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {browseUsers.map((profile) => (
                                                <Link key={profile.id} href={`/user/${profile.username}`}>
                                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                                                        <div className="aspect-square rounded-xl overflow-hidden bg-white/10 mb-3 flex items-center justify-center">
                                                            {profile.avatar_url ? (
                                                                <img
                                                                    src={profile.avatar_url}
                                                                    alt={profile.username ?? ""}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-3xl font-bold text-white/30">
                                                                    {profile.username?.[0]?.toUpperCase() || "?"}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-semibold text-white truncate">
                                                            {profile.display_name || profile.username}
                                                        </p>
                                                        <p className="text-xs text-white/50 truncate">
                                                            @{profile.username}
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search size={24} className="text-white/40" />
                                        </div>
                                        <p className="text-white/60 text-sm">No public profiles found</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
