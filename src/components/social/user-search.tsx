"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/types";

interface UserSearchProps {
    onUserSelect?: (user: ProfileRow) => void;
    placeholder?: string;
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

export function UserSearch({
    onUserSelect,
    placeholder = "Search users by username...",
    className = "",
}: UserSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const searchUsers = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .ilike("username", `%${searchQuery}%`)
                .eq("profile_visibility", "public")
                .limit(10);

            if (error) throw error;
            setResults(data ?? []);
        } catch (err) {
            console.error("Error searching users:", err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            searchUsers(query);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query, searchUsers]);

    const handleUserClick = (user: ProfileRow) => {
        if (onUserSelect) {
            onUserSelect(user);
        } else {
            router.push(`/user/${user.username}`);
        }
        setQuery("");
        setShowResults(false);
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setShowResults(false);
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="pl-10 pr-10"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {query && !isLoading && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {showResults && results.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto">
                    <div className="p-2">
                        {results.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => handleUserClick(user)}
                                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar_url || undefined} alt={user.display_name ?? user.username ?? ""} />
                                    <AvatarFallback>{getInitials(user.display_name ?? user.username ?? undefined)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {user.display_name ?? user.username}
                                    </p>
                                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">No users found</p>
                </Card>
            )}

            {showResults && (results.length > 0 || query.length >= 2) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowResults(false)}
                />
            )}
        </div>
    );
}
