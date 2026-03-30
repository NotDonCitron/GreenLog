"use client";

import { useState, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { SuggestedUser, SuggestedCommunity } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

interface UserSuggestionItemProps {
  user: SuggestedUser;
  onFollow?: () => void;
}

export const UserSuggestionItem = memo(function UserSuggestionItem({ user, onFollow }: UserSuggestionItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/follow-request/${user.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { "Authorization": `Bearer ${session.access_token}` })
        }
      });
      if (response.ok) {
        onFollow?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-24 text-center">
      <Link href={`/user/${user.username}`} className="block">
        {/* Avatar with gradient ring */}
        <div className="relative mb-2 mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
          <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.display_name || user.username}
                width={52}
                height={52}
                className="object-cover rounded-full"
              />
            ) : (
              <span className="text-xl font-bold text-[#999]">
                {user.username?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          {/* Follow button overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFollow();
            }}
            disabled={isLoading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2FF801] flex items-center justify-center border-2 border-white"
          >
            {isLoading ? (
              <Loader2 size={12} className="text-black animate-spin" />
            ) : (
              <span className="text-black text-xs font-bold">+</span>
            )}
          </button>
        </div>

        {/* Name */}
        <p className="text-xs font-semibold text-[#1A1A1A] truncate px-1">
          {user.display_name || user.username}
        </p>
        <p className="text-[10px] text-[#999] truncate">
          @{user.username}
        </p>
      </Link>
    </div>
  );
});

interface CommunitySuggestionItemProps {
  community: SuggestedCommunity;
  onJoin?: () => void;
}

export const CommunitySuggestionItem = memo(function CommunitySuggestionItem({ community, onJoin }: CommunitySuggestionItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/community/${community.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { "Authorization": `Bearer ${session.access_token}` })
        }
      });
      if (response.ok) {
        onJoin?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-24 text-center">
      <Link href={`/community/${community.id}`} className="block">
        {/* Avatar with gradient ring */}
        <div className="relative mb-2 mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
          <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center overflow-hidden">
            {community.logo_url ? (
              <Image
                src={community.logo_url}
                alt={community.name}
                width={52}
                height={52}
                className="object-cover rounded-full"
              />
            ) : (
              <span className="text-xl font-bold text-[#999]">
                {community.name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          {/* Join button overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleJoin();
            }}
            disabled={isLoading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2FF801] flex items-center justify-center border-2 border-white"
          >
            {isLoading ? (
              <Loader2 size={12} className="text-black animate-spin" />
            ) : (
              <span className="text-black text-xs font-bold">+</span>
            )}
          </button>
        </div>

        {/* Name */}
        <p className="text-xs font-semibold text-[#1A1A1A] truncate px-1">
          {community.name}
        </p>
        <p className="text-[10px] text-[#999]">
          {community.organization_type === "club" ? "Club" : "Apotheke"}
        </p>
      </Link>
    </div>
  );
});