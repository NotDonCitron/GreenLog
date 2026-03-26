"use client";

import { ActivityFeed } from "@/components/social/activity-feed";
import { SuggestedUsers } from "@/components/social/suggested-users";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Activity, UserPlus } from "lucide-react";

export default function FeedPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header - Instagram Style */}
            <div className="sticky top-0 z-20 bg-white backdrop-blur-md border-b border-black/10">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <h1 className="text-xl font-black text-black tracking-tight">Activity</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto">
                {!user ? (
                    <div className="px-4 py-16 text-center">
                        <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Activity size={24} className="text-black/40" />
                        </div>
                        <h3 className="text-lg font-bold text-black mb-2">Sign in to see your feed</h3>
                        <p className="text-black/60 text-sm mb-6">
                            Follow other users to see their latest ratings, grows, and achievements.
                        </p>
                        <Link href="/login">
                            <button className="px-8 py-3 bg-[#00F5FF] text-black font-bold rounded-xl text-sm">
                                Sign In
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="px-4 py-4">
                        {/* Follow suggestions */}
                        <SuggestedUsers
                            limit={8}
                            showViewAll={true}
                        />

                        {/* Main activity feed */}
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold text-black/80 mb-4">From people you follow</h2>
                            <ActivityFeed showDiscover={false} />
                        </div>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
