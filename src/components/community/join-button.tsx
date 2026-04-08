"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

interface JoinButtonProps {
  organizationId: string;
  className?: string;
}

export function JoinButton({ organizationId, className = "" }: JoinButtonProps) {
  const { user, memberships, refreshMemberships } = useAuth();
  const [status, setStatus] = useState<'none' | 'pending' | 'active' | 'loading'>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkMembershipStatus = async () => {
      // First check auth provider memberships (active only)
      const isActive = memberships.some(m => m.organization_id === organizationId);
      if (isActive) {
        setStatus('active');
        setIsLoading(false);
        return;
      }

      // If not active in auth provider, check DB for pending status
      const { data, error } = await supabase
        .from("organization_members")
        .select("membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      if (data) {
        setStatus(data.membership_status as any);
      } else {
        setStatus('none');
      }
      setIsLoading(false);
    };

    checkMembershipStatus();
  }, [organizationId, user, memberships]);

  const handleJoin = async () => {
    if (!user || status !== 'none') return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch(`/api/organizations/${organizationId}/membership-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
        }
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requires_approval) {
          setStatus('pending');
        } else {
          setStatus('active');
          await refreshMemberships();
        }
      } else {
        console.error("Join request failed:", result.error);
      }
    } catch (err) {
      console.error("Join request failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button disabled className={`h-10 px-6 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-[#999]" />
        <span className="text-sm font-semibold text-[#999]">Wird geprüft...</span>
      </button>
    );
  }

  if (status === 'active') {
    return (
      <div className={`h-10 px-6 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/30 text-[#2FF801] flex items-center gap-2 font-semibold text-sm ${className}`}>
        <CheckCircle2 size={16} />
        <span>Mitglied</span>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className={`h-10 px-6 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center gap-2 font-semibold text-sm ${className}`}>
        <Clock size={16} />
        <span>Anfrage ausstehend</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      className={`h-10 px-6 rounded-full bg-[#00F5FF] text-[#1A1A1A] flex items-center gap-2 font-semibold text-sm hover:bg-[#00F5FF]/90 transition-colors ${className}`}
    >
      <UserPlus size={16} />
      <span>Beitreten</span>
    </button>
  );
}
