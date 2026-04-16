"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Loader2, Crown, Shield, UserMinus, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { USER_ROLES } from "@/lib/roles";
import type { OrganizationMembership, ProfileRow } from "@/lib/types";

interface AdminWithProfile extends OrganizationMembership {
  profile?: ProfileRow;
}

interface AdminListModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
  onInvite: () => void;
}

export function AdminListModal({ organizationId, onClose, onSuccess, onInvite }: AdminListModalProps) {
  const { user, memberships } = useAuth();
  const [admins, setAdmins] = useState<AdminWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if current user is the gründer (owner) of this organization
  const myMembership = memberships.find(
    (m) => m.organization_id === organizationId && m.role === USER_ROLES.GRUENDER
  );
  const isGründer = !!myMembership;

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organization_members")
        .select("*, profile:profiles(*)")
        .eq("organization_id", organizationId)
        .in("role", [USER_ROLES.ADMIN, USER_ROLES.GRUENDER])
        .eq("membership_status", "active")
        .order("role", { ascending: true });

      if (!error && data) {
        setAdmins(data as unknown as AdminWithProfile[]);
      }
      setLoading(false);
    };

    void fetchAdmins();
  }, [organizationId]);

  const handleRemoveAdmin = async (membershipId: string) => {
    setActionLoading(membershipId);
    try {
      // Demote to member or remove entirely - we'll remove the membership
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", membershipId);

      if (error) {
        console.error("Error removing admin:", error);
        return;
      }

      setAdmins((prev) => prev.filter((a) => a.id !== membershipId));
      onSuccess();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemoteToMember = async (membershipId: string) => {
    setActionLoading(membershipId);
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: USER_ROLES.MEMBER })
        .eq("id", membershipId);

      if (error) {
        console.error("Error demoting admin:", error);
        return;
      }

      setAdmins((prev) => prev.filter((a) => a.id !== membershipId));
      onSuccess();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--card)] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[var(--border)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/20 flex items-center justify-center text-[var(--muted-foreground)] transition-colors"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-black italic tracking-tighter mb-6 text-[var(--foreground)]">
          Admin Verwaltung
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {admins.map((admin) => {
              const isCurrentUser = admin.user_id === user?.id;
              const isGründerRole = admin.role === USER_ROLES.GRUENDER;

              return (
                <div
                  key={admin.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shrink-0 overflow-hidden">
                    {admin.profile?.avatar_url ? (
                      <Image
                        src={admin.profile.avatar_url}
                        alt={admin.profile.display_name || admin.profile.username || "Admin"}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Shield size={18} className="text-[#00F5FF]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--foreground)] truncate">
                      {admin.profile?.display_name || admin.profile?.username || "Unbekannt"}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                      @{admin.profile?.username || "unbekannt"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isGründerRole ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/30">
                        <Crown size={12} className="text-[#2FF801]" />
                        <span className="text-[10px] font-bold text-[#2FF801]">Gründer</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/30">
                        <Shield size={12} className="text-[#00F5FF]" />
                        <span className="text-[10px] font-bold text-[#00F5FF]">Admin</span>
                      </div>
                    )}

                    {/* Actions only for gründer, and not on themselves, and not on other gründer */}
                    {isGründer && !isCurrentUser && !isGründerRole && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => void handleDemoteToMember(admin.id)}
                          disabled={actionLoading === admin.id}
                          title="Zu Member degradieren"
                          className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-[#00F5FF]/50 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-all disabled:opacity-50"
                        >
                          {actionLoading === admin.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => void handleRemoveAdmin(admin.id)}
                          disabled={actionLoading === admin.id}
                          title="Admin entfernen"
                          className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-red-500/50 flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-all disabled:opacity-50"
                        >
                          {actionLoading === admin.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <UserMinus size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {admins.length === 0 && (
              <div className="text-center py-8">
                <Shield size={32} className="text-[var(--muted-foreground)] mx-auto mb-2" />
                <p className="text-sm text-[var(--muted-foreground)]">Keine Admins vorhanden</p>
              </div>
            )}
          </div>
        )}

        {/* Actions for gründer */}
        {isGründer && (
          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <button
              onClick={onInvite}
              className="w-full py-3 rounded-xl bg-[#00F5FF] text-black font-bold hover:bg-[#00F5FF]/90 transition-colors flex items-center justify-center gap-2"
            >
              <Shield size={18} />
              Neuen Admin einladen
            </button>
          </div>
        )}

        {/* Info for non-gründer admins */}
        {!isGründer && isGründer === false && (
          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)] text-center">
              Nur der Gründer kann Admins verwalten.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
