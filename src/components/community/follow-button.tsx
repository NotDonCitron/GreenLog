"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

interface FollowButtonProps {
  organizationId: string;
  className?: string;
}

export function FollowButton({ organizationId, className = "" }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from("community_followers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      setIsFollowing(!!data);
      setIsLoading(false);
    };

    checkFollowStatus();
  }, [organizationId, user]);

  const handleToggleFollow = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("community_followers")
          .delete()
          .eq("organization_id", organizationId)
          .eq("user_id", user.id);
        setIsFollowing(false);
      } else {
        await supabase
          .from("community_followers")
          .insert({ organization_id: organizationId, user_id: user.id });
        setIsFollowing(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button className={`h-10 px-6 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-[#999]" />
      </button>
    );
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleToggleFollow}
        className={`h-10 px-6 rounded-full bg-white border border-[#E5E5E5] text-[#1A1A1A] font-semibold text-sm hover:bg-[#FAFAFA] transition-colors ${className}`}
      >
        Following
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFollow}
      className={`h-10 px-6 rounded-full bg-[#2FF801] text-[#1A1A1A] font-semibold text-sm hover:bg-[#2FF801]/90 transition-colors ${className}`}
    >
      Follow
    </button>
  );
}
