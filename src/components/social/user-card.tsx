"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { SuggestedUser } from "@/lib/types";

interface UserCardProps {
    user: SuggestedUser;
    showFollowButton?: boolean;
    onFollowClick?: () => void;
    className?: string;
}

function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const cleaned = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
    return cleaned || "?";
}

export function UserCard({
    user,
    showFollowButton = true,
    onFollowClick,
    className = "",
}: UserCardProps) {
    return (
        <Card className={`p-4 flex flex-col items-center text-center ${className}`}>
            <Link href={`/user/${user.username}`} className="flex flex-col items-center">
                <Avatar className="h-16 w-16 mb-3">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.display_name ?? user.username} />
                    <AvatarFallback>{getInitials(user.display_name ?? user.username)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-sm truncate max-w-full">
                    {user.display_name ?? user.username}
                </h3>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                {user.bio && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 max-w-full">
                        {user.bio}
                    </p>
                )}
                {user.common_strains_count !== undefined && user.common_strains_count > 0 && (
                    <p className="text-xs text-green-600 mt-2 dark:text-green-400">
                        {user.common_strains_count} common strains
                    </p>
                )}
            </Link>
            {showFollowButton && onFollowClick && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onFollowClick();
                    }}
                    className="mt-3 text-xs text-primary hover:underline"
                >
                    Follow
                </button>
            )}
        </Card>
    );
}

interface UserListItemProps {
    user: SuggestedUser;
    onFollowClick?: () => void;
    showFollowButton?: boolean;
    className?: string;
}

export function UserListItem({
    user,
    onFollowClick,
    showFollowButton = true,
    className = "",
}: UserListItemProps) {
    return (
        <div className={`flex items-center gap-3 p-3 ${className}`}>
            <Link href={`/user/${user.username}`}>
                <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.display_name ?? user.username} />
                    <AvatarFallback>{getInitials(user.display_name ?? user.username)}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                <Link href={`/user/${user.username}`} className="block">
                    <h4 className="font-medium text-sm truncate">
                        {user.display_name ?? user.username}
                    </h4>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                </Link>
                {user.bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {user.bio}
                    </p>
                )}
            </div>
            {showFollowButton && onFollowClick && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onFollowClick();
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-primary text-primary hover:bg-primary/10"
                >
                    Follow
                </button>
            )}
        </div>
    );
}
