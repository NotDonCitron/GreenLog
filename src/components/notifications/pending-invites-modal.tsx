"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Loader2, Building2, CheckCircle2, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { USER_ROLES } from "@/lib/roles";

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    organization_type: string;
    logo_url: string | null;
  } | null;
  inviter: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PendingInvitesModalProps {
  onClose: () => void;
  onInviteAccepted: () => void;
}

export function PendingInvitesModal({ onClose, onInviteAccepted }: PendingInvitesModalProps) {
  const { refreshMemberships } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingInvites = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/invites/pending", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();
        if (res.ok) {
          setInvites(json.data?.invites || []);
        }
      } catch (err) {
        console.error("Error fetching pending invites:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPendingInvites();
  }, []);

  const handleAccept = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    try {
      // We need to get the invite token to accept it
      // Since we don't store the token, we need a direct accept endpoint
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;

      if (!accessToken) return;

      // Get the token by finding the invite (we need to look it up by id)
      await supabase
        .from("organization_invites")
        .select("id, organization_invites_token!inner(token)")
        .eq("id", invite.id)
        .single();

      // Use the token-based accept endpoint
      const res = await fetch(`/api/invites/${invite.id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invite_id: invite.id }),
      });

      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        await refreshMemberships();
        onInviteAccepted();
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setDecliningId(inviteId);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;

      if (!accessToken) return;

      const orgId = invites.find(i => i.id === inviteId)?.organization?.id;
      if (!orgId) return;

      const res = await fetch(`/api/organizations/${orgId}/invites?id=${inviteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch (err) {
      console.error("Error declining invite:", err);
    } finally {
      setDecliningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--card)] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[var(--border)] max-h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/20 flex items-center justify-center text-[var(--muted-foreground)] transition-colors shrink-0"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-black italic tracking-tighter mb-6 text-[var(--foreground)] flex items-center gap-2">
          <Shield size={20} className="text-[#00F5FF]" />
          Ausstehende Einladungen
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 size={32} className="text-[#2FF801] mx-auto mb-2" />
            <p className="text-sm text-[var(--muted-foreground)]">Keine ausstehenden Einladungen</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto flex-1">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)] space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
                    {invite.organization?.logo_url ? (
                      <Image src={invite.organization.logo_url} alt={invite.organization.name} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={18} className="text-[#2FF801]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--foreground)]">{invite.organization?.name || "Organisation"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {invite.role === USER_ROLES.ADMIN ? "Admin" : 
                       invite.role === USER_ROLES.PRAEVENTIONSBEAUFTRAGTER ? "Präventionsbeauftragter" :
                       invite.role === "staff" ? "Staff" : "Mitglied"}
                    </p>
                    {invite.inviter && (
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                        Eingeladen von @{invite.inviter.username}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/30 shrink-0">
                    <Shield size={10} className="text-[#00F5FF]" />
                    <span className="text-[10px] font-bold text-[#00F5FF]">
                      {invite.role === USER_ROLES.ADMIN ? "Admin" : 
                       invite.role === USER_ROLES.PRAEVENTIONSBEAUFTRAGTER ? "Prev. Officer" :
                       invite.role === "staff" ? "Staff" : "Member"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleAccept(invite)}
                    disabled={processingId === invite.id || decliningId === invite.id}
                    className="flex-1 py-2 rounded-xl bg-[#2FF801] text-black font-bold text-xs hover:bg-[#2FF801]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {processingId === invite.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Annehmen
                  </button>
                  <button
                    onClick={() => void handleDecline(invite.id)}
                    disabled={processingId === invite.id || decliningId === invite.id}
                    className="py-2 px-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] font-bold text-xs hover:border-red-500/50 hover:text-red-500 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {decliningId === invite.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
