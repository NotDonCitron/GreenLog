"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { ProfileRow } from "@/lib/types";
import { resolvePublicMediaUrl } from "@/lib/public-media-url";
import Link from "next/link";

interface FollowersListModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "followers" | "following";
    userId: string;
}

export function FollowersListModal({
    isOpen,
    onClose,
    mode,
    userId,
}: FollowersListModalProps) {
    const { user } = useAuth();
    const [users, setUsers] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUsers();
        }
    }, [isOpen, userId, mode]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            if (mode === "followers") {
                // Get users who follow this user
                const { data } = await supabase
                    .from("follows")
                    .select("follower:profiles!follows_follower_id_fkey(*)")
                    .eq("following_id", userId);

                const followers = data?.map((d) => d.follower as unknown as ProfileRow).filter(Boolean) ?? [];
                setUsers(followers);
            } else {
                // Get users this user follows
                const { data } = await supabase
                    .from("follows")
                    .select("following:profiles!follows_following_id_fkey(*)")
                    .eq("follower_id", userId);

                const following = data?.map((d) => d.following as unknown as ProfileRow).filter(Boolean) ?? [];
                setUsers(following);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#101214] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        {mode === "followers" ? "Followers" : "Following"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-[var(--foreground)]/40" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-[var(--foreground)]/60 text-sm">
                                {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
                            </p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {users.map((profile) => (
                                <Link
                                    key={profile.id}
                                    href={`/user/${profile.username}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/10">
                                        {profile.avatar_url ? (
                                            <img
                                                src={resolvePublicMediaUrl(profile.avatar_url) ?? ""}
                                                alt={profile.display_name ?? profile.username ?? ""}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-lg font-bold text-[var(--foreground)]/50">
                                                {profile.username?.[0]?.toUpperCase() || "?"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                                            {profile.display_name || profile.username}
                                        </p>
                                        <p className="text-xs text-[var(--foreground)]/50 truncate">
                                            @{profile.username}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
