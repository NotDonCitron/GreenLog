"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  organizationId: string;
  className?: string;
}

export function FollowButton({ organizationId, className }: FollowButtonProps) {
  const { user, session } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user || !session?.access_token) {
      setFollowing(null);
      setChecking(false);
      return;
    }

    const checkFollowStatus = async () => {
      try {
        const res = await fetch(`/api/communities/${organizationId}/follow`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setFollowing(data.following);
        }
      } catch (err) {
        console.error("Error checking follow status:", err);
      } finally {
        setChecking(false);
      }
    };

    checkFollowStatus();
  }, [user, session, organizationId]);

  const handleToggleFollow = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/communities/${organizationId}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setLoading(false);
    }
  };

  // Not logged in - show nothing
  if (!user) {
    return null;
  }

  // Checking status
  if (checking) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={className}
      >
        <Loader2 size={14} className="animate-spin" />
      </Button>
    );
  }

  // Following
  if (following) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleFollow}
        disabled={loading}
        className={`border-[#2FF801]/30 text-[#2FF801] hover:bg-[#2FF801]/10 ${className}`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            <UserCheck size={14} />
            Folge ich
          </>
        )}
      </Button>
    );
  }

  // Not following
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleFollow}
      disabled={loading}
      className={`border-[#00F5FF]/30 text-[#00F5FF] hover:bg-[#00F5FF]/10 ${className}`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <>
          <UserPlus size={14} />
          Folgen
        </>
      )}
    </Button>
  );
}
