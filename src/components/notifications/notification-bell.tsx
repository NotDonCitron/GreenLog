"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { PendingInvitesModal } from "./pending-invites-modal";

export function NotificationBell() {
  const { session } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInvites, setShowInvites] = useState(false);

  const fetchPendingCount = useCallback(async () => {
    if (!session?.access_token) {
      setPendingCount(0);
      return;
    }

    try {
      const res = await fetch("/api/invites/pending", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setPendingCount(data.invites?.length || 0);
      }
    } catch (err) {
      console.error("Error fetching pending invites count:", err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void fetchPendingCount();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchPendingCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  const handleInviteAccepted = () => {
    void fetchPendingCount();
    setShowInvites(false);
  };

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setShowInvites(true)}
        className="relative w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#00F5FF] hover:border-[#00F5FF]/50 transition-all"
        title="Einladungen"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Bell size={18} />
        )}
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00F5FF] text-black text-[10px] font-black flex items-center justify-center animate-pulse">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {showInvites && (
        <PendingInvitesModal
          onClose={() => setShowInvites(false)}
          onInviteAccepted={handleInviteAccepted}
        />
      )}
    </>
  );
}
