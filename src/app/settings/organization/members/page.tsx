"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import {
  ChevronLeft,
  Loader2,
  Shield,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  UserRound,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MemberUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Member {
  id: string;
  role: "owner" | "admin" | "staff" | "member";
  membership_status: "active" | "suspended" | "invited";
  joined_at: string | null;
  user: MemberUser | null;
  invited_by?: string;
}

function formatRoleLabel(role: string) {
  switch (role) {
    case "owner": return "Owner";
    case "admin": return "Admin";
    case "staff": return "Staff";
    case "member": return "Mitglied";
    default: return role;
  }
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "owner" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
    role === "admin" ? "text-red-400 bg-red-400/10 border-red-400/20" :
    role === "staff" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
    "text-white/40 bg-white/5 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${color}`}>
      {role === "owner" && <Crown size={8} />}
      {role === "admin" && <Shield size={8} />}
      {formatRoleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-wider">
      <AlertTriangle size={8} />
      {status}
    </span>
  );
}

export default function MembersPage() {
  const { user, session, activeOrganization, isDemoMode } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const canManage = activeOrganization?.role === "owner" || activeOrganization?.role === "admin";
  const isOwner = activeOrganization?.role === "owner";

  const fetchMembers = useCallback(async () => {
    if (!activeOrganization || !session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/members`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Laden");
      }
      const data = await res.json();
      setMembers((data.members || []) as Member[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrganization, session?.access_token]);

  useEffect(() => {
    if (!activeOrganization) {
      router.push("/profile");
      return;
    }
    void fetchMembers();
  }, [activeOrganization, fetchMembers, router]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!memberId || !session?.access_token || isDemoMode) return;
    setActionLoading(memberId);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}/members`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ member_id: memberId, role: newRole }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Ändern");
      setStatusMessage({ type: "success", msg: "Rolle erfolgreich geändert" });
      await fetchMembers();
    } catch (err: any) {
      setStatusMessage({ type: "error", msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (memberId: string) => {
    if (!session?.access_token || isDemoMode) return;
    setActionLoading(memberId);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}/members`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ member_id: memberId, membership_status: "suspended" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Sperren");
      setStatusMessage({ type: "success", msg: "Mitglied gesperrt" });
      await fetchMembers();
    } catch (err: any) {
      setStatusMessage({ type: "error", msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (memberId: string) => {
    if (!session?.access_token || isDemoMode) return;
    setActionLoading(memberId);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}/members`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ member_id: memberId, membership_status: "active" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Aktivieren");
      setStatusMessage({ type: "success", msg: "Mitglied reaktiviert" });
      await fetchMembers();
    } catch (err: any) {
      setStatusMessage({ type: "error", msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!session?.access_token || isDemoMode) return;
    if (!confirm("Mitglied wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    setActionLoading(memberId);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization!.organization_id}/members?member_id=${memberId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Entfernen");
      setStatusMessage({ type: "success", msg: "Mitglied entfernt" });
      await fetchMembers();
    } catch (err: any) {
      setStatusMessage({ type: "error", msg: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[#355E3B] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            Mitglieder
          </h1>
        </div>
      </header>

      <div className="px-8 space-y-6 mt-4">
        {statusMessage && (
          <div className={`p-3 rounded-2xl flex items-start gap-2 text-sm font-bold border ${
            statusMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span>{statusMessage.msg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-white/40" size={32} />
          </div>
        ) : error ? (
          <Card className="bg-red-500/10 border-red-500/20 p-6 rounded-3xl">
            <p className="text-red-400 font-bold text-center">{error}</p>
            <Button onClick={() => void fetchMembers()} className="mt-4 w-full bg-white/10">
              Erneut versuchen
            </Button>
          </Card>
        ) : members.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-8 rounded-3xl text-center">
            <p className="text-white/40 font-bold">Keine Mitglieder gefunden</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isSelf = member.user?.id === user?.id;
              const isOwnerRole = member.role === "owner";
              const isSuspended = member.membership_status === "suspended";

              return (
                <Card
                  key={member.id}
                  className={`bg-[#1e3a24] border-white/10 p-5 rounded-3xl ${
                    isSuspended ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0">
                        {member.user?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.user.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserRound size={18} className="text-[#00F5FF]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm truncate">
                            {member.user?.display_name || member.user?.username || "Unbekannt"}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded-full">
                              Du
                            </span>
                          )}
                        </div>
                        {member.user?.username && (
                          <p className="text-[10px] text-white/40 font-mono truncate">
                            @{member.user.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <RoleBadge role={member.role} />
                      <StatusBadge status={member.membership_status} />
                    </div>
                  </div>

                  {canManage && !isSelf && !isOwnerRole && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => { if (value && member.id) void handleRoleChange(member.id, value); }}
                        disabled={!!actionLoading}
                      >
                        <SelectTrigger className="h-9 bg-black/20 border-white/10 text-xs font-bold flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a191b] border-white/10">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="member">Mitglied</SelectItem>
                        </SelectContent>
                      </Select>

                      {isSuspended ? (
                        <Button
                          size="sm"
                          onClick={() => void handleActivate(member.id)}
                          disabled={!!actionLoading}
                          className="h-9 bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3"
                        >
                          {actionLoading === member.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            "Aktivieren"
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleSuspend(member.id)}
                          disabled={!!actionLoading}
                          className="h-9 text-orange-400 hover:bg-orange-500/10 font-bold text-xs px-2"
                        >
                          Sperren
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleRemove(member.id)}
                        disabled={!!actionLoading}
                        className="h-9 text-red-400 hover:bg-red-500/10 font-bold text-xs px-2"
                      >
                        {actionLoading === member.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <UserMinus size={14} />
                        )}
                      </Button>
                    </div>
                  )}

                  {isOwnerRole && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[10px] text-yellow-400/60 font-bold uppercase tracking-wider">
                        Owner kann nicht geändert werden
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {!canManage && !loading && members.length > 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-white/30 font-bold uppercase tracking-wider">
              Nur Owner und Admins können Mitglieder verwalten
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
