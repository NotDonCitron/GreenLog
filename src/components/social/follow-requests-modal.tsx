"use client";

import { useState, useEffect } from "react";
import { Loader2, X, UserCheck, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolvePublicMediaUrl } from "@/lib/public-media-url";

interface FollowRequestUser {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
}

interface FollowRequest {
    id: string;
    status: string;
    created_at: string;
    requester: FollowRequestUser;
}

export function FollowRequestsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const response = await fetch("/api/follow-request/manage", {
                headers: {
                    ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
                }
            });
            const data = await response.json();

            if (data.requests) {
                setRequests(data.requests);
            }
        } catch (err) {
            console.error("Error fetching follow requests:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (requestId: string, requesterId?: string) => {
        setActionLoading(requestId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const response = await fetch("/api/follow-request/manage", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
                },
                body: JSON.stringify({ requestId, action: "approve", requesterId })
            });

            if (response.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
            }
        } catch (err) {
            console.error("Error approving request:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setActionLoading(requestId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const response = await fetch("/api/follow-request/manage", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
                },
                body: JSON.stringify({ requestId, action: "reject" })
            });

            if (response.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
            }
        } catch (err) {
            console.error("Error rejecting request:", err);
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    const getInitials = (name: string | null | undefined, username: string | null | undefined) => {
        if (name) {
            return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
        }
        return username?.[0]?.toUpperCase() || "?";
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-[var(--foreground)]">Follow Requests</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X size={18} className="text-[var(--foreground)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-[var(--foreground)]/40" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-[var(--foreground)]/60 text-sm">No pending follow requests</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {requests.map((request) => (
                                <div key={request.id} className="p-4 flex items-center gap-3">
                                    <Link href={`/user/${request.requester.username}`} onClick={onClose}>
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={resolvePublicMediaUrl(request.requester.avatar_url) || undefined} />
                                            <AvatarFallback>
                                                {getInitials(request.requester.display_name, request.requester.username)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>

                                    <div className="flex-1 min-w-0">
                                        <Link href={`/user/${request.requester.username}`} onClick={onClose}>
                                            <p className="font-semibold text-[var(--foreground)] truncate">
                                                {request.requester.display_name || request.requester.username}
                                            </p>
                                            <p className="text-xs text-[var(--foreground)]/50">
                                                @{request.requester.username}
                                            </p>
                                        </Link>
                                        {request.requester.bio && (
                                            <p className="text-xs text-[var(--foreground)]/60 mt-1 line-clamp-1">
                                                {request.requester.bio}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleApprove(request.id, request.requester.id)}
                                            disabled={actionLoading === request.id}
                                            className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors disabled:opacity-50"
                                            title="Accept"
                                        >
                                            {actionLoading === request.id ? (
                                                <Loader2 size={16} className="animate-spin text-[var(--foreground)]" />
                                            ) : (
                                                <UserCheck size={16} className="text-[var(--foreground)]" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={actionLoading === request.id}
                                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
                                            title="Reject"
                                        >
                                            <UserX size={16} className="text-[var(--foreground)]" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                {requests.length > 0 && (
                    <div className="p-3 border-t border-white/10 text-center">
                        <p className="text-xs text-[var(--foreground)]/40">
                            {requests.length} request{requests.length !== 1 ? "s" : ""} pending
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
