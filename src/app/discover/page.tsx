"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { ActivityFeed } from "@/components/social/activity-feed";
import { UserSuggestionItem } from "@/components/social/user-suggestion";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import type { SuggestedUser } from "@/lib/types";

export default function DiscoverPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"following" | "discover">("following");
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [browseUsers, setBrowseUsers] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get users NOT being followed yet
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];

        // Get public profiles not being followed
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio, profile_visibility")
          .eq("profile_visibility", "public")
          .neq("id", user.id)
          .limit(10);

        const unfollowedProfiles = (profiles || []).filter(
          p => !followingIds.includes(p.id)
        );

        setSuggestions(
          unfollowedProfiles.map(p => ({
            id: p.id,
            username: p.username || "",
            display_name: p.display_name || undefined,
            avatar_url: p.avatar_url || undefined,
            bio: p.bio || undefined,
            profile_visibility: p.profile_visibility,
          }))
        );

        // Also fetch browse users for discover tab
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio, profile_visibility")
          .neq("id", user.id)
          .limit(20);

        setBrowseUsers(
          (allProfiles || []).map(p => ({
            id: p.id,
            username: p.username || "",
            display_name: p.display_name || undefined,
            avatar_url: p.avatar_url || undefined,
            bio: p.bio || undefined,
            profile_visibility: p.profile_visibility,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [user]);

  const handleFollowUser = (userId: string) => {
    setSuggestions(prev => prev.filter(u => u.id !== userId));
  };

  const filteredBrowseUsers = browseUsers.filter(profile => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (profile.display_name || "").toLowerCase().includes(q) ||
      (profile.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white backdrop-blur-md border-b border-[#E5E5E5]">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#1A1A1A]">
              Social
            </h1>
            <button className="w-10 h-10 rounded-full bg-[#FAFAFA] flex items-center justify-center border border-[#E5E5E5]">
              <UserPlus size={20} className="text-[#00F5FF]" />
            </button>
          </div>

          {/* Sub-Tabs */}
          <div className="flex gap-6 border-b border-[#E5E5E5] -mb-6">
            <button
              onClick={() => setActiveTab("following")}
              className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "following"
                  ? "text-[#2FF801] border-b-2 border-[#2FF801]"
                  : "text-[#999]"
              }`}
            >
              Deine Freunde
            </button>
            <button
              onClick={() => setActiveTab("discover")}
              className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "discover"
                  ? "text-[#2FF801] border-b-2 border-[#2FF801]"
                  : "text-[#999]"
              }`}
            >
              Entdecken
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#2FF801]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#999]">
              Lade...
            </p>
          </div>
        ) : activeTab === "following" ? (
          <div>
            {/* Suggestions - Horizontal Scroll */}
            {suggestions.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-4">
                  Vorschläge für dich
                </p>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
                  {suggestions.slice(0, 8).map(user => (
                    <UserSuggestionItem
                      key={user.id}
                      user={user}
                      onFollow={() => handleFollowUser(user.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-4">
                Aktivitäten
              </p>
              <ActivityFeed showDiscover={false} />
            </div>
          </div>
        ) : (
          <div>
            {/* Search */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nutzer suchen..."
                className="w-full h-12 pl-11 pr-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] placeholder-[#999] text-sm font-medium focus:outline-none focus:border-[#2FF801] transition-colors"
              />
            </div>

            {/* Browse Users Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredBrowseUsers.map(profile => (
                <Link key={profile.id} href={`/user/${profile.username}`}>
                  <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:border-[#2FF801]/30 transition-colors">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#E5E5E5] bg-[#F5F5F5] flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name || profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-[#999]">
                          {profile.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#1A1A1A] uppercase truncate max-w-[120px]">
                        {profile.display_name || profile.username}
                      </p>
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